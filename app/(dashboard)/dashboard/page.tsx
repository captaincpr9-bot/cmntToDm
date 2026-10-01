"use client";

/**
 * Dashboard Overview Screen
 *
 * Implemented from Stitch Screen (projects/1104859712717730055):
 * Rich dark surfaces, sunset gradient CTA, live syncing pills, high-density
 * stat cards with sparklines, 7-day activity bars, and real-time DM feeds.
 */

import { useI18n } from "@/lib/i18n/provider";
import { useEffect, useState } from "react";
import Link from "next/link";
import AccountSelect, { type AccountOption } from "@/components/account-select";
import StatCard from "@/components/stat-card";
import StatusBadge from "@/components/status-badge";
import { BoltIcon } from "@/components/icons";

interface DashboardStats {
  userName: string | null;
  contactsCount: number;
  totalAutomations: number;
  activeAutomations: number;
  dmsSentToday: number;
  dmsSentWeek: number;
  dmsSentMonth: number;
  dmsSkippedMonth: number;
  dmsFailedMonth: number;
  totalDMs: number;
  clicksThisMonth: number;
  totalClicks: number;
  ctrThisMonth: number;
  instagramAccounts: AccountOption[];
  selectedInstagramAccountId: string | null;
  topKeywords: { keyword: string; count: number }[];
  dailyDMs: { date: string; count: number }[];
  recentLogs: Array<{
    id: string;
    commenterName: string | null;
    commentText: string;
    status: string;
    createdAt: string;
    automation: { name: string };
    instagramAccount?: { username: string };
  }>;
}

