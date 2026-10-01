"use client";

import { useI18n } from "@/lib/i18n/provider";
import React from "react";

/**
 * Stat Card
 *
 * Upgraded with Stitch Design System: dark card surface, glowing hover aura,
 * uppercase tracking labels, JetBrains Mono metrics, and trend indicators.
 */

interface StatCardProps {
  label: string;
  value: string | number;
  trend?: string;
  trendUp?: boolean;
  subtext?: string;
  icon?: React.ReactNode;
  sparklineVariant?: "gradient" | "pink" | "orange";
}

export default function StatCard({
  label,
  value,
  trend,
  trendUp = true,
  subtext,
  icon,
  sparklineVariant,
}: StatCardProps) {
  const { t } = useI18n();

  return (
    <div className="group relative p-5 rounded-xl bg-[#18181b] border border-white/8 hover:border-white/16 hover:bg-[#1c1c20] transition-all duration-200 shadow-sm flex flex-col justify-between overflow-hidden">
      {/* Ambient gradient bloom on hover */}
      <div className="absolute -top-10 -right-10 w-24 h-24 bg-[#ff4c83]/5 rounded-full blur-2xl group-hover:bg-[#ff4c83]/12 transition-all pointer-events-none" />

      <div className="flex flex-col gap-2">
        {/* Top Header: Label & Trend / Icon */}
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] uppercase tracking-wider text-[#a1a1aa] font-semibold">
            {label}
          </span>

          {trend ? (
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono font-medium ${
                trendUp
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
              }`}
            >
              <span>{trendUp ? "↑" : "↓"}</span>
              <span>{trend}</span>
            </span>
          ) : icon ? (
            <div className="h-6 w-6 rounded-md bg-white/5 flex items-center justify-center text-[#ffb1c0]">
              {icon}
            </div>
          ) : null}
        </div>

        {/* Metric Value + Sparkline */}
        <div className="flex items-baseline justify-between pt-1">
          <span className="font-mono text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {value}
          </span>

          {sparklineVariant && (
            <div className="w-20 h-7 opacity-85 group-hover:opacity-100 transition-opacity">
              <svg
                className="w-full h-full overflow-visible"
                fill="none"
                viewBox="0 0 80 28"
              >
                <defs>
                  <linearGradient id="cardGrad" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0%" stopColor="#833AB4" />
                    <stop offset="60%" stopColor="#E1306C" />
                    <stop offset="100%" stopColor="#F77737" />
                  </linearGradient>
                </defs>
                <path
                  d="M2 22 C 16 18, 26 14, 38 15 C 50 16, 60 7, 78 4"
                  stroke={
                    sparklineVariant === "gradient"
                      ? "url(#cardGrad)"
                      : sparklineVariant === "pink"
                      ? "#ff4c83"
                      : "#f77737"
                  }
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
                <circle
                  cx="78"
                  cy="4"
                  fill={sparklineVariant === "pink" ? "#ff4c83" : "#f77737"}
                  r="2.5"
                />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Subtext */}
      {subtext && (
        <div className="flex items-center gap-1.5 pt-3 mt-1 border-t border-white/5 text-[#a1a1aa] text-xs">
          <span className="truncate">{subtext}</span>
        </div>
      )}
    </div>
  );
}
