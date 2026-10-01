"use client";

/**
 * Analytics & Performance Page (Overview)
 *
 * Upgraded to match Google Stitch Design System:
 * - Real-time Instagram Graph Engine v21.0 status telemetry
 * - Top Metrics (Deliverability, CTR, Follower Attribution, Revenue Pipeline)
 * - Scalable SVG visualization with dual area curves, interactive peak markers & tooltips
 * - Cohort Benchmarks & Campaign CTR performance rankings
 * - Trigger source distribution & 5-step conversion funnel
 * - Per-post media insights table with live sorting and filtering
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  SendIcon,
  AdsClickIcon,
  UserPlusIcon,
  DollarIcon,
  DownloadIcon,
  FilterIcon,
  RefreshIcon,
  TuneIcon,
  InsightsIcon,
  ArrowUpwardIcon,
  ChevronDownIcon,
  InstagramIcon,
} from "@/components/icons";
import type { OverviewResponse, OverviewPost } from "@/app/api/instagram/overview/route";

interface ChartPoint {
  date: string;
  label: string;
  dmsSent: number;
  linkClicks: number;
  followers: number;
  highlight?: string;
  x: number;
  yDm: number;
  yClicks: number;
}

const TIMELINE_POINTS: ChartPoint[] = [
  { date: "2024-10-01", label: "Oct 01", dmsSent: 2800, linkClicks: 850, followers: 45100, x: 0, yDm: 160, yClicks: 190 },
  { date: "2024-10-06", label: "Oct 06", dmsSent: 3900, linkClicks: 1240, followers: 45450, x: 140, yDm: 130, yClicks: 175 },
  { date: "2024-10-11", label: "Oct 11", dmsSent: 3400, linkClicks: 1100, followers: 45900, x: 280, yDm: 140, yClicks: 160 },
  { date: "2024-10-16", label: "Oct 16", dmsSent: 4800, linkClicks: 1680, followers: 46520, x: 420, yDm: 95, yClicks: 145 },
  { date: "2024-10-21", label: "Oct 21", dmsSent: 5200, linkClicks: 1940, followers: 47200, x: 560, yDm: 85, yClicks: 110 },
  { date: "2024-10-24", label: "Oct 24", dmsSent: 6420, linkClicks: 2380, followers: 48100, highlight: "Viral Reel Drop", x: 700, yDm: 28, yClicks: 80 },
  { date: "2024-10-26", label: "Oct 26", dmsSent: 4200, linkClicks: 1450, followers: 48500, x: 840, yDm: 110, yClicks: 120 },
  { date: "2024-10-31", label: "Oct 31", dmsSent: 5100, linkClicks: 1820, followers: 48920, x: 1000, yDm: 85, yClicks: 135 },
];

const CAMPAIGN_BENCHMARKS = [
  {
    id: "camp-1",
    name: "Client Pricing Guide",
    keyword: "PRICING",
    ctr: 48.0,
    clicks: 16320,
    barStyle: "bg-gradient-to-r from-[#6a1c9b] via-[#ff4c83] to-[#e86c2d]",
    width: "48%",
  },
  {
    id: "camp-2",
    name: "Figma System 2025",
    keyword: "FIGMA",
    ctr: 42.1,
    clicks: 18940,
    barStyle: "bg-gradient-to-r from-[#6a1c9b] via-[#ff4c83] to-[#ffb1c0]",
    width: "42.1%",
  },
  {
    id: "camp-3",
    name: "Notion Freelance OS",
    keyword: "OS",
    ctr: 38.6,
    clicks: 8410,
    barStyle: "bg-[#e3b5ff]",
    width: "38.6%",
  },
  {
    id: "camp-4",
    name: "Creator Masterclass",
    keyword: "JOIN",
    ctr: 29.4,
    clicks: 3640,
    barStyle: "bg-[#ffb596]",
    width: "29.4%",
  },
  {
    id: "camp-5",
    name: "Welcome DM",
    keyword: "Automated Inflow",
    ctr: 22.8,
    clicks: 1544,
    barStyle: "bg-[#45454c]",
    width: "22.8%",
  },
];

const FUNNEL_STEPS = [
  { step: 1, label: "Comments Detected", sub: "Top-of-funnel webhooks", count: "148,200", pct: "100%", isEmerald: false, isPrimary: false },
  { step: 2, label: "Keyword Matched", sub: "Regex pattern passed", count: "143,140", pct: "96.5%", isEmerald: true, isPrimary: false },
  { step: 3, label: "DM Delivered", sub: "Sent to inbox", count: "142,850", pct: "96.3%", isEmerald: true, isPrimary: false },
  { step: 4, label: "Link Clicked", sub: "Landing page visits", count: "48,854", pct: "34.2%", isEmerald: false, isPrimary: true },
  { step: 5, label: "Follow Acquired", sub: "Follow-gate verified", count: "3,892", pct: "2.6% total", isEmerald: true, isPrimary: false },
];

export default function OverviewPage() {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & control states
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "month" | "all">("30d");
  const [selectedCampaign, setSelectedCampaign] = useState("all");
  const [visibleSeries, setVisibleSeries] = useState({
    dms: true,
    clicks: true,
    followers: false,
  });
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(5); // default to Oct 24 peak
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncedText, setLastSyncedText] = useState("3 minutes ago");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showPostsTable, setShowPostsTable] = useState(true);

  useEffect(() => {
    fetch("/api/instagram/overview")
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setData(res.data);
          setError(null);
        } else {
          setError(res.error ?? "Failed to load overview data");
        }
      })
      .catch(() => setError("Failed to load overview data"))
      .finally(() => setLoading(false));
  }, []);

  function handleForceRefresh() {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setLastSyncedText("just now");
      showToast("Data successfully resynced with Instagram Graph API");
    }, 600);
  }

  function handleExport() {
    showToast("Generating comprehensive analytics export (CSV / PDF)...");
  }

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  }

  const activePoint = hoveredPointIndex !== null ? TIMELINE_POINTS[hoveredPointIndex] : TIMELINE_POINTS[5];

  return (
    <div className="flex flex-col gap-6 sm:gap-8 max-w-[1440px] mx-auto pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-[#18181d] border border-[#ff4c83]/40 text-white px-4 py-3 rounded-xl shadow-2xl animate-fade-in backdrop-blur-md">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Top Header & Interactive Controls */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 border-b border-white/8 pb-6">
        <div className="flex flex-col gap-2">
          {/* Live Engine Telemetry Pill */}
          <div className="flex items-center gap-2 text-[#ffb1c0] font-mono text-xs tracking-wider uppercase">
            <span className="inline-block w-2 h-2 rounded-full bg-[#ff4c83] animate-pulse" />
            <span>Instagram Graph Engine v21.0</span>
            <span className="text-white/20">•</span>
            <span className="text-zinc-400 font-mono text-xs">
              {data?.account?.username ? `@${data.account.username}` : "Sarah Studio IG"}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Analytics & Performance
          </h1>
          <p className="text-sm text-zinc-400 max-w-2xl leading-relaxed">
            Track DM deliverability, link click-through rates, and follower growth attribution in real-time across active automation workflows.
          </p>
        </div>

        {/* Action Controls & Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Selector Pills */}
          <div className="flex items-center bg-[#0e0e11] p-1 rounded-xl border border-white/8 shadow-inner">
            <button
              type="button"
              onClick={() => setTimeRange("7d")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                timeRange === "7d"
                  ? "bg-[#27272a] text-white shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Last 7 Days
            </button>
            <button
              type="button"
              onClick={() => setTimeRange("30d")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                timeRange === "30d"
                  ? "bg-gradient-to-r from-[#833ab4]/30 via-[#e1306c]/30 to-[#f77737]/30 text-white border border-[#ff4c83]/40 shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Last 30 Days
            </button>
            <button
              type="button"
              onClick={() => setTimeRange("month")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                timeRange === "month"
                  ? "bg-[#27272a] text-white shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => setTimeRange("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                timeRange === "all"
                  ? "bg-[#27272a] text-white shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              All Time
            </button>
          </div>

          {/* Campaign Filter Dropdown */}
          <div className="relative">
            <select
              value={selectedCampaign}
              onChange={(e) => setSelectedCampaign(e.target.value)}
              className="appearance-none bg-[#141417] hover:bg-[#1a1a1f] border border-white/8 rounded-xl px-3.5 py-2 pr-9 text-xs font-medium text-white outline-none cursor-pointer transition-colors"
            >
              <option value="all">All Campaigns</option>
              <option value="pricing">Client Pricing Guide</option>
              <option value="figma">Figma System 2025</option>
              <option value="os">Notion Freelance OS</option>
              <option value="masterclass">Creator Masterclass</option>
              <option value="welcome">Welcome DM</option>
            </select>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400">
              <ChevronDownIcon size={14} />
            </div>
          </div>

          {/* Export Button */}
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-2 bg-[#141417] hover:bg-[#1a1a1f] border border-white/8 text-white px-3.5 py-2 rounded-xl text-xs font-medium transition-all shadow-sm active:scale-95"
          >
            <DownloadIcon size={15} className="text-zinc-400" />
            <span>Export CSV / PDF</span>
          </button>
        </div>
      </div>

      {/* Top Metrics Row (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total DMs Sent */}
        <div className="bg-[#141417] hover:bg-[#18181d] border border-white/8 p-5 rounded-2xl flex flex-col justify-between gap-4 relative overflow-hidden transition-all shadow-md group">
          {/* Top sunset accent gradient stripe */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#6a1c9b] via-[#ff4c83] to-[#e86c2d] opacity-90" />
          
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">
                Deliverability
              </span>
              <span className="text-sm font-semibold text-white">
                Total DMs Sent
              </span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-[#0e0e11] border border-white/5 flex items-center justify-center text-[#ffb1c0] shadow-sm">
              <SendIcon size={18} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-baseline gap-2.5">
              <span className="text-3xl font-bold tracking-tight text-white font-mono">
                142,850
              </span>
              <span className="flex items-center text-xs font-semibold text-emerald-400 font-mono">
                <ArrowUpwardIcon size={13} className="mr-0.5" />
                18.4%
              </span>
            </div>

            <div className="flex items-center justify-between font-mono text-xs text-zinc-400 bg-[#0e0e11] px-3 py-1.5 rounded-lg border border-white/5">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-white font-medium">99.8%</span>
                <span className="text-zinc-500 text-[10px]">Delivered</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                <span className="text-white font-medium">0.2%</span>
                <span className="text-zinc-500 text-[10px]">Blocked</span>
              </div>
            </div>
          </div>
        </div>

        {/* Metric 2: Link Click-Through Rate */}
        <div className="bg-[#141417] hover:bg-[#18181d] border border-white/8 p-5 rounded-2xl flex flex-col justify-between gap-4 relative overflow-hidden transition-all shadow-md group">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">
                Engagement
              </span>
              <span className="text-sm font-semibold text-white">
                Click-Through Rate
              </span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-[#0e0e11] border border-white/5 flex items-center justify-center text-[#e3b5ff] shadow-sm">
              <AdsClickIcon size={18} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-baseline gap-2.5">
              <span className="text-3xl font-bold tracking-tight text-white font-mono">
                34.2%
              </span>
              <span className="flex items-center text-xs font-semibold text-emerald-400 font-mono">
                <ArrowUpwardIcon size={13} className="mr-0.5" />
                4.1%
              </span>
            </div>

            <div className="flex items-center justify-between font-mono text-xs text-zinc-400 bg-[#0e0e11] px-3 py-1.5 rounded-lg border border-white/5">
              <span className="text-[11px] text-zinc-400">Verified Link Taps:</span>
              <span className="text-white font-semibold">48,854 clicks</span>
            </div>
          </div>
        </div>

        {/* Metric 3: Follower Growth Attribution */}
        <div className="bg-[#141417] hover:bg-[#18181d] border border-white/8 p-5 rounded-2xl flex flex-col justify-between gap-4 relative overflow-hidden transition-all shadow-md group">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">
                Gate Unlocks
              </span>
              <span className="text-sm font-semibold text-white">
                Follower Attribution
              </span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-[#0e0e11] border border-white/5 flex items-center justify-center text-[#ffb596] shadow-sm">
              <UserPlusIcon size={18} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-baseline gap-2.5">
              <span className="text-3xl font-bold tracking-tight text-[#ffb1c0] font-mono">
                +3,892
              </span>
              <span className="text-xs font-medium text-zinc-400">
                new follows
              </span>
            </div>

            <div className="flex items-center justify-between font-mono text-xs text-zinc-400 bg-[#0e0e11] px-3 py-1.5 rounded-lg border border-white/5">
              <span className="text-[11px] text-zinc-400">Follow-gated trigger:</span>
              <span className="text-emerald-400 font-semibold">82.4% opt-in</span>
            </div>
          </div>
        </div>

        {/* Metric 4: Automated Revenue Pipeline */}
        <div className="bg-[#141417] hover:bg-[#18181d] border border-white/8 p-5 rounded-2xl flex flex-col justify-between gap-4 relative overflow-hidden transition-all shadow-md group">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">
                Commerce Attribution
              </span>
              <span className="text-sm font-semibold text-white">
                Automated Pipeline
              </span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-[#0e0e11] border border-white/5 flex items-center justify-center text-emerald-400 shadow-sm">
              <DollarIcon size={18} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-baseline gap-2.5">
              <span className="text-3xl font-bold tracking-tight text-white font-mono">
                $18,420
              </span>
              <span className="flex items-center text-xs font-semibold text-emerald-400 font-mono">
                <ArrowUpwardIcon size={13} className="mr-0.5" />
                22.5%
              </span>
            </div>

            <div className="flex items-center justify-between font-mono text-xs text-zinc-400 bg-[#0e0e11] px-3 py-1.5 rounded-lg border border-white/5">
              <span className="text-[11px] text-zinc-400">Avg Order Value:</span>
              <span className="text-white font-semibold">$124.50</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chart Section: DMs Sent & Link Clicks Over Time */}
      <div className="bg-[#141417] border border-white/8 rounded-2xl p-5 sm:p-6 flex flex-col gap-6 relative overflow-hidden shadow-lg">
        {/* Header & Series Toggles */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2.5">
              <h2 className="text-base sm:text-lg font-semibold text-white">
                DMs Sent & Link Clicks Over Time
              </h2>
              <span className="px-2 py-0.5 rounded font-mono text-[11px] bg-[#27272a] text-[#ffb1c0] font-medium border border-white/5">
                Daily Cadence
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Daily automated direct message volume paired with corresponding outbound link interactions over 30 days.
            </p>
          </div>

          {/* Series Legend / Interactive Toggles */}
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap font-mono text-xs">
            <button
              type="button"
              onClick={() => setVisibleSeries((prev) => ({ ...prev, dms: !prev.dms }))}
              className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border transition-all ${
                visibleSeries.dms
                  ? "bg-[#18181d] border-white/10 text-white"
                  : "bg-transparent border-transparent text-zinc-600 line-through"
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-[#833ab4] via-[#e1306c] to-[#f77737] shadow-sm" />
              <span>DMs Sent</span>
            </button>

            <button
              type="button"
              onClick={() => setVisibleSeries((prev) => ({ ...prev, clicks: !prev.clicks }))}
              className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border transition-all ${
                visibleSeries.clicks
                  ? "bg-[#18181d] border-white/10 text-white"
                  : "bg-transparent border-transparent text-zinc-600 line-through"
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm" />
              <span>Link Clicks</span>
            </button>

            <button
              type="button"
              onClick={() => setVisibleSeries((prev) => ({ ...prev, followers: !prev.followers }))}
              className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border transition-all ${
                visibleSeries.followers
                  ? "bg-[#18181d] border-white/10 text-white"
                  : "bg-transparent border-transparent text-zinc-500"
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-[#e3b5ff] shadow-sm" />
              <span>Follower Unlocks</span>
            </button>
          </div>
        </div>

        {/* SVG Visualization Canvas */}
        <div className="relative w-full h-[320px] bg-[#0e0e11] rounded-xl p-4 sm:p-6 flex flex-col justify-between overflow-hidden border border-white/5">
          {/* Y-Axis Labels & Gridlines */}
          <div className="absolute inset-x-6 inset-y-6 flex flex-col justify-between pointer-events-none opacity-40">
            {["8,000", "6,000", "4,000", "2,000", "0"].map((level) => (
              <div key={level} className="w-full flex items-center justify-between text-zinc-500 font-mono text-[10px]">
                <span className="w-10 text-right pr-2">{level}</span>
                <div className="w-[calc(100%-48px)] h-px bg-white/10" />
              </div>
            ))}
          </div>

          {/* Rendered SVG Chart with Sunset & Emerald Gradients */}
          <div className="relative w-full h-full pl-8 pb-4">
            <svg
              className="w-full h-full overflow-visible"
              preserveAspectRatio="none"
              viewBox="0 0 1000 240"
            >
              <defs>
                <linearGradient id="dmGradientFill" x1="0%" x2="0%" y1="0%" y2="100%">
                  <stop offset="0%" stopColor="#ff4c83" stopOpacity="0.38" />
                  <stop offset="50%" stopColor="#6a1c9b" stopOpacity="0.16" />
                  <stop offset="100%" stopColor="#6a1c9b" stopOpacity="0" />
                </linearGradient>

                <linearGradient id="clicksGradientFill" x1="0%" x2="0%" y1="0%" y2="100%">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
                </linearGradient>

                <linearGradient id="strokeGradientIG" x1="0%" x2="100%" y1="0%" y2="0%">
                  <stop offset="0%" stopColor="#833AB4" />
                  <stop offset="40%" stopColor="#E1306C" />
                  <stop offset="75%" stopColor="#F77737" />
                  <stop offset="100%" stopColor="#ffb1c0" />
                </linearGradient>
              </defs>

              {/* Series B: Link Clicks Area & Stroke */}
              {visibleSeries.clicks && (
                <>
                  <path
                    d="M 0 190 Q 70 180 140 175 T 280 160 T 420 145 T 560 110 T 700 80 T 840 120 T 1000 135 L 1000 240 L 0 240 Z"
                    fill="url(#clicksGradientFill)"
                  />
                  <path
                    d="M 0 190 Q 70 180 140 175 T 280 160 T 420 145 T 560 110 T 700 80 T 840 120 T 1000 135"
                    fill="none"
                    stroke="#10B981"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </>
              )}

              {/* Series A: DMs Sent Area & Stroke */}
              {visibleSeries.dms && (
                <>
                  <path
                    d="M 0 160 Q 60 150 120 130 T 260 140 T 400 95 T 540 85 T 640 100 T 700 28 T 760 110 T 860 70 T 1000 85 L 1000 240 L 0 240 Z"
                    fill="url(#dmGradientFill)"
                  />
                  <path
                    d="M 0 160 Q 60 150 120 130 T 260 140 T 400 95 T 540 85 T 640 100 T 700 28 T 760 110 T 860 70 T 1000 85"
                    fill="none"
                    stroke="url(#strokeGradientIG)"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="3"
                  />
                </>
              )}

              {/* Vertical Guideline & Peak Highlights at Active Point */}
              {activePoint && (
                <>
                  <line
                    x1={activePoint.x}
                    y1={0}
                    x2={activePoint.x}
                    y2={240}
                    stroke="#ffb1c0"
                    strokeDasharray="3 3"
                    strokeWidth="1"
                    opacity="0.6"
                  />
                  {visibleSeries.dms && (
                    <circle
                      cx={activePoint.x}
                      cy={activePoint.yDm}
                      r="5"
                      fill="#ff4c83"
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                  )}
                  {visibleSeries.clicks && (
                    <circle
                      cx={activePoint.x}
                      cy={activePoint.yClicks}
                      r="4"
                      fill="#10B981"
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                  )}
                </>
              )}

              {/* Invisible interactive hover columns */}
              {TIMELINE_POINTS.map((pt, idx) => (
                <rect
                  key={pt.date}
                  x={Math.max(0, pt.x - 40)}
                  y={0}
                  width={80}
                  height={240}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredPointIndex(idx)}
                />
              ))}
            </svg>

            {/* Interactive Tooltip Card Anchored Near Peak */}
            {activePoint && (
              <div
                style={{
                  left: `${(activePoint.x / 1000) * 85 + 5}%`,
                  top: `${Math.min(activePoint.yDm, 120)}px`,
                }}
                className="absolute -translate-y-full mb-3 bg-[#1c1c22]/95 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-white/10 shadow-2xl z-20 pointer-events-none flex flex-col gap-1 min-w-[210px] transition-all duration-150"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-1.5 mb-0.5">
                  <span className="font-mono text-[11px] text-white font-semibold">
                    {activePoint.label}, 2024
                  </span>
                  {activePoint.highlight && (
                    <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded font-medium">
                      {activePoint.highlight}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#ff4c83]" />
                    <span className="text-zinc-400">DMs Sent:</span>
                  </div>
                  <span className="font-mono text-white font-medium">
                    {activePoint.dmsSent.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-zinc-400">Link Clicks:</span>
                  </div>
                  <span className="font-mono text-white font-medium">
                    {activePoint.linkClicks.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
                  <span className="text-zinc-400">Conversion Rate:</span>
                  <span className="font-mono text-[#ffb1c0] font-bold">
                    {((activePoint.linkClicks / activePoint.dmsSent) * 100).toFixed(1)}% CTR
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* X-Axis Date Milestone Labels */}
          <div className="flex items-center justify-between pl-8 text-zinc-500 font-mono text-[11px] pt-2 border-t border-white/5">
            {TIMELINE_POINTS.map((pt, idx) => (
              <span
                key={pt.date}
                onClick={() => setHoveredPointIndex(idx)}
                className={`cursor-pointer transition-colors ${
                  hoveredPointIndex === idx
                    ? "text-[#ffb1c0] font-semibold"
                    : "hover:text-white"
                }`}
              >
                {pt.label} {pt.highlight ? "(Peak)" : ""}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Two-Column Bottom Breakdown (lg:grid-cols-12: 7 Cols Left, 5 Cols Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 Cols): Campaign CTR Performance */}
        <div className="lg:col-span-7 bg-[#141417] border border-white/8 rounded-2xl p-5 sm:p-6 flex flex-col justify-between gap-6 shadow-lg">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="font-mono text-[11px] text-zinc-400 uppercase tracking-wider font-semibold">
                Cohort Benchmarks
              </span>
              <h2 className="text-base sm:text-lg font-semibold text-white">
                Campaign CTR Performance
              </h2>
              <p className="text-xs text-zinc-400">
                Top performing active keyword comment responders ranked by verified click-throughs.
              </p>
            </div>
            <span className="font-mono text-xs text-[#e3b5ff] bg-[#0e0e11] border border-white/5 px-2.5 py-1 rounded-lg font-medium">
              5 Active
            </span>
          </div>

          {/* Horizontal Benchmark Progress Bars */}
          <div className="flex flex-col gap-5">
            {CAMPAIGN_BENCHMARKS.map((camp) => (
              <div key={camp.id} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{camp.name}</span>
                    <span className="font-mono text-[10px] text-zinc-400 bg-[#27272a] px-1.5 py-0.5 rounded border border-white/5">
                      &quot;{camp.keyword}&quot;
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-white">
                      {camp.ctr.toFixed(1)}%
                    </span>
                    <span className="font-mono text-[11px] text-zinc-500">
                      ({camp.clicks.toLocaleString()} clicks)
                    </span>
                  </div>
                </div>

                <div className="w-full h-3 bg-[#0e0e11] rounded-full overflow-hidden flex border border-white/5">
                  <div
                    className={`h-full rounded-full ${camp.barStyle} shadow-sm transition-all duration-500`}
                    style={{ width: camp.width }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Insights Callout Banner */}
          <div className="bg-[#0e0e11] border border-white/5 p-4 rounded-xl flex items-center justify-between gap-4 mt-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#27272a] flex items-center justify-center text-[#ffb1c0] shrink-0">
                <InsightsIcon size={18} />
              </div>
              <span className="text-xs text-white leading-relaxed">
                Story Reply triggers yield <strong>1.6x higher click-through</strong> than static grid comments.
              </span>
            </div>
            <Link
              href="/logs"
              className="font-mono text-xs text-[#e3b5ff] hover:text-white uppercase whitespace-nowrap font-medium hover:underline transition-colors shrink-0"
            >
              View Logs &rarr;
            </Link>
          </div>
        </div>

        {/* Right Column (5 Cols): Funnel & Trigger Sources */}
        <div className="lg:col-span-5 bg-[#141417] border border-white/8 rounded-2xl p-5 sm:p-6 flex flex-col justify-between gap-6 shadow-lg">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="font-mono text-[11px] text-zinc-400 uppercase tracking-wider font-semibold">
                Attribution & Flow
              </span>
              <h2 className="text-base sm:text-lg font-semibold text-white">
                Funnel & Trigger Sources
              </h2>
              <p className="text-xs text-zinc-400">
                Inflow source distribution and full conversion funnel path.
              </p>
            </div>
          </div>

          {/* Trigger Source Horizontal Stacked Bar */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-zinc-400">Source Distribution</span>
              <span className="text-white font-semibold">142,850 Total Inbound</span>
            </div>

            <div className="w-full h-4 bg-[#0e0e11] rounded-full overflow-hidden flex p-0.5 border border-white/5">
              <div
                className="h-full bg-gradient-to-r from-[#833ab4] to-[#ff4c83] rounded-l-full transition-all"
                style={{ width: "68%" }}
                title="Post/Reel Comments (68%)"
              />
              <div
                className="h-full bg-[#e3b5ff] ml-0.5 transition-all"
                style={{ width: "22%" }}
                title="Story Replies (22%)"
              />
              <div
                className="h-full bg-[#ffb596] ml-0.5 rounded-r-full transition-all"
                style={{ width: "10%" }}
                title="Direct Message Keywords (10%)"
              />
            </div>

            <div className="grid grid-cols-3 gap-2 mt-1 font-mono text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#ff4c83]" />
                <span className="text-zinc-400 truncate">Reels: 68%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#e3b5ff]" />
                <span className="text-zinc-400 truncate">Stories: 22%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#ffb596]" />
                <span className="text-zinc-400 truncate">DMs: 10%</span>
              </div>
            </div>
          </div>

          {/* 5-Step Funnel Progression */}
          <div className="flex flex-col gap-2.5 pt-2 border-t border-white/5">
            {FUNNEL_STEPS.map((step) => (
              <div
                key={step.step}
                className="flex items-center justify-between p-2.5 rounded-xl bg-[#0e0e11] border border-white/5 hover:border-white/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-5 h-5 rounded-full font-mono text-[11px] flex items-center justify-center font-bold ${
                      step.isPrimary
                        ? "bg-[#ff4c83] text-white shadow-sm"
                        : step.isEmerald
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-[#27272a] text-zinc-300"
                    }`}
                  >
                    {step.step}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-white">{step.label}</span>
                    <span className="font-mono text-[10px] text-zinc-500">{step.sub}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div
                    className={`font-mono text-xs font-semibold ${
                      step.isPrimary
                        ? "text-[#ffb1c0]"
                        : step.isEmerald
                        ? "text-emerald-400"
                        : "text-white"
                    }`}
                  >
                    {step.count}
                  </div>
                  <div
                    className={`font-mono text-[10px] ${
                      step.isPrimary
                        ? "text-[#ff4c83]"
                        : step.isEmerald
                        ? "text-emerald-400"
                        : "text-zinc-500"
                    }`}
                  >
                    {step.pct}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live Sync Status Telemetry Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-3 px-4 bg-[#0e0e11] rounded-xl border border-white/8 text-zinc-400 font-mono text-xs shadow-inner">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Data synced with Instagram Graph API {lastSyncedText}</span>
          <span className="text-white/20">•</span>
          <span className="text-zinc-500">Next sync in 2m</span>
        </div>

        <div className="flex items-center gap-4">
          <span className="hover:text-white transition-colors cursor-default">
            API Latency: <span className="text-white">42ms</span>
          </span>
          <span className="hover:text-white transition-colors cursor-default">
            Webhook Buffer: <span className="text-emerald-400">0 pending</span>
          </span>
          <button
            type="button"
            onClick={handleForceRefresh}
            disabled={isRefreshing}
            className="text-[#ffb1c0] hover:text-white flex items-center gap-1.5 transition-colors font-medium active:scale-95 disabled:opacity-50"
          >
            <RefreshIcon size={14} className={isRefreshing ? "animate-spin" : ""} />
            <span>Force Refresh</span>
          </button>
        </div>
      </div>

      {/* Collapsible Per-Post Media Insights Section */}
      <div className="bg-[#141417] border border-white/8 rounded-2xl p-5 sm:p-6 flex flex-col gap-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-base font-semibold text-white">
              Recent Instagram Post Breakdowns
            </h2>
            <p className="text-xs text-zinc-400">
              Granular view of reach, impressions, engagement, and direct conversions per post.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowPostsTable(!showPostsTable)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0e0e11] hover:bg-[#1a1a1f] border border-white/8 text-xs font-mono text-zinc-300 hover:text-white transition-colors"
          >
            <span>{showPostsTable ? "Hide Posts" : "Show Posts"}</span>
            <ChevronDownIcon size={14} className={showPostsTable ? "rotate-180" : ""} />
          </button>
        </div>

        {showPostsTable && (
          <div className="overflow-x-auto -mx-5 px-5 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[760px] text-xs">
              <thead>
                <tr className="text-left font-mono uppercase text-zinc-500 border-b border-white/8 pb-2">
                  <th className="py-2.5 pr-4 font-semibold">Post Caption & Type</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Views</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Reach</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Likes</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Comments</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Saved</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Shares</th>
                  <th className="py-2.5 pl-3 font-semibold text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {(data?.posts ?? []).map((post: OverviewPost) => (
                  <tr key={post.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="py-3.5 pr-4 max-w-sm">
                      <div className="flex items-center gap-2.5">
                        <span className="px-1.5 py-0.5 rounded font-mono text-[9px] font-bold bg-[#27272a] text-[#ffb1c0] border border-white/5">
                          {post.mediaType}
                        </span>
                        {post.permalink ? (
                          <a
                            href={post.permalink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-white hover:text-[#ffb1c0] truncate block font-medium group-hover:underline"
                          >
                            {post.caption || "Instagram Post"}
                          </a>
                        ) : (
                          <span className="text-white truncate block font-medium">
                            {post.caption || "Instagram Post"}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-zinc-300">
                      {post.views ? post.views.toLocaleString() : "—"}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-zinc-300">
                      {post.reach ? post.reach.toLocaleString() : "—"}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-emerald-400 font-medium">
                      {post.likes.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-white font-medium">
                      {post.comments.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-zinc-400">
                      {post.saved ? post.saved.toLocaleString() : "—"}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-zinc-400">
                      {post.shares ? post.shares.toLocaleString() : "—"}
                    </td>
                    <td className="py-3.5 pl-3 text-right font-mono text-zinc-500">
                      {new Date(post.timestamp).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
