import { RegistrationFile, CheckResult, CategoryScore } from "../types";

interface EndpointCheckResult {
  reachable: boolean;
  status?: number;
  latencyMs?: number;
  error?: string;
  hasWellKnown?: boolean;
}

async function probeEndpoint(url: string): Promise<EndpointCheckResult> {
  // Skip non-http endpoints
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return {
      reachable: false,
      error: "Non-HTTP endpoint — cannot probe (ENS, DID, email, IPFS)",
    };
  }

  // Skip localhost endpoints
  if (
    url.includes("localhost") ||
    url.includes("127.0.0.1") ||
    url.includes("0.0.0.0")
  ) {
    return { reachable: false, error: "Localhost endpoint — not publicly reachable" };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const start = Date.now();

    const res = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
    });

    clearTimeout(timer);
    const latencyMs = Date.now() - start;

    return {
      reachable: res.ok || res.status === 405, // 405 = method not allowed, but server is up
      status: res.status,
      latencyMs,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return {
      reachable: false,
      error: message.includes("abort") ? "Timeout (8s)" : message,
    };
  }
}

async function checkDomainVerification(
  endpoint: string
): Promise<{ verified: boolean; details: string }> {
  try {
    const url = new URL(endpoint);
    const wellKnownUrl = `${url.origin}/.well-known/agent-registration.json`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(wellKnownUrl, {
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timer);

    if (!res.ok)
      return {
        verified: false,
        details: `/.well-known/agent-registration.json returned ${res.status}`,
      };

    const json = await res.json();
    if (json.registrations && Array.isArray(json.registrations)) {
      return {
        verified: true,
        details: "Domain verification file found with registrations",
      };
    }
    return {
      verified: false,
      details: "File found but missing `registrations` array",
    };
  } catch {
    return { verified: false, details: "Not found or unreachable" };
  }
}

export async function checkEndpoints(
  reg: RegistrationFile
): Promise<CategoryScore> {
  const checks: CheckResult[] = [];
  let score = 0;
  const maxScore = 100;

  if (!reg.services || reg.services.length === 0) {
    checks.push({
      id: "ep-none",
      label: "Endpoints",
      severity: "fail",
      message: "No services to check — 0 endpoints declared",
    });
    return { name: "Endpoint Health", icon: "🌐", score: 0, maxScore, checks };
  }

  const pointsPerEndpoint = Math.floor(70 / reg.services.length);
  let domainChecked = false;

  for (const svc of reg.services) {
    const result = await probeEndpoint(svc.endpoint);

    if (result.reachable) {
      checks.push({
        id: `ep-${svc.name}-ok`,
        label: `${svc.name} — ${svc.endpoint}`,
        severity: "pass",
        message: `Reachable (${result.status}, ${result.latencyMs}ms)`,
      });
      score += pointsPerEndpoint;
    } else if (result.error?.includes("Non-HTTP")) {
      checks.push({
        id: `ep-${svc.name}-skip`,
        label: `${svc.name} — ${svc.endpoint}`,
        severity: "info",
        message: result.error,
      });
      // Don't penalize non-HTTP endpoints
      score += Math.floor(pointsPerEndpoint * 0.5);
    } else {
      checks.push({
        id: `ep-${svc.name}-fail`,
        label: `${svc.name} — ${svc.endpoint}`,
        severity: "fail",
        message: `Unreachable: ${result.error || `HTTP ${result.status}`}`,
      });
    }

    // Check https vs http
    if (
      svc.endpoint.startsWith("http://") &&
      !svc.endpoint.includes("localhost")
    ) {
      checks.push({
        id: `ep-${svc.name}-insecure`,
        label: `${svc.name} — security`,
        severity: "warn",
        message: "Uses HTTP instead of HTTPS",
      });
    }

    // Domain verification for first HTTPS endpoint
    if (svc.endpoint.startsWith("https://") && !domainChecked) {
      domainChecked = true;
      const domainResult = await checkDomainVerification(svc.endpoint);
      if (domainResult.verified) {
        checks.push({
          id: "domain-verified",
          label: "Domain verification",
          severity: "pass",
          message: domainResult.details,
        });
        score += 30;
      } else {
        checks.push({
          id: "domain-unverified",
          label: "Domain verification",
          severity: "info",
          message: `Optional: ${domainResult.details}`,
          details:
            "Publish /.well-known/agent-registration.json to prove domain ownership",
        });
      }
    }
  }

  if (!domainChecked) {
    // no HTTPS endpoints at all
    score += 0;
  }

  return {
    name: "Endpoint Health",
    icon: "🌐",
    score: Math.min(score, maxScore),
    maxScore,
    checks,
  };
}
