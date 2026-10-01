"use client";

import type { StaticMessageKey } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/provider";

/**
 * Status badge with dark pill background, glowing indicator dot, and clean typography.
 */

interface StatusStyle {
  pill: string;
  dot: string;
  label: StaticMessageKey;
}

const statusConfig: Record<string, StatusStyle> = {
  SENT: {
    pill: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    dot: "bg-emerald-400",
    label: "Sent",
  },
  FAILED: {
    pill: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
    dot: "bg-rose-400",
    label: "Failed",
  },
  PENDING: {
    pill: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
    dot: "bg-amber-400",
    label: "Pending",
  },
  SKIPPED_DEDUP: {
    pill: "bg-zinc-800/80 text-zinc-400 border border-white/5",
    dot: "bg-zinc-500",
    label: "Dedup",
  },
  SKIPPED_RATE_LIMIT: {
    pill: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
    dot: "bg-amber-400",
    label: "Rate limited",
  },
  SKIPPED_PLAN_LIMIT: {
    pill: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
    dot: "bg-amber-400",
    label: "Skipped",
  },
  SKIPPED_NO_MATCH: {
    pill: "bg-zinc-800/80 text-zinc-400 border border-white/5",
    dot: "bg-zinc-500",
    label: "No match",
  },
};

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useI18n();
  const config = statusConfig[status] ?? statusConfig.PENDING;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap shadow-sm ${config.pill}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      <span>{t(config.label)}</span>
    </span>
  );
}
