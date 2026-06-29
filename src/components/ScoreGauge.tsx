"use client";

interface ScoreGaugeProps {
  score: number;
  grade: string;
  size?: number;
}

export default function ScoreGauge({
  score,
  grade,
  size = 170,
}: ScoreGaugeProps) {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const color =
    score >= 70
      ? "text-kansa-green"
      : score >= 40
        ? "text-kansa-yellow"
        : "text-kansa-red";
  const strokeColor =
    score >= 70 ? "#22c55e" : score >= 40 ? "#eab308" : "#ef4444";
  const gradientId =
    score >= 70 ? "green-grad" : score >= 40 ? "yellow-grad" : "red-grad";
  const gradientColors =
    score >= 70
      ? ["#22c55e", "#4ade80"]
      : score >= 40
        ? ["#eab308", "#facc15"]
        : ["#ef4444", "#f87171"];
  const glowClass =
    score >= 70 ? "glow-green" : score >= 40 ? "glow-yellow" : "glow-red";

  const gradeColorBg =
    score >= 70
      ? "bg-emerald-500/10 ring-emerald-500/20"
      : score >= 40
        ? "bg-yellow-500/10 ring-yellow-500/20"
        : "bg-red-500/10 ring-red-500/20";

  return (
    <div className="flex flex-col items-center">
      <div
        className={`relative ${glowClass}`}
        style={{ width: size, height: size }}
      >
        <svg
          viewBox="0 0 100 100"
          className="transform -rotate-90"
          style={{ width: size, height: size }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={gradientColors[0]} />
              <stop offset="100%" stopColor={gradientColors[1]} />
            </linearGradient>
          </defs>
          {/* Background ring */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="#1e1e2e"
            strokeWidth="7"
          />
          {/* Score ring */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="score-ring"
            style={
              {
                "--target-offset": offset,
              } as React.CSSProperties
            }
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-4xl font-extrabold tracking-tight ${color}`}>
            {score}
          </span>
          <span className="text-[11px] text-zinc-600 font-medium mt-0.5">
            out of 100
          </span>
        </div>
      </div>
      <div
        className={`mt-3 text-lg font-bold ${color} px-4 py-1 rounded-full ring-1 ${gradeColorBg}`}
      >
        Grade {grade}
      </div>
    </div>
  );
}
