"use client";

/**
 * Campaigns List Screen
 *
 * Upgraded to match the Stitch design specification:
 * - Header with total count badge & Instagram sunset gradient CTA
 * - Quick summary pill bar (Active funnels, Standby, Sends today)
 * - Search & multi-parameter filter controls
 * - High-density campaigns table with media previews, keyword chips,
 *   CTR progress bars, live status toggles, and action menus.
 */

import { useI18n } from "@/lib/i18n/provider";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AccountSelect, { type AccountOption } from "@/components/account-select";
import { readCache, writeCache } from "@/lib/client-cache";
import {
  BoltIcon,
  SearchIcon,
  InstagramIcon,
  ChatIcon,
} from "@/components/icons";

interface Campaign {
  id: string;
  name: string;
  goal: string | null;
  postId: string | null;
  postUrl: string | null;
  pendingNextReel: boolean;
  matchAnyPost: boolean;
  keywords: string[];
  matchAnyWord: boolean;
  dmMessage: string;
  openingDmEnabled: boolean;
  openingDmMessage: string | null;
  openingDmButtonLabel: string | null;
  publicReplyEnabled: boolean;
  publicReplyMessage: string | null;
  publicReplyMessages: string[];
  requireFollow: boolean;
  followPromptMessage: string | null;
  followPromptButtonLabel: string | null;
  isActive: boolean;
  wholeWordMatch: boolean;
  instagramAccountId: string;
  instagramAccount: {
    username: string;
    instagramId: string;
  };
  reportShareSlug: string | null;
  reportShareEnabled: boolean;
  reportUrl: string | null;
  createdAt: string;
  _count: { dmLogs: number };
  trackedLinks: Array<{
    id: string;
    slug: string;
    label: string | null;
    destinationUrl: string;
    trackedUrl: string;
    _count: { clicks: number };
  }>;
  analytics: {
    sent: number;
    skipped: number;
    failed: number;
    clicks: number;
    ctr: number;
    topKeywords: { keyword: string; count: number }[];
  };
}

