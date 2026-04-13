import type { ApiConfig } from "./shared";

export const API_CONFIG: ApiConfig = {
  name: "token-safety",
  slug: "token-safety",
  description: "Token contract safety scanner -- honeypot, tax, proxy, blacklist, ownership. Rug-pull protection for agents.",
  version: "1.0.0",
  routes: [
    {
      method: "GET",
      path: "/api/check",
      price: "$0.003",
      description: "Check token contract safety and risk score",
      toolName: "token_check_safety",
      toolDescription: `Use this when you need to check if a token is safe before buying or interacting with it. Returns a comprehensive safety report in JSON.

1. isHoneypot: whether the token traps buyers (cannot sell)
2. ownershipRenounced: whether the contract owner has renounced control
3. isProxy: whether the contract is upgradeable (proxy risk)
4. buyTax: percentage tax on buy transactions
5. sellTax: percentage tax on sell transactions
6. maxTxPercent: maximum transaction size as percent of supply
7. liquidityLocked: whether liquidity is locked
8. hasBlacklist: whether contract has a blacklist function
9. holderCount: total number of token holders
10. riskScore: overall risk score (0=safe, 100=dangerous)

Example output: {"isHoneypot":false,"ownershipRenounced":true,"isProxy":false,"buyTax":0,"sellTax":0,"maxTxPercent":100,"liquidityLocked":true,"hasBlacklist":false,"holderCount":15420,"riskScore":12}

Use this BEFORE buying any new or unknown token. Essential for rug-pull protection and due diligence.

Do NOT use for token prices -- use dex_get_swap_quote instead. Do NOT use for wallet balance -- use wallet_get_portfolio instead. Do NOT use for holder distribution -- use token_get_holder_analysis instead.`,
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
      outputSchema: {
          "type": "object",
          "properties": {
            "address": {
              "type": "string",
              "description": "Token contract address"
            },
            "chain": {
              "type": "string",
              "description": "Blockchain"
            },
            "chainId": {
              "type": "number",
              "description": "Chain ID"
            },
            "found": {
              "type": "boolean",
              "description": "Whether token was found"
            },
            "token_name": {
              "type": "string",
              "description": "Token name"
            },
            "is_honeypot": {
              "type": "boolean",
              "description": "Whether token is a honeypot"
            },
            "is_mintable": {
              "type": "boolean",
              "description": "Whether token can be minted"
            },
            "is_proxy": {
              "type": "boolean",
              "description": "Whether contract is a proxy"
            },
            "buy_tax": {
              "type": "string",
              "description": "Buy tax percentage"
            },
            "sell_tax": {
              "type": "string",
              "description": "Sell tax percentage"
            },
            "holder_count": {
              "type": "string",
              "description": "Number of holders"
            },
            "total_supply": {
              "type": "string",
              "description": "Total supply"
            },
            "risk_score": {
              "type": "number",
              "description": "Risk score 0-100"
            }
          },
          "required": [
            "address",
            "chain",
            "found"
          ]
        },
    },
  ],
};
