import { RegistrationFile, AuditResult, CategoryScore } from "./types";
import { checkSchema } from "./checks/schema";
import { checkEndpoints } from "./checks/endpoints";
import { checkActivity } from "./checks/activity";
import { checkMantleRisk } from "./checks/mantle-risk";

function calculateGrade(score: number): string {
  if (score >= 95) return "A+";
  if (score >= 85) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}

function generateSummary(
  reg: RegistrationFile,
  categories: CategoryScore[],
  overall: number
): string {
  const grade = calculateGrade(overall);
  const name = reg.name || "Unnamed Agent";

  const issues = categories.flatMap((c) =>
    c.checks.filter((ch) => ch.severity === "fail")
  );
  const warnings = categories.flatMap((c) =>
    c.checks.filter((ch) => ch.severity === "warn")
  );

  let summary = `**${name}** scores ${overall}/100 (Grade ${grade}). `;

  if (issues.length === 0 && warnings.length === 0) {
    summary +=
      "This registration file is well-formed and complete. No issues found.";
  } else {
    if (issues.length > 0) {
      summary += `Found ${issues.length} critical issue(s): ${issues.map((i) => i.label).join(", ")}. `;
    }
    if (warnings.length > 0) {
      summary += `${warnings.length} warning(s): ${warnings.map((w) => w.label).join(", ")}.`;
    }
  }

  return summary;
}

export async function runAudit(
  registrationJson: string,
  walletAddress?: string
): Promise<AuditResult> {
  // Parse the registration file
  let reg: RegistrationFile;
  try {
    reg = JSON.parse(registrationJson);
  } catch {
    throw new Error(
      "Invalid JSON — could not parse the registration file. Check for syntax errors."
    );
  }

  // Run all checks in parallel
  // Schema is sync but wrapped in Promise for consistency
  const schemaResult = checkSchema(reg);

  const [endpointResult, activityResult, mantleRiskResult] = await Promise.all([
    checkEndpoints(reg),
    checkActivity(reg, walletAddress),
    checkMantleRisk(reg),
  ]);

  const categories: CategoryScore[] = [
    schemaResult,
    endpointResult,
    activityResult,
    mantleRiskResult,
  ];

  // Weight: Schema 30%, Endpoints 20%, Activity 25%, Mantle Risk 25%
  const weights = [0.3, 0.2, 0.25, 0.25];
  const overallScore = Math.round(
    categories.reduce((sum, cat, i) => {
      const normalized = (cat.score / cat.maxScore) * 100;
      return sum + normalized * weights[i];
    }, 0)
  );

  const grade = calculateGrade(overallScore);
  const summary = generateSummary(reg, categories, overallScore);

  return {
    overallScore,
    grade,
    timestamp: new Date().toISOString(),
    registrationFile: reg,
    categories,
    walletAddress,
    summary,
  };
}
