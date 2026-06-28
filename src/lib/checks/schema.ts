import { RegistrationFile, CheckResult, CategoryScore } from "../types";

const REQUIRED_TYPE = "https://eips.ethereum.org/EIPS/eip-8004#registration-v1";
const VALID_TRUST_MODELS = [
  "reputation",
  "crypto-economic",
  "tee-attestation",
];
const KNOWN_SERVICE_NAMES = [
  "MCP",
  "A2A",
  "OASF",
  "web",
  "ENS",
  "DID",
  "email",
];

export function checkSchema(reg: RegistrationFile): CategoryScore {
  const checks: CheckResult[] = [];
  let score = 0;
  const maxScore = 100;

  // 1. type field (15 pts)
  if (!reg.type) {
    checks.push({
      id: "type-missing",
      label: "type field",
      severity: "fail",
      message: "Missing required `type` field",
      details: `Must be "${REQUIRED_TYPE}"`,
    });
  } else if (reg.type !== REQUIRED_TYPE) {
    checks.push({
      id: "type-wrong",
      label: "type field",
      severity: "warn",
      message: "Non-standard `type` value",
      details: `Expected "${REQUIRED_TYPE}", got "${reg.type}"`,
    });
    score += 5;
  } else {
    checks.push({
      id: "type-ok",
      label: "type field",
      severity: "pass",
      message: "Correct ERC-8004 registration type",
    });
    score += 15;
  }

  // 2. name (10 pts)
  if (!reg.name || reg.name.trim().length === 0) {
    checks.push({
      id: "name-missing",
      label: "name",
      severity: "fail",
      message: "Missing or empty `name`",
    });
  } else if (reg.name.trim().length < 3) {
    checks.push({
      id: "name-short",
      label: "name",
      severity: "warn",
      message: `Name "${reg.name}" is very short`,
      details: "A descriptive name helps discovery",
    });
    score += 5;
  } else {
    checks.push({
      id: "name-ok",
      label: "name",
      severity: "pass",
      message: `Name: "${reg.name}"`,
    });
    score += 10;
  }

  // 3. description (15 pts)
  if (!reg.description || reg.description.trim().length === 0) {
    checks.push({
      id: "desc-missing",
      label: "description",
      severity: "fail",
      message: "Missing or empty `description`",
      details:
        "A good description explains what the agent does, how it works, and pricing",
    });
  } else if (reg.description.trim().length < 30) {
    checks.push({
      id: "desc-short",
      label: "description",
      severity: "warn",
      message: "Description is too vague",
      details: `Only ${reg.description.trim().length} chars — should explain capabilities, methods, and pricing`,
    });
    score += 5;
  } else {
    checks.push({
      id: "desc-ok",
      label: "description",
      severity: "pass",
      message: `Description is ${reg.description.trim().length} chars — good detail`,
    });
    score += 15;
  }

  // 4. image (5 pts)
  if (!reg.image) {
    checks.push({
      id: "image-missing",
      label: "image",
      severity: "warn",
      message: "No `image` provided",
      details: "Recommended for ERC-721 compatibility and marketplace display",
    });
  } else {
    const validUrl =
      reg.image.startsWith("https://") ||
      reg.image.startsWith("ipfs://") ||
      reg.image.startsWith("data:");
    if (!validUrl) {
      checks.push({
        id: "image-invalid",
        label: "image",
        severity: "warn",
        message: "Image URL may be invalid",
        details: `"${reg.image}" — expected https://, ipfs://, or data: URI`,
      });
      score += 2;
    } else {
      checks.push({
        id: "image-ok",
        label: "image",
        severity: "pass",
        message: "Image URL present",
      });
      score += 5;
    }
  }

  // 5. services (20 pts)
  if (!reg.services || !Array.isArray(reg.services) || reg.services.length === 0) {
    checks.push({
      id: "services-missing",
      label: "services",
      severity: "fail",
      message: "No services declared",
      details:
        "Agents should advertise at least one endpoint (MCP, A2A, web, etc.)",
    });
  } else {
    const hasName = reg.services.every((s) => s.name && s.name.length > 0);
    const hasEndpoint = reg.services.every(
      (s) => s.endpoint && s.endpoint.length > 0
    );
    const knownNames = reg.services.filter((s) =>
      KNOWN_SERVICE_NAMES.includes(s.name)
    );
    const hasMcpOrA2a = reg.services.some(
      (s) => s.name === "MCP" || s.name === "A2A"
    );
    const hasVersion = reg.services.some((s) => s.version);

    if (!hasName || !hasEndpoint) {
      checks.push({
        id: "services-incomplete",
        label: "services",
        severity: "warn",
        message: "Some services lack name or endpoint",
      });
      score += 8;
    } else {
      score += 12;
    }

    if (hasMcpOrA2a) {
      checks.push({
        id: "services-protocol",
        label: "services — agent protocols",
        severity: "pass",
        message: "Declares MCP and/or A2A endpoint — agent-to-agent ready",
      });
      score += 5;
    } else {
      checks.push({
        id: "services-no-protocol",
        label: "services — agent protocols",
        severity: "info",
        message: "No MCP or A2A endpoint — not directly callable by other agents",
      });
    }

    if (hasVersion) {
      score += 3;
    }

    checks.push({
      id: "services-count",
      label: "services — count",
      severity: knownNames.length >= 2 ? "pass" : "info",
      message: `${reg.services.length} service(s) declared, ${knownNames.length} use standard names`,
    });
  }

  // 6. registrations (15 pts)
  if (
    !reg.registrations ||
    !Array.isArray(reg.registrations) ||
    reg.registrations.length === 0
  ) {
    checks.push({
      id: "reg-missing",
      label: "registrations",
      severity: "fail",
      message: "No on-chain registrations declared",
      details:
        "Agents SHOULD have at least one registration with agentId and agentRegistry",
    });
  } else {
    const valid = reg.registrations.every(
      (r) =>
        typeof r.agentId === "number" &&
        typeof r.agentRegistry === "string" &&
        r.agentRegistry.includes(":")
    );
    if (valid) {
      checks.push({
        id: "reg-ok",
        label: "registrations",
        severity: "pass",
        message: `${reg.registrations.length} registration(s) with valid format`,
      });
      score += 15;
    } else {
      checks.push({
        id: "reg-partial",
        label: "registrations",
        severity: "warn",
        message: "Registration entries have missing or malformed fields",
        details:
          'Expected: { agentId: number, agentRegistry: "eip155:{chainId}:{address}" }',
      });
      score += 7;
    }
  }

  // 7. active field (5 pts)
  if (typeof reg.active !== "boolean") {
    checks.push({
      id: "active-missing",
      label: "active",
      severity: "info",
      message: "`active` field not set",
    });
  } else {
    checks.push({
      id: "active-ok",
      label: "active",
      severity: "pass",
      message: reg.active ? "Agent is marked active" : "Agent is marked inactive",
    });
    score += 5;
  }

  // 8. supportedTrust (10 pts)
  if (!reg.supportedTrust || reg.supportedTrust.length === 0) {
    checks.push({
      id: "trust-missing",
      label: "supportedTrust",
      severity: "info",
      message: "No trust models declared — agent used for discovery only",
      details:
        "Add supportedTrust to enable reputation, validation, or TEE attestation",
    });
  } else {
    const allValid = reg.supportedTrust.every((t) =>
      VALID_TRUST_MODELS.includes(t)
    );
    checks.push({
      id: "trust-ok",
      label: "supportedTrust",
      severity: "pass",
      message: `Trust models: ${reg.supportedTrust.join(", ")}`,
      details: allValid
        ? "All declared models are standard"
        : "Some models are non-standard (may be custom extensions)",
    });
    score += 10;
  }

  // 9. x402Support (5 pts)
  if (typeof reg.x402Support === "boolean") {
    checks.push({
      id: "x402-ok",
      label: "x402Support",
      severity: "pass",
      message: reg.x402Support
        ? "x402 payments supported"
        : "x402 payments not supported",
    });
    score += 5;
  }

  return {
    name: "Schema Completeness",
    icon: "📋",
    score: Math.min(score, maxScore),
    maxScore,
    checks,
  };
}