export default function CampaignsPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [automations, setAutomations] = useState<Campaign[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("all");
  const [loading, setLoading] = useState(true);

  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [videos, setVideos] = useState<Record<string, string>>({});
  const [playingVideo, setPlayingVideo] = useState<{
    url: string;
    postUrl: string | null;
  } | null>(null);

  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "paused">("all");
  const [triggerFilter, setTriggerFilter] = useState<"all" | "comment" | "dm">("all");

  const fetchAutomations = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedAccountId !== "all") {
        params.set("instagramAccountId", selectedAccountId);
      }
      const res = await fetch(
        `/api/automations${params.size ? `?${params}` : ""}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (data.success) setAutomations(data.data);
    } catch (err) {
      console.error("Failed to fetch campaigns:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedAccountId]);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((res) => res.json())
      .then((payload) => {
        if (payload.success) setAccounts(payload.data.instagramAccounts ?? []);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchAutomations();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchAutomations]);

  useEffect(() => {
    if (automations.length === 0) return;
    let cancelled = false;
    const accountIds = Array.from(
      new Set(automations.map((a) => a.instagramAccountId))
    ).sort();
    const cacheKey = `ig-media:${accountIds.join(",")}`;

    const cached = readCache<{
      thumbs: Record<string, string>;
      videos: Record<string, string>;
    }>(cacheKey, 15 * 60 * 1000);

    if (cached.data) {
      setThumbnails(cached.data.thumbs);
      setVideos(cached.data.videos);
    }

    Promise.all(
      accountIds.map((accountId) =>
        fetch(`/api/instagram/posts?instagramAccountId=${accountId}&limit=50`)
          .then((res) => res.json())
          .then((payload) =>
            payload.success
              ? (payload.data as {
                  id: string;
                  media_type?: string;
                  media_url?: string;
                  thumbnail_url?: string;
                }[])
              : []
          )
          .catch(() => [])
      )
    ).then((lists) => {
      if (cancelled) return;
      const thumbs: Record<string, string> = {};
      const vids: Record<string, string> = {};
      for (const list of lists) {
        for (const media of list) {
          const url = media.thumbnail_url ?? media.media_url;
          if (url) thumbs[media.id] = url;
          if (media.media_type === "VIDEO" && media.media_url) {
            vids[media.id] = media.media_url;
          }
        }
      }
      setThumbnails(thumbs);
      setVideos(vids);
      writeCache(cacheKey, { thumbs, videos: vids });
    });

    return () => {
      cancelled = true;
    };
  }, [automations]);

  useEffect(() => {
    if (!playingVideo) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPlayingVideo(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playingVideo]);

  function handleAccountChange(accountId: string) {
    setLoading(true);
    setSelectedAccountId(accountId);
  }

  async function toggleActive(id: string, isActive: boolean) {
    try {
      await fetch(`/api/automations?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      setAutomations((prev) =>
        prev.map((a) => (a.id === id ? { ...a, isActive: !isActive } : a))
      );
    } catch (err) {
      console.error("Failed to toggle:", err);
    }
  }

  async function copyReelUrl(auto: Campaign) {
    setMenuOpenId(null);
    if (!auto.postUrl) return;
    try {
      await navigator.clipboard.writeText(auto.postUrl);
      setCopiedId(auto.id);
      window.setTimeout(
        () => setCopiedId((cur) => (cur === auto.id ? null : cur)),
        1500
      );
    } catch (err) {
      console.error("Failed to copy reel URL:", err);
    }
  }

  async function deleteAutomation(id: string) {
    if (!confirm("Delete this campaign? This cannot be undone.")) return;
    try {
      await fetch(`/api/automations?id=${id}`, { method: "DELETE" });
      setAutomations((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  }

  async function duplicateAutomation(id: string) {
    setMenuOpenId(null);
    try {
      const res = await fetch(`/api/automations/duplicate?id=${id}`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success && data.data?.id) {
        router.push(`/campaigns/${data.data.id}/edit`);
      }
    } catch (err) {
      console.error("Failed to duplicate:", err);
    }
  }

  const filteredAutomations = automations.filter((auto) => {
    if (statusFilter === "active" && !auto.isActive) return false;
    if (statusFilter === "paused" && auto.isActive) return false;

    if (triggerFilter === "comment" && !auto.postId && !auto.matchAnyPost && !auto.pendingNextReel) {
      return false;
    }
    if (triggerFilter === "dm" && (auto.postId || auto.matchAnyPost || auto.pendingNextReel)) {
      return false;
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = auto.name.toLowerCase().includes(q);
      const matchKeyword = auto.keywords.some((k) => k.toLowerCase().includes(q));
      if (!matchName && !matchKeyword) return false;
    }

    return true;
  });

  const activeCount = automations.filter((a) => a.isActive).length;
  const pausedCount = automations.filter((a) => !a.isActive).length;
  const totalSends = automations.reduce((sum, a) => sum + (a.analytics?.sent ?? 0), 0);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-48 bg-white/5 rounded-lg" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-[#18181b] border border-white/8" />
          ))}
        </div>
        <div className="h-96 rounded-xl bg-[#18181b] border border-white/8" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Header with Breadcrumb & New Campaign Button */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-white/8">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              {t("Campaigns")}
            </h1>
            <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-[#1f1f24] text-[#ff4c83] font-semibold border border-white/5">
              {automations.length} total
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-white/20" />
            <span className="font-mono text-xs uppercase tracking-wider text-[#a1a1aa]">
              Automations & Funnels
            </span>
          </div>
          <p className="text-sm text-[#a1a1aa] mt-1 max-w-2xl">
            Create and manage automated DM funnels triggered by Instagram comments, story replies, and DMs.
          </p>
        </div>

        {/* Filter Controls & CTA */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Bar */}
          <div className="relative flex items-center min-w-[220px]">
            <SearchIcon size={14} className="absolute left-3 text-[#71717a] pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter campaigns or keywords..."
              className="w-full bg-[#141417] text-white text-xs pl-8 pr-3 py-2 rounded-lg border border-white/8 focus:outline-none focus:border-[#ff4c83] placeholder:text-[#71717a] transition-colors"
            />
          </div>

          {/* Trigger filter */}
          <select
            value={triggerFilter}
            onChange={(e) => setTriggerFilter(e.target.value as any)}
            className="bg-[#18181b] text-white text-xs px-3 py-2 rounded-lg border border-white/8 focus:outline-none focus:border-[#ff4c83] transition-colors cursor-pointer"
          >
            <option value="all">All Triggers</option>
            <option value="comment">Post / Reel Comment</option>
            <option value="dm">Story & DM Trigger</option>
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-[#18181b] text-white text-xs px-3 py-2 rounded-lg border border-white/8 focus:outline-none focus:border-[#ff4c83] transition-colors cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="paused">Paused Only</option>
          </select>

          {/* New Campaign Button */}
          <Link
            href="/campaigns/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-ig-gradient text-white text-xs font-semibold shadow-ig-glow hover:brightness-110 active:scale-[0.98] transition-all"
          >
            <span>+</span>
            <span>{t("New Campaign")}</span>
          </Link>
        </div>
      </div>

      {/* 2. Quick Summary Pill Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="flex items-center justify-between p-4 rounded-xl bg-[#18181b] border border-white/8 shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-sm font-semibold text-white font-mono">
              {activeCount} Active
            </span>
          </div>
          <span className="text-[11px] font-mono text-[#a1a1aa] bg-[#27272a] px-2 py-0.5 rounded">
            Funnels running
          </span>
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl bg-[#18181b] border border-white/8 shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <span className="text-sm font-semibold text-white font-mono">
              {pausedCount} Paused
            </span>
          </div>
          <span className="text-[11px] font-mono text-[#a1a1aa] bg-[#27272a] px-2 py-0.5 rounded">
            Standby
          </span>
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl bg-[#18181b] border border-white/8 shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#71717a]" />
            <span className="text-sm font-semibold text-white font-mono">
              {automations.length - activeCount - pausedCount} Draft
            </span>
          </div>
          <span className="text-[11px] font-mono text-[#a1a1aa] bg-[#27272a] px-2 py-0.5 rounded">
            Unpublished
          </span>
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl bg-[#18181b] border border-white/8 shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="text-[#ff4c83]">
              <BoltIcon size={16} />
            </span>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-[#71717a] block font-mono">
                Total Sends
              </span>
              <span className="text-sm font-semibold text-white font-mono">
                {totalSends.toLocaleString()} DMs
              </span>
            </div>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 font-medium">
            ↑ 18%
          </span>
        </div>
      </div>

      {/* 3. Main Campaigns Table */}
      <div className="w-full bg-[#18181b] border border-white/8 rounded-xl shadow-md overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#141417] text-[#a1a1aa] font-mono text-[11px] uppercase tracking-wider border-b border-white/8">
                <th className="py-3.5 px-4 sm:px-6 font-semibold">Campaign Name & Media</th>
                <th className="py-3.5 px-4 font-semibold">Trigger</th>
                <th className="py-3.5 px-4 font-semibold">Keywords</th>
                <th className="py-3.5 px-4 font-semibold">Total Delivered</th>
                <th className="py-3.5 px-4 font-semibold min-w-[180px]">CTR & Conversion</th>
                <th className="py-3.5 px-4 font-semibold text-center">Status</th>
                <th className="py-3.5 px-4 sm:px-6 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
              {filteredAutomations.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-[#71717a]">
                    No campaigns found matching your filter criteria.
                  </td>
                </tr>
              )}

              {filteredAutomations.map((auto) => {
                const thumb = auto.postId ? thumbnails[auto.postId] : null;
                const ctr = auto.analytics?.ctr ?? 0;
                const clicks = auto.analytics?.clicks ?? 0;

                return (
                  <tr
                    key={auto.id}
                    className="hover:bg-[#1f1f24]/60 transition-colors group"
                  >
                    {/* 1. Name & Media */}
                    <td className="py-3.5 px-4 sm:px-6">
                      <div className="flex items-center gap-3">
                        <div className="relative w-11 h-11 rounded-lg overflow-hidden shrink-0 bg-[#27272a] border border-white/8 flex items-center justify-center">
                          {thumb ? (
                            <img
                              src={thumb}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <InstagramIcon size={20} className="text-[#a1a1aa]" />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-0.5">
                            <span className="text-[10px] text-white/90">
                              {auto.postId ? "🎬" : "💬"}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col min-w-0 max-w-[240px]">
                          <Link
                            href={`/campaigns/${auto.id}/edit`}
                            className="font-medium text-white truncate hover:text-[#ff4c83] transition-colors"
                          >
                            {auto.name}
                          </Link>
                          <span className="text-xs text-[#71717a] truncate">
                            {auto.goal ?? `@${auto.instagramAccount.username}`}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* 2. Trigger Type */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#27272a] text-[#e4e1e6] text-xs">
                        {auto.postId || auto.matchAnyPost || auto.pendingNextReel ? (
                          <>
                            <span className="text-[#ff4c83]">●</span>
                            Post/Reel Comment
                          </>
                        ) : (
                          <>
                            <ChatIcon size={13} className="text-[#e3b5ff]" />
                            Story / DM Trigger
                          </>
                        )}
                      </span>
                    </td>

                    {/* 3. Keywords */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap items-center gap-1 max-w-[200px]">
                        {auto.keywords.length > 0 ? (
                          auto.keywords.slice(0, 3).map((kw) => (
                            <span
                              key={kw}
                              className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-[#141417] text-[#ffb1c0] border border-white/8"
                            >
                              {kw}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-[#71717a]">Any text</span>
                        )}
                        {auto.keywords.length > 3 && (
                          <span className="text-[10px] font-mono text-[#71717a]">
                            +{auto.keywords.length - 3}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 4. Total Delivered */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-mono text-sm font-semibold text-white">
                          {(auto.analytics?.sent ?? 0).toLocaleString()}
                        </span>
                        <span className="font-mono text-[11px] text-[#71717a]">
                          {auto._count?.dmLogs ?? 0} total logs
                        </span>
                      </div>
                    </td>

                    {/* 5. CTR & Conversion Progress */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between font-mono text-xs">
                          <span className="font-semibold text-[#ff4c83]">
                            {ctr}% CTR
                          </span>
                          <span className="text-[#71717a] text-[11px]">
                            {clicks} clicks
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-[#27272a] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-ig-gradient"
                            style={{ width: `${Math.min(ctr, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* 6. Active Toggle */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => toggleActive(auto.id, auto.isActive)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          auto.isActive ? "bg-emerald-500" : "bg-[#27272a]"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                            auto.isActive ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </td>

                    {/* 7. Action Controls */}
                    <td className="py-3.5 px-4 sm:px-6 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/campaigns/${auto.id}/edit`}
                          className="px-2.5 py-1 rounded bg-[#27272a] hover:bg-[#323238] text-white text-xs font-medium transition-colors"
                        >
                          Edit
                        </Link>

                        <button
                          type="button"
                          onClick={() => duplicateAutomation(auto.id)}
                          className="p-1.5 rounded text-[#a1a1aa] hover:text-white hover:bg-[#27272a] transition-colors text-xs"
                          title="Duplicate Campaign"
                        >
                          Copy
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteAutomation(auto.id)}
                          className="p-1.5 rounded text-[#71717a] hover:text-rose-400 hover:bg-rose-500/10 transition-colors text-xs"
                          title="Delete Campaign"
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
