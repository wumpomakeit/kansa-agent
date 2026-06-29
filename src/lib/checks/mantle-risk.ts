/**
 * Mantle Risk Evaluation — powered by @mantleio/mantle-core
 *
 * This check uses the Mantle Verified Contract Registry (from the
 * mantle-agent-scaffold's @mantleio/mantle-core npm package) and applies
 * the methodology from the mantle-risk-evaluator Skill to audit addresses
 * and capability claims in ERC-8004 registration files.
 *
 * Integration:
 *   - Registry data + validateAddress() from @mantleio/mantle-core
 *   - Verdict pattern (pass/warn/block) inspired by mantle-risk-evaluator Skill
 *   - Address registry data sourced from mantle-address-registry-navigator Skill
 */

import {
  findRegistryByAddress,
  listRegistryEntries,
  type RegistryEntry,
} from "@mantleio/mantle-core/lib/registry.js";
import { validateAddress } from "@mantleio/mantle-core/tools/registry.js";
import { RegistrationFile, CheckResult, CategoryScore } from "../types";

// ── Categorized keyword lists for detecting capabilities ──
// Organized by category so future additions are easier
const CAPABILITY_KEYWORDS: Record<string, string[]> = {
  defi_trading: ["swap", "dex", "trade", "trading", "arbitrage", "liquidity", "amm", "router"],
  lending: ["lending", "borrow", "lend", "collateral", "supply", "repay", "aave", "liquidation"],
  yield: ["yield", "farm", "farming", "staking", "stake", "apy", "apr", "vault"],
  bridge: ["bridge", "cross-chain", "relay", "messaging", "interop"],
  security_audit: ["audit", "scan", "vulnerability", "security", "static analysis", "fuzzing", "foundry", "exploit", "pentest"],
  analytics_data: ["analytics", "indexer", "subgraph", "dashboard", "monitoring", "metrics", "tracking", "data layer"],
  governance: ["governance", "dao", "proposal", "vote", "voting", "treasury", "delegate"],
  identity_reputation: ["reputation", "validator", "attestation", "identity", "verification", "credential"],
  rwa: ["rwa", "real-world asset", "tokenization", "tokenize", "custody", "settlement", "compliance", "kyc"],
  nft_gaming: ["nft", "mint", "marketplace", "gamefi", "collectible", "metaverse"],
  payments: ["payment", "x402", "settlement", "invoice", "subscription"],
  research: ["research", "report", "insight", "recommendation", "due diligence"],
};

// ── Capability → Registry category mapping ──
// Maps detected capability categories to expected Mantle registry categories/labels.
// Categories without a mapping (security_audit, analytics_data, governance,
// identity_reputation, payments, research) are skipped during registry
// cross-referencing — they're read-only or off-chain by nature.
const CATEGORY_TO_REGISTRY: Record<string, { categories: string[]; labels: string[] }> = {
  defi_trading: {
    categories: ["defi"],
    labels: ["Router", "Swap", "DEX"],
  },
  lending: {
    categories: ["defi"],
    labels: ["Aave", "Pool", "Lending"],
  },
  yield: {
    categories: ["defi"],
    labels: ["Vault", "Farm", "Staking"],
  },
  bridge: {
    categories: ["bridge"],
    labels: ["Bridge"],
  },
  nft_gaming: {
    categories: ["nft"],
    labels: ["NFT", "Marketplace", "Collection"],
  },
  rwa: {
    categories: ["token"],
    labels: ["Token", "Wrapped"],
  },
};

/**
 * Extract the contract address from an ERC-8004 agentRegistry string.
 * Format: "eip155:{chainId}:{address}"
 */
function parseRegistryAddress(agentRegistry: string): {
  chainId: string;
  address: string;
} | null {
  const parts = agentRegistry.split(":");
  if (parts.length !== 3 || parts[0] !== "eip155") return null;
  const address = parts[2];
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) return null;
  return { chainId: parts[1], address };
}

/**
 * Extract all 0x addresses from a text string (description, etc.)
 */
function extractAddressesFromText(text: string): string[] {
  const matches = text.match(/0x[a-fA-F0-9]{40}/g) || [];
  return [...new Set(matches)]; // dedupe
}

/**
 * Detect claimed capabilities from agent name + description
 * using the categorized keyword list. Returns all matching categories.
 */
function detectCapabilities(reg: RegistrationFile): string[] {
  const text = `${reg.name || ""} ${reg.description || ""}`.toLowerCase();
  const found: string[] = [];
  for (const [category, keywords] of Object.entries(CAPABILITY_KEYWORDS)) {
    if (keywords.some((kw) => text.includes(kw))) {
      found.push(category);
    }
  }
  return found;
}

