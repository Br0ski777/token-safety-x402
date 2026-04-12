import type { ApiConfig } from "./shared";

export const API_CONFIG: ApiConfig = {
  name: "token-safety",
  slug: "token-safety",
  description: "Check if a token is safe to trade — honeypot, tax, proxy, blacklist, ownership.",
  version: "1.0.0",
  routes: [
    {
      method: "GET",
      path: "/api/check",
      price: "$0.003",
      description: "Check token contract safety and risk score",
      toolName: "token_check_safety",
      toolDescription: "Use this when you need to check if a token is safe before buying or interacting. Returns: honeypot status, ownership renounced, proxy contract risk, max TX limits, buy/sell tax, liquidity locked status, blacklist function, holder count. Supports Base and Ethereum (EVM). Do NOT use for token prices — use dex_get_swap_quote. Do NOT use for wallet balance — use wallet_get_portfolio.",
      inputSchema: {
        type: "object",
        properties: {
          address: { type: "string", description: "Token contract address (e.g. 0x...)" },
          chain: {
            type: "string",
            description: "Chain to check on: 'ethereum' or 'base' (default: ethereum)",
          },
        },
        required: ["address"],
      },
    },
  ],
};
