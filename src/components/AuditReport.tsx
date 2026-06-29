"use client";

import { AuditResult, CheckResult, Severity } from "@/lib/types";

const severityConfig: Record<
  Severity,
  { label: string; icon: string; bg: string; border: string; text: string; badge: string }
> = {
  pass: {
    label: "PASS",
    icon: "✅",
    bg: "bg-emerald-950/20",
    border: "border-emerald-900/30",
    text: "text-emerald-400",
    badge: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/20",
  },
  warn: {
    label: "WARN",
    icon: "⚠️",
    bg: "bg-yellow-950/20",
    border: "border-yellow-900/30",
    text: "text-yellow-400",
    badge: "bg-yellow-500/15 text-yellow-400 ring-yellow-500/20",
  },
  fail: {
    label: "FAIL",
    icon: "❌",
    bg: "bg-red-950/20",
    border: "border-red-900/30",
    text: "text-red-400",
    badge: "bg-red-500/15 text-red-400 ring-red-500/20",
  },
  info: {
    label: "INFO",
    icon: "ℹ️",
    bg: "bg-blue-950/20",
    border: "border-blue-900/30",
    text: "text-blue-400",
    badge: "bg-blue-500/15 text-blue-400 ring-blue-500/20",
  },
};

function CheckItem({ check }: { check: CheckResult }) {
  const config = severityConfig[check.severity];

  return (
    <div
      className={`px-4 py-3 rounded-lg ${config.bg} border ${config.border} transition-colors duration-150`}
    >
      <div className="flex items-start gap-3">
        <span className="text-sm mt-0.5 shrink-0">{config.icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-sm font-semibold text-zinc-200">
              {check.label}
            </span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ring-1 ${config.badge}`}
            >
              {config.label}
            </span>
          </div>
          <p className="text-sm text-zinc-400 mt-1 leading-relaxed">
            {check.message}
          </p>
          {check.details && (
            <p className="text-xs text-zinc-600 mt-1.5 font-mono">
              {check.details}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AuditReport({ result }: { result: AuditResult }) {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-1 h-7 rounded-full bg-gradient-to-b from-indigo-500 to-purple-600" />
        <h3 className="text-xl font-bold tracking-tight text-white">
          Detailed Audit Report
        </h3>
      </div>

      {result.walletAddress && (
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-kansa-card border border-kansa-border text-sm">
          <span className="text-zinc-500">Wallet:</span>
          <a
            href={`https://mantlescan.xyz/address/${result.walletAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-kansa-accent-light hover:underline"
          >
            {result.walletAddress.slice(0, 6)}…{result.walletAddress.slice(-4)}
          </a>
          <span className="text-zinc-700">↗</span>
        </div>
      )}

      {result.categories.map((cat, i) => {
        const pct = Math.round((cat.score / cat.maxScore) * 100);
        const barColor =
          pct >= 70
            ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
            : pct >= 40
              ? "bg-gradient-to-r from-yellow-500 to-yellow-400"
              : "bg-gradient-to-r from-red-500 to-red-400";
        const scoreColor =
          pct >= 70
            ? "text-kansa-green"
            : pct >= 40
              ? "text-kansa-yellow"
              : "text-kansa-red";

        return (
          <div
            key={cat.name}
            className="bg-kansa-card border border-kansa-border rounded-2xl overflow-hidden animate-fade-up"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            {/* Category header */}
            <div className="px-6 py-5 border-b border-kansa-border/60">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-base font-bold text-white tracking-tight">
                  {cat.icon} {cat.name}
                </h4>
                <div className="flex items-baseline gap-1">
                  <span className={`font-mono text-lg font-bold ${scoreColor}`}>
                    {cat.score}
                  </span>
                  <span className="font-mono text-xs text-zinc-600">
                    /{cat.maxScore}
                  </span>
                </div>
              </div>
              <div className="w-full h-2 bg-zinc-800/80 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${barColor} transition-all duration-700 ease-out`}
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
      <p className="text-xs text-zinc-600 text-center pt-2">
        Audit completed at {new Date(result.timestamp).toLocaleString()} UTC
      </p>
    </div>
  );
}
