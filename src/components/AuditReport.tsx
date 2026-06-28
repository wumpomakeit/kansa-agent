"use client";

import { AuditResult, CheckResult, Severity } from "@/lib/types";

const severityConfig: Record<
  Severity,
  { icon: string; bg: string; border: string; text: string }
> = {
  pass: {
    icon: "✅",
    bg: "bg-emerald-950/20",
    border: "border-emerald-900/30",
    text: "text-emerald-400",
  },
  warn: {
    icon: "⚠️",
    bg: "bg-yellow-950/20",
    border: "border-yellow-900/30",
    text: "text-yellow-400",
  },
  fail: {
    icon: "❌",
    bg: "bg-red-950/20",
    border: "border-red-900/30",
    text: "text-red-400",
  },
  info: {
    icon: "ℹ️",
    bg: "bg-blue-950/20",
    border: "border-blue-900/30",
    text: "text-blue-400",
  },
};

function CheckItem({ check }: { check: CheckResult }) {
  const config = severityConfig[check.severity];

  return (
    <div className={`p-3 rounded-lg ${config.bg} border ${config.border}`}>
      <div className="flex items-start gap-2">
        <span className="text-sm mt-0.5 shrink-0">{config.icon}</span>
        <div className="min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className={`text-sm font-medium ${config.text}`}>
              {check.label}
            </span>
          </div>
          <p className="text-sm text-zinc-300 mt-0.5">{check.message}</p>
          {check.details && (
            <p className="text-xs text-zinc-500 mt-1">{check.details}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AuditReport({ result }: { result: AuditResult }) {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-white">Detailed Audit Report</h3>

      {result.walletAddress && (
        <div className="text-sm text-kansa-muted">
          Wallet:{" "}
          <a
            href={`https://mantlescan.xyz/address/${result.walletAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-kansa-accent-light hover:underline"
          >
            {result.walletAddress}
          </a>
        </div>
      )}

      {result.categories.map((cat, i) => {
        const pct = Math.round((cat.score / cat.maxScore) * 100);
        const barColor =
          pct >= 70
            ? "bg-kansa-green"
            : pct >= 40
              ? "bg-kansa-yellow"
              : "bg-kansa-red";

        return (
          <div
            key={cat.name}
            className="bg-kansa-card border border-kansa-border rounded-2xl overflow-hidden animate-fade-up"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            {/* Category header */}
            <div className="px-5 py-4 border-b border-kansa-border">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-base font-semibold text-white">
                  {cat.icon} {cat.name}
                </h4>
                <span className="font-mono text-sm font-semibold text-zinc-400">
                  {cat.score}/{cat.maxScore}
                </span>
              </div>
              <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${barColor} transition-all duration-700`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            {/* Checks */}
            <div className="p-4 space-y-2">
              {cat.checks.map((check) => (
                <CheckItem key={check.id} check={check} />
              ))}
            </div>
          </div>
        );
      })}

      {/* Timestamp */}
      <p className="text-xs text-zinc-600 text-center">
        Audit completed at{" "}
        {new Date(result.timestamp).toLocaleString()} UTC
      </p>
    </div>
  );
}
