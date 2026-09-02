import type { Hono } from "hono";


// ATXP: requirePayment only fires inside an ATXP context (set by atxpHono middleware).
// For raw x402 requests, the existing @x402/hono middleware handles the gate.
// If neither protocol is active (ATXP_CONNECTION unset), tryRequirePayment is a no-op.
async function tryRequirePayment(price: number): Promise<void> {
  if (!process.env.ATXP_CONNECTION) return;
  try {
    const { requirePayment } = await import("@atxp/server");
    const BigNumber = (await import("bignumber.js")).default;
    await requirePayment({ price: BigNumber(price) });
  } catch (e: any) {
    if (e?.code === -30402) throw e;
  }
}

// In-memory cache with TTL
interface CacheEntry {
  data: any;
  timestamp: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, CacheEntry>();

// Chain ID mapping
const CHAIN_IDS: Record<string, string> = {
  ethereum: "1",
  eth: "1",
  base: "8453",
};

function getChainId(chain: string): string | null {
  return CHAIN_IDS[chain.toLowerCase()] || null;
}

function calculateRiskScore(token: any): number {
  let score = 0;

  // Honeypot is the worst — instant danger
  if (token.is_honeypot === "1") score += 40;

  // High buy/sell tax
  const buyTax = parseFloat(token.buy_tax || "0");
  const sellTax = parseFloat(token.sell_tax || "0");
  if (sellTax > 0.1) score += 15;
  if (sellTax > 0.3) score += 10;
  if (buyTax > 0.1) score += 10;
  if (buyTax > 0.3) score += 5;

  // Proxy contract (upgradeable = risky)
  if (token.is_proxy === "1") score += 10;

  // Owner can take back ownership
  if (token.can_take_back_ownership === "1") score += 10;

  // Not open source
  if (token.is_open_source === "0") score += 10;

  // Has blacklist function
  if (token.is_blacklisted === "1") score += 8;

  // Owner not renounced
  if (token.owner_address && token.owner_address !== "0x0000000000000000000000000000000000000000" && token.owner_address !== "") {
    score += 5;
  }

  // Anti-whale (can limit transactions)
  if (token.is_anti_whale === "1") score += 3;

  // Cannot sell all
  if (token.cannot_sell_all === "1") score += 15;

  // Mint function
  if (token.is_mintable === "1") score += 8;

  return Math.min(score, 100);
}

function getRiskLevel(score: number): "safe" | "caution" | "danger" {
  if (score <= 20) return "safe";
  if (score <= 50) return "caution";
  return "danger";
}

export function registerRoutes(app: Hono) {
  async function handleCheck(c: any, address: string | undefined, chain: string) {
    await tryRequirePayment(0.003);

    if (!address) {
      return c.json({ error: "Missing required parameter: address (token contract address)" }, 400);
    }

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return c.json({ error: "Invalid address format. Must be a 0x-prefixed 40-hex-char EVM address." }, 400);
    }

    const chainId = getChainId(chain);
    if (!chainId) {
      return c.json({ error: `Unsupported chain: ${chain}. Supported: ethereum, base.` }, 400);
    }

    // Check cache
    const cacheKey = `${chainId}:${address.toLowerCase()}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return c.json(cached.data);
    }

    // Fetch from GoPlus Security API
    let result: any;
    try {
      const url = `https://api.gopluslabs.io/api/v1/token_security/${chainId}?contract_addresses=${address.toLowerCase()}`;
      const resp = await fetch(url);
      if (!resp.ok) {
        throw new Error(`GoPlus API error: ${resp.status} ${resp.statusText}`);
      }
      result = await resp.json();
    } catch (err: any) {
      return c.json({ error: "Failed to fetch token security data", details: err.message }, 502);
    }

    const tokenData = result?.result?.[address.toLowerCase()];
    if (!tokenData) {
      return c.json({
        address: address.toLowerCase(),
        chain,
        chainId,
        found: false,
        message: "Token not found or not yet indexed by GoPlus. It may be too new or on an unsupported chain.",
      }, 404);
    }

    const riskScore = calculateRiskScore(tokenData);
    const riskLevel = getRiskLevel(riskScore);

    const buyTax = parseFloat(tokenData.buy_tax || "0");
    const sellTax = parseFloat(tokenData.sell_tax || "0");

    const response = {
      address: address.toLowerCase(),
      chain,
      chainId,
      found: true,
      token_name: tokenData.token_name || null,
      token_symbol: tokenData.token_symbol || null,
      total_supply: tokenData.total_supply || null,
      creator_address: tokenData.creator_address || null,
      owner_address: tokenData.owner_address || null,
      safety: {
        is_honeypot: tokenData.is_honeypot === "1",
        is_open_source: tokenData.is_open_source === "1",
        is_proxy: tokenData.is_proxy === "1",
        is_mintable: tokenData.is_mintable === "1",
        can_take_back_ownership: tokenData.can_take_back_ownership === "1",
        is_blacklisted: tokenData.is_blacklisted === "1",
        cannot_sell_all: tokenData.cannot_sell_all === "1",
        is_anti_whale: tokenData.is_anti_whale === "1",
      },
      taxes: {
        buy_tax: parseFloat((buyTax * 100).toFixed(2)),
        sell_tax: parseFloat((sellTax * 100).toFixed(2)),
        buy_tax_raw: buyTax,
        sell_tax_raw: sellTax,
      },
      holders: {
        holder_count: parseInt(tokenData.holder_count || "0", 10),
        lp_holder_count: parseInt(tokenData.lp_holder_count || "0", 10),
      },
      risk_score: riskScore,
      risk_level: riskLevel,
      cachedUntil: new Date(Date.now() + CACHE_TTL).toISOString(),
    };

    // Cache result
    cache.set(cacheKey, { data: response, timestamp: Date.now() });

    return c.json(response);
  }

  app.get("/api/check", async (c) =>
    handleCheck(c, c.req.query("address"), c.req.query("chain") || "ethereum"),
  );

  // POST mirror: Bazaar (CDP) only reliably indexes POST payments.
  app.post("/api/check", async (c) => {
    const body = await c.req.json().catch(() => ({}) as any);
    return handleCheck(c, body.address, body.chain || "ethereum");
  });
}
