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
    <div className="min-h-screen">
      {/* ── Header ── */}
      <header className="border-b border-kansa-border">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
              K
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">Kansa Agent</h1>
              <p className="text-xs text-kansa-muted">
                ERC-8004 Registration Auditor
              </p>
            </div>
          </div>
          <a
            href="https://eips.ethereum.org/EIPS/eip-8004"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-kansa-muted hover:text-kansa-accent-light transition-colors"
          >
            ERC-8004 Spec ↗
          </a>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* ── Hero ── */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-3">
            Is This Agent&apos;s Registration{" "}
            <span className="gradient-text">Complete &amp; Honest?</span>
          </h2>
          <p className="text-kansa-muted text-lg max-w-2xl mx-auto">
            Paste an ERC-8004 registration file and optionally an agent wallet
            address. Kansa audits schema completeness, endpoint liveness, and
            cross-references claims against on-chain activity on Mantle.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr_380px] gap-8">
          {/* ── Left: Input Form ── */}
          <div className="space-y-5">
            {/* Sample buttons */}
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Try a sample
              </label>
              <div className="flex flex-wrap gap-2">
                {SAMPLES.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => loadSample(s.key)}
                    className="px-3 py-1.5 text-sm rounded-lg bg-kansa-card border border-kansa-border hover:border-kansa-accent transition-colors"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* JSON Input */}
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Registration File (JSON)
              </label>
              <textarea
                value={json}
                onChange={(e) => setJson(e.target.value)}
                placeholder='{\n  "type": "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",\n  "name": "MyAgent",\n  ...\n}'
                className="w-full h-80 px-4 py-3 rounded-xl bg-kansa-card border border-kansa-border font-mono text-sm text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-kansa-accent resize-none"
                spellCheck={false}
              />
            </div>

            {/* Wallet Input */}
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Agent Wallet Address{" "}
                <span className="text-zinc-600">(optional — for on-chain cross-reference)</span>
              </label>
              <input
                type="text"
                value={wallet}
                onChange={(e) => setWallet(e.target.value)}
                placeholder="0x..."
                className="w-full px-4 py-3 rounded-xl bg-kansa-card border border-kansa-border font-mono text-sm text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-kansa-accent"
              />
            </div>

            {/* Submit */}
            <button
              onClick={runAudit}
              disabled={loading || !json.trim()}
              className="w-full py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
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
                "🔍 Run Audit"
              )}
            </button>

            {error && (
              <div className="p-4 rounded-xl bg-red-950/30 border border-red-900/50 text-red-400 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* ── Right: Quick Score (shows when result exists) ── */}
          <div className="lg:sticky lg:top-6 lg:self-start">
            {result ? (
              <div className="animate-fade-up bg-kansa-card border border-kansa-border rounded-2xl p-6 text-center">
                <ScoreGauge score={result.overallScore} grade={result.grade} />
                <p className="text-sm text-kansa-muted mt-4 leading-relaxed">
                  {result.summary}
                </p>
                <div className="mt-5 space-y-2">
                  {result.categories.map((cat) => (
                    <div
                      key={cat.name}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-zinc-400">
                        {cat.icon} {cat.name}
                      </span>
                      <span
                        className={`font-mono font-semibold ${
                          cat.score / cat.maxScore >= 0.7
                            ? "text-kansa-green"
                            : cat.score / cat.maxScore >= 0.4
                              ? "text-kansa-yellow"
                              : "text-kansa-red"
                        }`}
                      >
                        {cat.score}/{cat.maxScore}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-kansa-card border border-kansa-border rounded-2xl p-8 text-center">
                <div className="text-5xl mb-4 opacity-30">🔍</div>
                <p className="text-zinc-500 text-sm">
                  Paste a registration file and run the audit to see results
                  here
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Full Results ── */}
        {result && (
          <div className="mt-10 animate-fade-up">
            <AuditReport result={result} />
          </div>
        )}

        {/* ── Mantle Integration Badge ── */}
        <div className="mt-12 flex justify-center">
          <div className="inline-flex items-center gap-3 px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-950/40 to-purple-950/40 border border-indigo-800/30">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">🛡️</span>
              <span className="text-xs font-semibold text-indigo-300">Powered by</span>
            </div>
            <div className="text-xs text-zinc-400 space-x-2">
              <code className="px-1.5 py-0.5 rounded bg-zinc-800/60 text-indigo-300 font-mono">@mantleio/mantle-core</code>
              <span>•</span>
              <span>mantle-risk-evaluator Skill</span>
              <span>•</span>
              <span>mantle-address-registry-navigator Skill</span>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <footer className="mt-8 pt-8 border-t border-kansa-border text-center text-sm text-kansa-muted">
          <p>
            Built for the Mantle Hackathon •{" "}
            <a
              href="https://eips.ethereum.org/EIPS/eip-8004"
              target="_blank"
              rel="noopener noreferrer"
              className="text-kansa-accent-light hover:underline"
            >
              ERC-8004
            </a>{" "}
            •{" "}
            <a
              href="https://github.com/mantle-xyz/mantle-skills"
              target="_blank"
              rel="noopener noreferrer"
              className="text-kansa-accent-light hover:underline"
            >
              Mantle Skills
            </a>{" "}
            •{" "}
            <a
              href="https://mantle-xyz.github.io/mantle-agent-scaffold"
              target="_blank"
              rel="noopener noreferrer"
              className="text-kansa-accent-light hover:underline"
            >
              Mantle Agent Scaffold
            </a>
          </p>
        </footer>
      </main>
    </div>
  );
}