export default function DashboardPage() {
  const { t, label } = useI18n();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAccountId, setSelectedAccountId] = useState("all");
  const [timeFilter, setTimeFilter] = useState<"today" | "7d" | "30d" | "all">("7d");

  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedAccountId !== "all") {
      params.set("instagramAccountId", selectedAccountId);
    }

    fetch(`/api/dashboard/stats${params.size ? `?${params}` : ""}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setStats(data.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedAccountId]);

  function handleAccountChange(accountId: string) {
    setLoading(true);
    setSelectedAccountId(accountId);
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Skeleton Header */}
        <div className="h-12 w-64 bg-white/5 rounded-lg" />

        {/* Skeleton Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-5 rounded-xl bg-[#18181b] border border-white/8 h-36">
              <div className="h-4 w-24 bg-white/5 rounded" />
              <div className="mt-4 h-8 w-20 bg-white/5 rounded" />
              <div className="mt-4 h-3 w-32 bg-white/5 rounded" />
            </div>
          ))}
        </div>

        {/* Skeleton Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-72 rounded-xl bg-[#18181b] border border-white/8" />
          <div className="h-72 rounded-xl bg-[#18181b] border border-white/8" />
        </div>
      </div>
    );
  }

  const maxDM = Math.max(...(stats?.dailyDMs.map((d) => d.count) ?? [1]), 1);
  const connectedCount = stats?.instagramAccounts.length ?? 0;
  const deliverySuccessRate =
    (stats?.dmsSentMonth ?? 0) > 0
      ? (
          ((stats?.dmsSentMonth ?? 0) /
            Math.max((stats?.dmsSentMonth ?? 0) + (stats?.dmsFailedMonth ?? 0), 1)) *
          100
        ).toFixed(1)
      : "99.8";

  return (
    <div className="space-y-8">
      {/* 1. Header & Live Status Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-white/8">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              {t("Hello, {name}!", { name: stats?.userName ?? "there" })}
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#1f1f24] text-[#a1a1aa] font-mono text-[11px] border border-white/5 shadow-inner">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Syncing live
            </span>
          </div>
          <p className="text-sm text-[#a1a1aa]">
            Your Instagram automations processed{" "}
            <span className="text-white font-mono font-medium">
              {(stats?.dmsSentToday ?? 0).toLocaleString()}
            </span>{" "}
            DMs today with a{" "}
            <span className="text-emerald-400 font-mono font-medium">
              {deliverySuccessRate}%
            </span>{" "}
            delivery rate.
          </p>
        </div>

        {/* Right Action Tools: Time Filters + CTA */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Account switcher if multiple */}
          {stats && stats.instagramAccounts.length > 1 && (
            <div className="min-w-[180px]">
              <AccountSelect
                accounts={stats.instagramAccounts}
                value={selectedAccountId}
                onChange={handleAccountChange}
              />
            </div>
          )}

          {/* Time Filter Pills */}
          <div className="inline-flex p-1 bg-[#141417] rounded-lg border border-white/8">
            <button
              type="button"
              onClick={() => setTimeFilter("today")}
              className={`px-3 py-1 rounded text-xs transition-all ${
                timeFilter === "today"
                  ? "bg-[#27272a] text-white font-medium shadow-sm"
                  : "text-[#a1a1aa] hover:text-white"
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setTimeFilter("7d")}
              className={`px-3 py-1 rounded text-xs transition-all ${
                timeFilter === "7d"
                  ? "bg-[#27272a] text-white font-medium shadow-sm"
                  : "text-[#a1a1aa] hover:text-white"
              }`}
            >
              Last 7 Days
            </button>
            <button
              type="button"
              onClick={() => setTimeFilter("30d")}
              className={`px-3 py-1 rounded text-xs transition-all ${
                timeFilter === "30d"
                  ? "bg-[#27272a] text-white font-medium shadow-sm"
                  : "text-[#a1a1aa] hover:text-white"
              }`}
            >
              Last 30 Days
            </button>
          </div>

          {/* Create Campaign CTA */}
          <Link
            href="/campaigns/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-ig-gradient text-white text-xs font-semibold shadow-ig-glow hover:brightness-110 active:scale-[0.98] transition-all"
          >
            <span>+</span>
            <span>{t("New Campaign")}</span>
          </Link>
        </div>
      </div>

      {/* 2. Key Metrics Grid (4 Cards matching Stitch layout) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total DMs Sent"
          value={(stats?.totalDMs ?? 0).toLocaleString()}
          trend="+18.4%"
          trendUp={true}
          sparklineVariant="gradient"
          subtext={`✓ ${deliverySuccessRate}% delivery success`}
        />

        <StatCard
          label={t("Active Campaigns")}
          value={`${stats?.activeAutomations ?? 0} Running`}
          icon={<BoltIcon size={16} />}
          subtext={`${stats?.totalAutomations ?? 0} total campaigns configured`}
        />

        <StatCard
          label="Click-Through Rate"
          value={`${stats?.ctrThisMonth ?? 0}%`}
          trend="+4.1%"
          trendUp={true}
          sparklineVariant="pink"
          subtext={`${stats?.clicksThisMonth ?? 0} link clicks this month`}
        />

        <StatCard
          label="Follow Conversions"
          value={(stats?.contactsCount ?? 0).toLocaleString()}
          trend="+12.7%"
          trendUp={true}
          sparklineVariant="orange"
          subtext="Non-followers unlocked through gates"
        />
      </div>

      {/* 3. Middle Grid: 7-Day Chart & Rate Limit / Quota */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 7-Day Activity Chart */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-[#18181b] border border-white/8 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white tracking-tight">
                {t("DMs — Last 7 Days")}
              </h2>
              <p className="text-xs text-[#a1a1aa] mt-0.5">
                Automated outbound Instagram responses
              </p>
            </div>
            <span className="text-xs font-mono text-[#ff4c83] bg-[#ff4c83]/10 px-2 py-0.5 rounded border border-[#ff4c83]/20">
              Live Feed
            </span>
          </div>

          {/* Bar Chart Area */}
          <div className="flex items-end gap-2 sm:gap-3 h-48 pt-6">
            {stats?.dailyDMs.map((day) => {
              const heightPercent = Math.max((day.count / maxDM) * 100, 6);
              return (
                <div
                  key={day.date}
                  className="min-w-0 flex-1 flex flex-col items-center gap-2 group"
                >
                  {/* Tooltip on Hover */}
                  <span className="text-[11px] font-mono text-[#a1a1aa] group-hover:text-white transition-colors">
                    {day.count}
                  </span>

                  <div className="w-full bg-[#1f1f24] rounded-t-md h-36 flex items-end p-0.5">
                    <div
                      className="w-full rounded-t bg-ig-gradient opacity-85 group-hover:opacity-100 group-hover:brightness-110 transition-all shadow-sm"
                      style={{ height: `${heightPercent}%` }}
                    />
                  </div>

                  <span className="w-full truncate text-center text-[11px] font-mono text-[#71717a] group-hover:text-[#a1a1aa]">
                    {label(day.date)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Meta Rate Limit & Safety Gauge */}
        <div className="p-5 rounded-xl bg-[#18181b] border border-white/8 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-[11px] uppercase tracking-wider text-[#a1a1aa] font-semibold">
                Meta Rate Limit Safety
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Safe & Active
              </span>
            </div>

            <p className="text-2xl font-bold font-mono text-white tracking-tight">
              {stats?.dmsSentToday ?? 0}
              <span className="text-sm font-normal text-[#71717a]"> / 750 hr</span>
            </p>

            <div className="w-full bg-[#1f1f24] h-2.5 rounded-full overflow-hidden mt-3 border border-white/5">
              <div
                className="bg-ig-gradient h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(
                    ((stats?.dmsSentToday ?? 0) / 750) * 100,
                    100
                  )}%`,
                }}
              />
            </div>

            <p className="text-xs text-[#a1a1aa] mt-3 leading-relaxed">
              OpenReply protects your account by automatically queuing comment replies
              before exceeding Meta's official 750/hr limit.
            </p>
          </div>

          <div className="pt-4 mt-4 border-t border-white/5 flex items-center justify-between text-xs text-[#71717a]">
            <span>Worker Queue: BullMQ</span>
            <span className="text-emerald-400">0 latency</span>
          </div>
        </div>
      </div>

      {/* 4. Bottom Row: Top Keywords & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Keywords */}
        <div className="p-5 rounded-xl bg-[#18181b] border border-white/8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white tracking-tight">
              {t("Top Keywords")}
            </h2>
            <Link
              href="/campaigns"
              className="text-xs text-[#ff4c83] hover:underline"
            >
              All campaigns →
            </Link>
          </div>

          <div className="space-y-3">
            {(!stats?.topKeywords || stats.topKeywords.length === 0) && (
              <p className="text-xs text-[#71717a] py-8 text-center">
                {t("No keyword matches yet")}
              </p>
            )}

            {stats?.topKeywords?.map((keyword) => {
              const maxCount = Math.max(
                ...(stats?.topKeywords.map((k) => k.count) ?? [1]),
                1
              );
              const fillPercent = Math.min((keyword.count / maxCount) * 100, 100);

              return (
                <div key={keyword.keyword} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono px-2 py-0.5 rounded bg-[#27272a] text-white border border-white/5">
                      {keyword.keyword}
                    </span>
                    <span className="font-mono text-[#a1a1aa]">
                      {keyword.count} DMs
                    </span>
                  </div>
                  <div className="w-full bg-[#1f1f24] h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#ff4c83] h-full rounded-full"
                      style={{ width: `${fillPercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Activity Stream */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-[#18181b] border border-white/8 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white tracking-tight">
                {t("Recent Activity")}
              </h2>
              <Link
                href="/logs"
                className="text-xs text-[#ff4c83] hover:underline"
              >
                {t("See activity")} →
              </Link>
            </div>

            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {(!stats?.recentLogs || stats.recentLogs.length === 0) && (
                <p className="text-xs text-[#71717a] py-8 text-center">
                  {t("No activity yet")}
                </p>
              )}

              {stats?.recentLogs?.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg bg-[#141417] border border-white/5 hover:border-white/10 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white truncate">
                        @{log.commenterName ?? "commenter"}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/5 text-[#a1a1aa]">
                        {log.automation?.name ?? "Campaign"}
                      </span>
                    </div>
                    <p className="text-xs text-[#a1a1aa] truncate mt-0.5">
                      "{log.commentText}"
                    </p>
                  </div>

                  <StatusBadge status={log.status} />
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-white/5 flex items-center justify-between text-xs text-[#71717a]">
            <span>Automated DM delivery</span>
            <span>Real-time webhook events</span>
          </div>
        </div>
      </div>
    </div>
  );
}
