"use client";

import { TrustScoreResponse } from "@/lib/api";

interface TrustScoreProps {
  data: TrustScoreResponse;
  size?: "sm" | "md" | "lg";
  showSignals?: boolean;
}

// Color based on score
function getScoreColor(score: number): string {
  if (score >= 90) return "text-green-600";
  if (score >= 75) return "text-gold-600";
  if (score >= 60) return "text-yellow-600";
  return "text-red-600";
}

function getScoreBgColor(score: number): string {
  if (score >= 90) return "bg-green-100";
  if (score >= 75) return "bg-gold-100";
  if (score >= 60) return "bg-yellow-100";
  return "bg-red-100";
}

// Signal labels and weights
const SIGNAL_CONFIG = {
  estimate_accuracy: { label: "Estimate Accuracy", weight: 35 },
  verification_rate: { label: "Verification", weight: 25 },
  timeliness: { label: "Timeliness", weight: 20 },
  quality: { label: "Quality", weight: 20 },
};

export function TrustScore({ data, size = "md", showSignals = false }: TrustScoreProps) {
  const sizeClasses = {
    sm: "text-2xl",
    md: "text-4xl",
    lg: "text-6xl",
  };

  if (data.is_building) {
    return (
      <div className="text-center">
        <div className="text-navy-400 text-sm mb-1">Building Trust</div>
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-2xl font-bold text-navy-600">{data.job_count}</span>
          <span className="text-navy-400">/ {data.minimum_jobs} jobs</span>
        </div>
        <div className="mt-2 h-2 bg-navy-100 rounded-full overflow-hidden max-w-[120px] mx-auto">
          <div
            className="h-full bg-gold-500 transition-all duration-300"
            style={{ width: `${(data.job_count / data.minimum_jobs) * 100}%` }}
          />
        </div>
      </div>
    );
  }

  const score = data.score!;
  const colorClass = getScoreColor(score);
  const bgClass = getScoreBgColor(score);

  return (
    <div>
      <div className="text-center">
        <div className="text-navy-400 text-sm mb-1">Trust Score</div>
        <div className={`${sizeClasses[size]} font-bold ${colorClass}`}>
          {score.toFixed(1)}
        </div>
        <div className="text-navy-400 text-xs mt-1">
          Based on {data.job_count} jobs
        </div>
      </div>

      {showSignals && (
        <div className="mt-4 space-y-2">
          {(Object.keys(SIGNAL_CONFIG) as Array<keyof typeof SIGNAL_CONFIG>).map((key) => {
            const config = SIGNAL_CONFIG[key];
            const value = data.signals[key];
            const percentage = value * 100;

            return (
              <div key={key}>
                <div className="flex justify-between text-xs text-navy-600 mb-1">
                  <span>{config.label}</span>
                  <span className="font-medium">{percentage.toFixed(0)}%</span>
                </div>
                <div className="h-1.5 bg-navy-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      percentage >= 80 ? "bg-green-500" :
                      percentage >= 60 ? "bg-gold-500" :
                      percentage >= 40 ? "bg-yellow-500" :
                      "bg-red-500"
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Compact badge version for lists
export function TrustScoreBadge({ data }: { data: TrustScoreResponse }) {
  if (data.is_building) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-navy-100 text-navy-600 rounded-full text-xs">
        <span className="w-1.5 h-1.5 bg-navy-400 rounded-full animate-pulse" />
        {data.job_count}/{data.minimum_jobs}
      </span>
    );
  }

  const score = data.score!;
  const bgClass = getScoreBgColor(score);
  const colorClass = getScoreColor(score);

  return (
    <span className={`inline-flex items-center px-2 py-1 ${bgClass} ${colorClass} rounded-full text-sm font-medium`}>
      {score.toFixed(0)}
    </span>
  );
}
