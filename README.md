# Token Safety & Contract Risk API

[![MCP Server](https://img.shields.io/badge/MCP-server-blue)](https://token-safety.api.klymax402.com/mcp)
[![x402](https://img.shields.io/badge/payments-x402-6E56CF)](https://x402.org)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](#license)

Token contract safety scanner — honeypot, tax, proxy risk, blacklist, ownership. GoPlus-powered. Pay-per-call via [x402](https://x402.org) (USDC on Base L2) — no API key, no signup, no rate-limit wall.

Part of the [klymax402](https://klymax402.com) marketplace — 100 x402 micropayment APIs for AI agents, one wallet, USDC on Base.

## Quickstart — MCP

Add to your MCP client config (Claude Desktop, Cursor, ElizaOS, etc.):

```json
{
  "mcpServers": {
    "token-safety": {
      "url": "https://token-safety.api.klymax402.com/mcp"
    }
  }
}
```

## Quickstart — HTTP (x402)

```bash
curl "https://token-safety.api.klymax402.com/api/check?address=0x...&chain=base"
# → 402 Payment Required, with an x402 payment challenge in the response body
```

Any x402-aware client (`@x402/fetch`, [`x402-agent-tools`](https://www.npmjs.com/package/x402-agent-tools), ATXP) handles the 402 → sign → retry cycle automatically. No manual key exchange.

## Tools

| Tool | Method | Path | Price | Description |
|---|---|---|---|---|
| `token_check_safety` | GET | `/api/check` | $0.003 | Check token contract safety and risk score |

### `token_check_safety`

Use this when you need to check if a token is safe before buying or interacting with it. Returns a comprehensive safety report in JSON.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `address` | string | yes | Token contract address (e.g. `0x...`) |
| `chain` | string | no | Chain to check on: `ethereum` or `base` (default: `ethereum`) |

**Returns**

- `isHoneypot` — whether the token traps buyers (cannot sell)
- `ownershipRenounced` — whether the contract owner has renounced control
- `isProxy` — whether the contract is upgradeable (proxy risk)
- `buyTax` / `sellTax` — percentage tax on buy/sell transactions
- `maxTxPercent` — maximum transaction size as percent of supply
- `liquidityLocked` — whether liquidity is locked
- `hasBlacklist` — whether the contract has a blacklist function
- `holderCount` — total number of token holders
- `riskScore` — overall risk score (0 = safe, 100 = dangerous)

Example response:

```json
{"isHoneypot":false,"ownershipRenounced":true,"isProxy":false,"buyTax":0,"sellTax":0,"maxTxPercent":100,"liquidityLocked":true,"hasBlacklist":false,"holderCount":15420,"riskScore":12}
```

**When to use**: before buying any new or unknown token — essential for rug-pull protection and due diligence.

**Not for**: token prices (use `dex_get_swap_quote`), wallet balance (use `wallet_get_portfolio`), holder distribution (use `token_get_holder_analysis`).

## Example agent prompts

- "Is this token safe to buy? `0x1234...5678` on Base"
- "Check for honeypot risk before I swap into this contract"
- "Run a rug-pull check on this new token launch before I ape in"

## Payment

- Protocol: [x402](https://x402.org) — HTTP-native pay-per-call, no signup, no API key
- Network: Base L2 (`eip155:8453`)
- Asset: USDC
- Facilitator: Coinbase CDP (primary), PayAI (fallback)
- Also reachable via [ATXP](https://atxp.ai) (OAuth-wrapped x402, RFC 9728 protected-resource metadata)

## Part of klymax402

100 x402 micropayment APIs for AI agents — one wallet, USDC on Base, zero signup.

- Catalog: https://klymax402.com/llms.txt
- Full API reference: https://klymax402.com/llms-full.txt
- Live stats: https://klymax402.com/stats

## License

MIT
