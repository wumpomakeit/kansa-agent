"use client";

interface ScoreGaugeProps {
  score: number;
  grade: string;
  size?: number;
}

export default function ScoreGauge({
  score,
  grade,
  size = 160,
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
  const glowClass =
    score >= 70 ? "glow-green" : score >= 40 ? "glow-yellow" : "glow-red";

  return (
    <div className="flex flex-col items-center">
      <div className={`relative ${glowClass}`} style={{ width: size, height: size }}>
        <svg
          viewBox="0 0 100 100"
          className="transform -rotate-90"
          style={{ width: size, height: size }}
        >
          {/* Background ring */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="#27272a"
            strokeWidth="8"
          />
          {/* Score ring */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth="8"
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
          <span className={`text-3xl font-bold ${color}`}>{score}</span>
          <span className="text-xs text-kansa-muted">/100</span>
        </div>
      </div>
      <div
        className={`mt-2 text-xl font-bold ${color} px-3 py-0.5 rounded-full`}
      >
        Grade {grade}
      </div>
    </div>
  );
}
