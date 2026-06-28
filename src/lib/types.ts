// ── ERC-8004 Registration File Types ──

export interface AgentService {
  name: string;
  endpoint: string;
  version?: string;
  skills?: string[];
  domains?: string[];
}

export interface AgentRegistration {
  agentId: number;
  agentRegistry: string; // e.g. "eip155:5003:0x742..."
}

export interface RegistrationFile {
  type?: string;
  name?: string;
  description?: string;
  image?: string;
  services?: AgentService[];
  x402Support?: boolean;
  active?: boolean;
  registrations?: AgentRegistration[];
  supportedTrust?: string[];
  [key: string]: unknown;
}

// ── Audit Result Types ──

export type Severity = "pass" | "warn" | "fail" | "info";

export interface CheckResult {
  id: string;
  label: string;
  severity: Severity;
  message: string;
  details?: string;
}

export interface CategoryScore {
  name: string;
  icon: string;
  score: number;       // 0-100
  maxScore: number;
  checks: CheckResult[];
}

export interface AuditResult {
  overallScore: number; // 0-100
  grade: string;        // A+ / A / B / C / D / F
  timestamp: string;
  registrationFile: RegistrationFile;
  categories: CategoryScore[];
  walletAddress?: string;
  summary: string;
}

// ── Audit Request ──

export interface AuditRequest {
  registrationJson: string;
  walletAddress?: string;
}
