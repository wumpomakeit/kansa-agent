import { createPublicClient, http, formatEther, getAddress } from "viem";
import { RegistrationFile, CheckResult, CategoryScore } from "../types";

// Mantle mainnet chain config for viem
const mantleMainnet = {
  id: 5000,
  name: "Mantle",
  nativeCurrency: { name: "Mantle", symbol: "MNT", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.mantle.xyz"] } },
  blockExplorers: {
    default: { name: "Mantlescan", url: "https://mantlescan.xyz" },
  },
} as const;

// Known capability keywords -> expected on-chain activity patterns
const CAPABILITY_SIGNALS: Record<
  string,
  {
    keywords: string[];
    activityLabel: string;
    tip: string;
  }
> = {
  swap: {
    keywords: [
      "swap",
      "trade",
      "exchange",
      "dex",
      "router",
      "agni",
      "merchant moe",
      "fluxion",
    ],
    activityLabel: "DEX / swap transactions",
    tip: "Expected: interactions with DEX router contracts",
  },
  lending: {
    keywords: ["lend", "borrow", "aave", "supply", "lending", "collateral"],
    activityLabel: "Lending protocol interactions",
    tip: "Expected: interactions with Aave V3 or similar lending pools",
  },
  bridge: {
    keywords: ["bridge", "cross-chain", "l1", "l2", "transfer"],
    activityLabel: "Bridge contract interactions",
    tip: "Expected: interactions with bridge contracts",
  },
  nft: {
    keywords: ["nft", "mint", "collection", "erc-721", "erc721", "marketplace"],
    activityLabel: "NFT contract interactions",
    tip: "Expected: ERC-721 mints or marketplace interactions",
  },
  analytics: {
    keywords: [
      "analytics",
      "research",
      "monitor",
      "index",
      "data",
      "portfolio",
      "analysis",
    ],
    activityLabel: "Read-only / analytics operations",
    tip: "Analytics agents may have low on-chain activity — this is normal",
  },
};

function extractClaimedCapabilities(
  reg: RegistrationFile
): { capability: string; matched: string[] }[] {
  const desc = (reg.description || "").toLowerCase();
  const name = (reg.name || "").toLowerCase();
  const combined = `${name} ${desc}`;

  const found: { capability: string; matched: string[] }[] = [];

  for (const [cap, info] of Object.entries(CAPABILITY_SIGNALS)) {
    const matches = info.keywords.filter((kw) => combined.includes(kw));
    if (matches.length > 0) {
      found.push({ capability: cap, matched: matches });
    }
  }

  return found;
}

interface WalletActivity {
  balance: string;
  balanceWei: bigint;
  txCount: number;
  isContract: boolean;
  hasActivity: boolean;
}

async function getWalletActivity(address: string): Promise<WalletActivity> {
  const client = createPublicClient({
    chain: mantleMainnet,
    transport: http(),
  });

  const checksummed = getAddress(address);

  const [balance, txCount, code] = await Promise.all([
    client.getBalance({ address: checksummed }),
    client.getTransactionCount({ address: checksummed }),
    client.getCode({ address: checksummed }),
  ]);

  return {
    balance: formatEther(balance),
    balanceWei: balance,
    txCount,
    isContract: !!code && code !== "0x",
    hasActivity: txCount > 0 || balance > 0n,
  };
}

export async function checkActivity(
  reg: RegistrationFile,
  walletAddress?: string
): Promise<CategoryScore> {
  const checks: CheckResult[] = [];
  let score = 0;
  const maxScore = 100;

  // ── 1. Extract claimed capabilities from description (30 pts max) ──
  const capabilities = extractClaimedCapabilities(reg);

  if (capabilities.length === 0) {
    checks.push({
      id: "cap-none",
      label: "Capability claims",
      severity: "info",
      message: "No specific capabilities detected in description",
      details:
        "Use keywords like 'swap', 'lending', 'analytics' in your description for better discovery",
    });
    score += 10; // neutral
  } else {
    checks.push({
      id: "cap-found",
      label: "Capability claims",
      severity: "pass",
      message: `Detected ${capabilities.length} capability area(s): ${capabilities.map((c) => c.capability).join(", ")}`,
      details: capabilities
        .map((c) => `${c.capability}: matched keywords [${c.matched.join(", ")}]`)
        .join("; "),
    });
    score += 20;
  }

  // ── 2. Wallet activity cross-reference (70 pts max) ──
  if (!walletAddress) {
    checks.push({
      id: "wallet-none",
      label: "Wallet analysis",
      severity: "info",
      message:
        "No wallet address provided — skipping on-chain activity cross-reference",
      details:
        "Provide the agent's wallet address to verify claims against on-chain activity",
    });
    // Give partial credit — we can't verify but shouldn't penalize
    score += 35;
  } else {
    try {
      const activity = await getWalletActivity(walletAddress);

      // 2a. Wallet exists and has balance (15 pts)
      if (activity.hasActivity) {
        checks.push({
          id: "wallet-active",
          label: "Wallet status",
          severity: "pass",
          message: `Active wallet — ${activity.balance} MNT, ${activity.txCount} transactions`,
        });
        score += 15;
      } else {
        checks.push({
          id: "wallet-empty",
          label: "Wallet status",
          severity: "warn",
          message: "Wallet has no balance and no transactions on Mantle",
          details:
            "Agent claims to operate on Mantle but wallet shows no activity",
        });
      }

      // 2b. Contract vs EOA (10 pts)
      if (activity.isContract) {
        checks.push({
          id: "wallet-contract",
          label: "Wallet type",
          severity: "pass",
          message: "Wallet is a smart contract (likely a smart account or multisig)",
        });
        score += 10;
      } else {
        checks.push({
          id: "wallet-eoa",
          label: "Wallet type",
          severity: "info",
          message: "Wallet is an EOA (externally owned account)",
        });
        score += 5;
      }

      // 2c. Transaction volume assessment (20 pts)
      if (activity.txCount > 100) {
        checks.push({
          id: "tx-high",
          label: "Transaction volume",
          severity: "pass",
          message: `High activity: ${activity.txCount} transactions — established agent`,
        });
        score += 20;
      } else if (activity.txCount > 10) {
        checks.push({
          id: "tx-medium",
          label: "Transaction volume",
          severity: "pass",
          message: `Moderate activity: ${activity.txCount} transactions`,
        });
        score += 15;
      } else if (activity.txCount > 0) {
        checks.push({
          id: "tx-low",
          label: "Transaction volume",
          severity: "warn",
          message: `Low activity: only ${activity.txCount} transaction(s)`,
          details: "New or rarely-used agent — limited track record",
        });
        score += 5;
      } else {
        checks.push({
          id: "tx-zero",
          label: "Transaction volume",
          severity: "fail",
          message: "Zero transactions — agent has never transacted on Mantle",
        });
      }

      // 2d. Capability-activity consistency (25 pts)
      const isAnalyticsOnly = capabilities.every(
        (c) => c.capability === "analytics"
      );

      if (capabilities.length > 0 && !isAnalyticsOnly) {
        // Agent claims to do transactions (swap, lend, etc.)
        if (activity.txCount > 0) {
          checks.push({
            id: "cap-match",
            label: "Claims vs. activity",
            severity: "pass",
            message: `Agent claims ${capabilities.map((c) => c.capability).join("/")} capabilities and has on-chain transactions`,
            details:
              "On-chain activity is consistent with claimed capabilities",
          });
          score += 25;
        } else {
          checks.push({
            id: "cap-mismatch",
            label: "Claims vs. activity ⚠️",
            severity: "fail",
            message: `Agent claims ${capabilities.map((c) => c.capability).join("/")} capabilities but has NO on-chain transactions`,
            details:
              "This is a significant red flag — the agent claims to perform on-chain actions but has never transacted",
          });
        }
      } else if (isAnalyticsOnly) {
        checks.push({
          id: "cap-analytics",
          label: "Claims vs. activity",
          severity: "pass",
          message:
            "Agent claims analytics/read-only capabilities — low transaction count is expected",
        });
        score += 25;
      } else {
        // No capabilities detected
        score += 10;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      checks.push({
        id: "wallet-error",
        label: "Wallet analysis",
        severity: "warn",
        message: `Could not query Mantle RPC: ${message}`,
        details: "On-chain cross-reference skipped due to RPC error",
      });
      score += 20;
    }
  }

  return {
    name: "Activity Honesty",
    icon: "🔍",
    score: Math.min(score, maxScore),
    maxScore,
    checks,
  };
}
