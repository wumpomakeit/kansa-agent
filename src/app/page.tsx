"use client";

import { useState } from "react";
import { SAMPLES } from "@/lib/samples";
import { AuditResult } from "@/lib/types";
import AuditReport from "@/components/AuditReport";
import ScoreGauge from "@/components/ScoreGauge";

export default function Home() {
  const [json, setJson] = useState("");
  const [wallet, setWallet] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AuditResult | null>(null);

  const loadSample = (key: string) => {
    const sample = SAMPLES.find((s) => s.key === key);
    if (sample) {
      setJson(JSON.stringify(sample.data, null, 2));
      setResult(null);
      setError(null);
    }
  };

  const runAudit = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Validate JSON locally first
      JSON.parse(json);
    } catch {
      setError("Invalid JSON syntax — check for missing commas or brackets");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrationJson: json,
          walletAddress: wallet.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Audit failed");
      } else {
        setResult(data);
      }
    } catch (err) {
      setError("Network error — could not reach the audit API");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Header ── */}
      <header className="border-b border-kansa-border/60 backdrop-blur-sm sticky top-0 z-20 bg-kansa-bg/80">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-500/20">
              K
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white">
                Kansa Agent
              </h1>
              <p className="text-[11px] uppercase tracking-widest text-kansa-muted font-medium">
                ERC-8004 Registration Auditor
              </p>
            </div>
          </div>
          <a
            href="https://eips.ethereum.org/EIPS/eip-8004"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-kansa-muted hover:text-kansa-accent-light transition-colors duration-200 hidden sm:block"
          >
            ERC-8004 Spec ↗
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-16 flex-1 w-full">
        {/* ── Hero ── */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/40 border border-indigo-800/30 text-xs font-medium text-indigo-300 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            Auditing on Mantle Network
          </div>
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.15] mb-5">
            Is This Agent&apos;s Registration
            <br />
            <span className="gradient-text">Complete &amp; Honest?</span>
          </h2>
          <p className="text-kansa-muted text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            Paste an ERC-8004 registration file. Kansa audits schema
            completeness, endpoint liveness, and cross-references claims against
            on-chain activity on Mantle.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr_360px] gap-10 items-start">
          {/* ── Left: Input Form ── */}
          <div className="space-y-6">
            {/* Sample buttons */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
                Try a sample
              </label>
              <div className="flex flex-wrap gap-2">
                {SAMPLES.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => loadSample(s.key)}
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-kansa-card border border-kansa-border hover:border-kansa-accent hover:bg-kansa-accent/5 transition-all duration-200"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* JSON Input */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
                Registration File (JSON)
              </label>
              <textarea
                value={json}
                onChange={(e) => setJson(e.target.value)}
                placeholder='{\n  "type": "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",\n  "name": "MyAgent",\n  ...\n}'
                className="w-full h-72 px-4 py-3.5 rounded-xl bg-kansa-card border border-kansa-border font-mono text-sm text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-kansa-accent focus:ring-1 focus:ring-kansa-accent/20 resize-none transition-all duration-200"
                spellCheck={false}
              />
            </div>

            {/* Wallet Input */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
                Agent Wallet Address
                <span className="normal-case tracking-normal text-zinc-600 font-normal ml-1.5">
                  (optional — for on-chain cross-reference)
                </span>
              </label>
              <input
                type="text"
                value={wallet}
                onChange={(e) => setWallet(e.target.value)}
                placeholder="0x..."
                className="w-full px-4 py-3.5 rounded-xl bg-kansa-card border border-kansa-border font-mono text-sm text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-kansa-accent focus:ring-1 focus:ring-kansa-accent/20 transition-all duration-200"
              />
            </div>

            {/* Submit */}
            <button
              onClick={runAudit}
              disabled={loading || !json.trim()}
              className="w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all duration-200 text-[15px]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2.5">
                  <svg
                    className="animate-spin h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeDasharray="60"
                      strokeLinecap="round"
                    />
                  </svg>
                  Auditing…
                </span>
              ) : (
                "🔍  Run Audit"
              )}
            </button>

            {error && (
              <div className="p-4 rounded-xl bg-red-950/30 border border-red-900/50 text-red-400 text-sm font-medium">
                {error}
              </div>
            )}
          </div>

          {/* ── Right: Quick Score (shows when result exists) ── */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            {result ? (
              <div className="animate-fade-up bg-kansa-card border border-kansa-border rounded-2xl p-7 text-center">
                <ScoreGauge score={result.overallScore} grade={result.grade} />
                <p className="text-sm text-kansa-muted mt-5 leading-relaxed">
                  {result.summary}
                </p>
                <div className="mt-6 space-y-3">
                  {result.categories.map((cat) => {
                    const pct = Math.round(
                      (cat.score / cat.maxScore) * 100
                    );
                    const barColor =
                      pct >= 70
                        ? "bg-kansa-green"
                        : pct >= 40
                          ? "bg-kansa-yellow"
                          : "bg-kansa-red";
                    return (
                      <div key={cat.name}>
                        <div className="flex items-center justify-between text-sm mb-1.5">
                          <span className="text-zinc-400 font-medium">
                            {cat.icon} {cat.name}
                          </span>
                          <span
                            className={`font-mono font-bold text-xs ${
                              pct >= 70
                                ? "text-kansa-green"
                                : pct >= 40
                                  ? "text-kansa-yellow"
                                  : "text-kansa-red"
                            }`}
                          >
                            {cat.score}/{cat.maxScore}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${barColor} transition-all duration-700 ease-out`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="bg-kansa-card border border-kansa-border rounded-2xl p-10 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-zinc-800/50 flex items-center justify-center">
                  <span className="text-3xl opacity-40">🔍</span>
                </div>
                <p className="text-zinc-500 text-sm leading-relaxed">
                  Paste a registration file and run the audit to see results
                  here
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Full Results ── */}
        {result && (
          <div className="mt-14 animate-fade-up">
            <AuditReport result={result} />
          </div>
        )}

        {/* ── Mantle Integration Badge ── */}
        <div className="mt-16 flex justify-center">
          <div className="inline-flex items-center gap-3 px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-950/40 to-purple-950/40 border border-indigo-800/30">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">🛡️</span>
              <span className="text-xs font-semibold text-indigo-300">
                Powered by
              </span>
            </div>
            <div className="text-xs text-zinc-400 space-x-2">
              <code className="px-1.5 py-0.5 rounded bg-zinc-800/60 text-indigo-300 font-mono">
                @mantleio/mantle-core
              </code>
              <span>•</span>
              <span>mantle-risk-evaluator Skill</span>
              <span>•</span>
              <span>mantle-address-registry-navigator Skill</span>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <footer className="mt-6 pt-6 border-t border-kansa-border/50 text-center text-sm text-kansa-muted">
          <p>
            Made by{" "}
            <a
              href="https://github.com/wumpomakeit"
              target="_blank"
              rel="noopener noreferrer"
              className="text-kansa-accent-light hover:text-white font-semibold transition-colors duration-200"
            >
              wumpomakeit
            </a>
          </p>
        </footer>
      </main>
    </div>
  );
}