export async function checkMantleRisk(
  reg: RegistrationFile
): Promise<CategoryScore> {
  const checks: CheckResult[] = [];
  let score = 0;
  const maxScore = 100;

  // Get all verified Mantle contracts for reference
  const registryEntries = listRegistryEntries("mainnet");

  // ── 1. Registry Address Validation (35 pts) ──
  // Check if registration addresses are known to the Mantle registry
  const regAddresses: { source: string; chainId: string; address: string }[] = [];

  if (reg.registrations && reg.registrations.length > 0) {
    for (const r of reg.registrations) {
      const parsed = parseRegistryAddress(r.agentRegistry);
      if (parsed) {
        regAddresses.push({ source: `registration #${r.agentId}`, ...parsed });
      }
    }
  }

  if (regAddresses.length === 0) {
    checks.push({
      id: "mrisk-no-reg-addr",
      label: "Registration addresses",
      severity: "info",
      message: "No parseable on-chain registration addresses found",
      details: "Cannot cross-reference against Mantle Verified Contract Registry",
    });
    score += 10; // neutral — don't penalize, but can't verify
  } else {
    let validCount = 0;
    let mantleCount = 0;

    for (const addr of regAddresses) {
      // Use mantle-core's validateAddress
      const validation = await validateAddress({
        address: addr.address,
        network: "mainnet",
        check_code: false, // format + registry check only (no RPC needed)
      });

      if (!validation.valid_format) {
        checks.push({
          id: `mrisk-addr-invalid-${addr.address.slice(0, 10)}`,
          label: `${addr.source} — address format`,
          severity: "fail",
          message: `Invalid address format: ${addr.address}`,
          details: "Address failed EIP-55 checksum validation via mantle_validateAddress",
        });
        continue;
      }

      if (validation.is_zero_address) {
        checks.push({
          id: `mrisk-addr-zero-${addr.address.slice(0, 10)}`,
          label: `${addr.source} — zero address`,
          severity: "fail",
          message: "Registration points to the zero address",
          details: "Zero address should never be used as an agent registry — likely a placeholder",
        });
        continue;
      }

      validCount++;

      // Is this address in Mantle's verified registry?
      if (validation.registry_match) {
        checks.push({
          id: `mrisk-addr-known-${addr.address.slice(0, 10)}`,
          label: `${addr.source} — registry match`,
          severity: "pass",
          message: `Address recognized: "${validation.registry_match}" in Mantle Verified Registry`,
          details: `Validated via @mantleio/mantle-core mantle_validateAddress`,
        });
        mantleCount++;
      } else {
        // Not in registry — this is expected for agent-specific contracts
        // (most agent registry contracts won't be in Mantle's curated list)
        if (addr.chainId === "5000") {
          checks.push({
            id: `mrisk-addr-unverified-${addr.address.slice(0, 10)}`,
            label: `${addr.source} — registry lookup`,
            severity: "info",
            message: `Valid Mantle mainnet address, not in curated registry (${registryEntries.length} verified contracts)`,
            details: `This is normal for agent-specific contracts. Address: ${addr.address}`,
          });
        } else if (addr.chainId === "5003") {
          checks.push({
            id: `mrisk-addr-testnet-${addr.address.slice(0, 10)}`,
            label: `${addr.source} — testnet`,
            severity: "info",
            message: "Registration is on Mantle Sepolia testnet",
            details: `Address: ${addr.address}`,
          });
        } else {
          checks.push({
            id: `mrisk-addr-otherchain-${addr.address.slice(0, 10)}`,
            label: `${addr.source} — non-Mantle chain`,
            severity: "info",
            message: `Registration on chain ${addr.chainId} (not Mantle mainnet 5000)`,
            details: "Mantle registry cross-reference not applicable for this chain",
          });
        }
      }
    }

    // Score for address validation
    if (validCount === regAddresses.length) {
      score += 20; // all addresses have valid format
    } else {
      score += Math.round((validCount / regAddresses.length) * 15);
    }
    if (mantleCount > 0) {
      score += 15; // bonus for recognized addresses
    }
  }

  // ── 2. Description Address Cross-Reference (25 pts) ──
  // Check if any contract addresses mentioned in the description are real
  const descAddresses = extractAddressesFromText(reg.description || "");

  if (descAddresses.length === 0) {
    checks.push({
      id: "mrisk-desc-no-addr",
      label: "Description addresses",
      severity: "info",
      message: "No contract addresses found in description",
      details: "Agents that reference specific contracts can be cross-checked against the registry",
    });
    score += 12; // neutral
  } else {
    let matchCount = 0;
    let mismatchCount = 0;

    for (const addr of descAddresses) {
      const match = findRegistryByAddress("mainnet", addr);
      if (match) {
        checks.push({
          id: `mrisk-desc-match-${addr.slice(0, 10)}`,
          label: `Description address — ${addr.slice(0, 10)}…`,
          severity: "pass",
          message: `Verified: "${match.label}" (${match.category}) — ${match.status}`,
          details: `Matched in Mantle Verified Registry via findRegistryByAddress()`,
        });
        matchCount++;
      } else {
        checks.push({
          id: `mrisk-desc-unknown-${addr.slice(0, 10)}`,
          label: `Description address — ${addr.slice(0, 10)}…`,
          severity: "warn",
          message: `Address not found in Mantle Verified Registry`,
          details: `${addr} — may be a custom contract, phishing target, or outdated address`,
        });
        mismatchCount++;
      }
    }

    if (matchCount > 0 && mismatchCount === 0) {
      score += 25;
    } else if (matchCount > 0) {
      score += 15;
    } else {
      score += 5;
    }
  }

  // ── 3. Capability-Address Consistency (25 pts) ──
  // Does the agent claim capabilities that match the addresses it references?
  // This implements the risk-evaluator Skill's cross-reference methodology.
  const capabilities = detectCapabilities(reg);

  if (capabilities.length === 0) {
    checks.push({
      id: "mrisk-cap-none",
      label: "Capability verification",
      severity: "info",
      message: "No specific capabilities detected in description",
      details: "Add keywords like 'swap', 'lending', 'bridge', 'analytics', 'governance' for deeper risk analysis",
    });
    score += 12;
  } else {
    // Collect all addresses (from registrations + description)
    const allAddresses = [
      ...regAddresses.map((r) => r.address),
      ...descAddresses,
    ];

    // Look up each address in the registry
    const matchedEntries: RegistryEntry[] = [];
    for (const addr of allAddresses) {
      const entry = findRegistryByAddress("mainnet", addr);
      if (entry) matchedEntries.push(entry);
    }

    if (matchedEntries.length === 0) {
      // No addresses match the registry — can't verify capability claims
      checks.push({
        id: "mrisk-cap-unverifiable",
        label: "Capability cross-reference",
        severity: "info",
        message: `Claims ${capabilities.join(", ")} capabilities but no referenced addresses are in the Mantle registry`,
        details: "Cannot verify if claimed capabilities match actual contract interactions",
      });
      score += 10;
    } else {
      // Check if any matched registry entries align with claimed capabilities
      let consistent = true;
      const consistencyDetails: string[] = [];

      for (const cap of capabilities) {
        const expected = CATEGORY_TO_REGISTRY[cap];
        if (!expected) continue;

        const matching = matchedEntries.filter(
          (e) =>
            expected.categories.includes(e.category) ||
            expected.labels.some((l) =>
              e.label.toLowerCase().includes(l.toLowerCase())
            )
        );

        if (matching.length > 0) {
          consistencyDetails.push(
            `✓ "${cap}" claim supported by: ${matching.map((m) => m.label).join(", ")}`
          );
        } else {
          consistent = false;
          consistencyDetails.push(
            `✗ "${cap}" claim — no matching ${expected.categories.join("/")} contracts found in referenced addresses`
          );
        }
      }

      if (consistent) {
        checks.push({
          id: "mrisk-cap-consistent",
          label: "Capability ↔ registry consistency",
          severity: "pass",
          message: "Claimed capabilities are consistent with referenced Mantle contracts",
          details: consistencyDetails.join("; "),
        });
        score += 25;
      } else {
        checks.push({
          id: "mrisk-cap-inconsistent",
          label: "Capability ↔ registry consistency",
          severity: "warn",
          message: "Some capability claims don't match referenced contract types",
          details: consistencyDetails.join("; "),
        });
        score += 10;
      }
    }
  }

  // ── 4. Registry Coverage Summary (15 pts) ──
  // Informational: how well-integrated is this agent with known Mantle infra?
  const allRefAddresses = [
    ...regAddresses.map((r) => r.address),
    ...descAddresses,
  ];
  const uniqueAddresses = [...new Set(allRefAddresses.map((a) => a.toLowerCase()))];
  const registryHits = uniqueAddresses.filter((addr) => {
    try {
      return findRegistryByAddress("mainnet", addr) !== null;
    } catch {
      return false;
    }
  });

  const coverageRatio = uniqueAddresses.length > 0
    ? registryHits.length / uniqueAddresses.length
    : 0;

  // Determine risk verdict using risk-evaluator Skill methodology
  let verdict: "pass" | "warn" | "block";
  let verdictLabel: string;

  if (uniqueAddresses.length === 0) {
    verdict = "info" as any; // no data
    verdictLabel = "Insufficient data for risk verdict";
    score += 8;
  } else if (coverageRatio >= 0.5) {
    verdict = "pass";
    verdictLabel = `PASS — ${registryHits.length}/${uniqueAddresses.length} addresses verified against Mantle registry`;
    score += 15;
  } else if (coverageRatio > 0) {
    verdict = "warn";
    verdictLabel = `WARN — Only ${registryHits.length}/${uniqueAddresses.length} addresses found in Mantle registry`;
    score += 8;
  } else {
    verdict = "warn";
    verdictLabel = `WARN — No referenced addresses found in Mantle Verified Registry (${registryEntries.length} contracts)`;
    score += 5;
  }

  checks.push({
    id: "mrisk-verdict",
    label: "Risk verdict",
    severity: verdict === "pass" ? "pass" : verdict === "warn" ? "warn" : "info",
    message: verdictLabel,
    details: `Methodology: mantle-risk-evaluator Skill (address safety check) • Registry: @mantleio/mantle-core v0.1.19 (${registryEntries.length} verified Mantle contracts)`,
  });

  return {
    name: "Mantle Risk Evaluation",
    icon: "🛡️",
    score: Math.min(score, maxScore),
    maxScore,
    checks,
  };
}
