import { RegistrationFile } from "./types";

export const SAMPLE_GOOD: RegistrationFile = {
  type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
  name: "MantleSwapBot",
  description:
    "An automated DeFi agent that executes token swaps on Mantle L2 using Agni and Merchant Moe DEXes. Supports MNT, USDC, USDT, WETH, and mETH pairs. Provides real-time quotes, slippage protection, and multi-hop routing.",
  image: "https://example.com/mantleswapbot-avatar.png",
  services: [
    {
      name: "MCP",
      endpoint: "https://mantleswapbot.example.com/mcp",
      version: "2025-06-18",
    },
    {
      name: "A2A",
      endpoint: "https://mantleswapbot.example.com/.well-known/agent-card.json",
      version: "0.3.0",
    },
    {
      name: "web",
      endpoint: "https://mantleswapbot.example.com/",
    },
  ],
  x402Support: true,
  active: true,
  registrations: [
    {
      agentId: 1,
      agentRegistry: "eip155:5000:0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18",
    },
  ],
  supportedTrust: ["reputation"],
};

export const SAMPLE_MEDIOCRE: RegistrationFile = {
  type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
  name: "agent007",
  description: "An agent that does stuff on Mantle",
  services: [
    {
      name: "web",
      endpoint: "http://localhost:3000",
    },
  ],
  active: true,
  registrations: [
    {
      agentId: 42,
      agentRegistry: "eip155:5000:0x1234567890abcdef1234567890abcdef12345678",
    },
  ],
};

export const SAMPLE_BAD: RegistrationFile = {
  name: "x",
  description: "",
  services: [],
};

export const SAMPLES: { label: string; key: string; data: RegistrationFile }[] =
  [
    { label: "✅ Well-formed agent", key: "good", data: SAMPLE_GOOD },
    { label: "⚠️ Incomplete agent", key: "mediocre", data: SAMPLE_MEDIOCRE },
    { label: "❌ Bare-minimum agent", key: "bad", data: SAMPLE_BAD },
  ];
