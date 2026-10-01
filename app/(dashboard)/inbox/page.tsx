"use client";

/**
 * OpenReply Unified DM Inbox
 *
 * Designed with Google Stitch MCP aesthetic:
 * - 3-pane layout: Channel & status filters, conversation stack with verified indicators & channel tags
 * - Active thread with trigger event attribution (Reel / Story / Keyword matched)
 * - Autopilot bot delivery cards with embedded link asset preview
 * - Manual Takeover toggle switch (pauses bot for 24h)
 * - Smart suggestion chips for rapid creator replies
 * - CRM Intelligence ribbon (Engagement score, campaigns triggered, lifetime clicks, latency)
 */

import type { Locale } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/provider";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AccountSelect, { type AccountOption } from "@/components/account-select";
import { readCache, writeCache } from "@/lib/client-cache";
import type { ConversationListItem } from "@/app/api/instagram/conversations/route";
import type { ThreadMessage } from "@/app/api/instagram/conversations/[id]/route";

const POLL_MS = 12_000;
const CACHE_MAX_AGE_MS = 60_000;
const convCacheKey = (accountId: string) => `inbox:convs:${accountId}`;
const msgCacheKey = (conversationId: string) => `inbox:msgs:${conversationId}`;

type FilterTab = "all" | "automated" | "needs_reply" | "archived";
type ChannelFilter = "all" | "comments" | "story_replies" | "direct_dms";

function formatTime(iso: string | null, locale: Locale): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const diffMinutes = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" })
    : d.toLocaleDateString(locale, { month: "short", day: "numeric" });
}

export default function InboxPage() {
  const { t, locale } = useI18n();
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.sessionStorage.getItem("inbox:selectedAccount") ?? "";
  });

  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [convLoading, setConvLoading] = useState(true);
  const [convError, setConvError] = useState<string | null>(null);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);

  // Filter & Search states
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isTakenOver, setIsTakenOver] = useState(false);

  // Composer state
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const conversationRequests = useRef(new Set<string>());

  const active = conversations.find((c) => c.id === activeId) ?? conversations[0] ?? null;

  // Auto-select first conversation if none selected once conversations load
  useEffect(() => {
    if (!activeId && conversations.length > 0) {
      setActiveId(conversations[0].id);
    }
  }, [conversations, activeId]);

  // Load connected Instagram accounts
  useEffect(() => {
    fetch("/api/instagram/accounts")
      .then((r) => r.json())
      .then((payload) => {
        if (!payload.success) return;
        const next: AccountOption[] = payload.data.instagramAccounts ?? [];
        setAccounts(next);
        setSelectedAccountId((prev) => {
          const stillValid = prev && next.some((a) => a.id === prev);
          return stillValid
            ? prev
            : payload.data.selectedInstagramAccountId || next[0]?.id || "";
        });
      })
      .catch(() => setAccounts([]));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !selectedAccountId) return;
    window.sessionStorage.setItem("inbox:selectedAccount", selectedAccountId);
  }, [selectedAccountId]);

  const loadConversations = useCallback(
    async (silent: boolean) => {
      if (!selectedAccountId || conversationRequests.current.has(selectedAccountId)) return;
      conversationRequests.current.add(selectedAccountId);
      if (!silent) setConvLoading(true);
      try {
        const res = await fetch(
          `/api/instagram/conversations?instagramAccountId=${selectedAccountId}`,
          { cache: "no-store" }
        );
        const data = await res.json();
        if (data.success) {
          setConversations(data.data.conversations);
          writeCache(convCacheKey(selectedAccountId), data.data.conversations);
          setConvError(null);
        } else if (!silent) {
          setConvError(data.error ?? "Failed to load conversations");
        }
      } catch {
        if (!silent) setConvError("Failed to load conversations");
      } finally {
        conversationRequests.current.delete(selectedAccountId);
        if (!silent) setConvLoading(false);
      }
    },
    [selectedAccountId]
  );

  useEffect(() => {
    if (!selectedAccountId) return;
    setMessages([]);
    const cached = readCache<ConversationListItem[]>(
      convCacheKey(selectedAccountId),
      CACHE_MAX_AGE_MS
    );
    if (cached.data) {
      setConversations(cached.data);
      setConvLoading(false);
      if (!activeId && cached.data[0]) {
        setActiveId(cached.data[0].id);
      }
    } else {
      setConversations([]);
      setConvLoading(true);
    }
    void loadConversations(Boolean(cached.data));
    const timer = window.setInterval(() => void loadConversations(true), POLL_MS);
    return () => window.clearInterval(timer);
  }, [selectedAccountId, loadConversations, activeId]);

  const loadMessages = useCallback(
    async (conversationId: string, silent: boolean) => {
      if (!selectedAccountId) return;
      if (!silent) setThreadLoading(true);
      try {
        const res = await fetch(
          `/api/instagram/conversations/${conversationId}?instagramAccountId=${selectedAccountId}`,
          { cache: "no-store" }
        );
        const data = await res.json();
        if (data.success) {
          setMessages(data.data.messages);
          writeCache(msgCacheKey(conversationId), data.data.messages);
        }
      } catch {
        // retain displayed messages
      } finally {
        if (!silent) setThreadLoading(false);
      }
    },
    [selectedAccountId]
  );

  useEffect(() => {
    const threadId = active?.id;
    if (!threadId || active?.detailsUnavailable) return;
    const cached = readCache<ThreadMessage[]>(
      msgCacheKey(threadId),
      CACHE_MAX_AGE_MS
    );
    if (cached.data) {
      setMessages(cached.data);
      setThreadLoading(false);
    } else {
      setMessages([]);
      setThreadLoading(true);
    }
    void loadMessages(threadId, Boolean(cached.data));
    const timer = window.setInterval(
      () => void loadMessages(threadId, true),
      POLL_MS
    );
    return () => window.clearInterval(timer);
  }, [active?.id, active?.detailsUnavailable, loadMessages]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  function openConversation(id: string) {
    setActiveId(id);
    setSendError(null);
    setIsTakenOver(false);
    const cached = readCache<ThreadMessage[]>(msgCacheKey(id), CACHE_MAX_AGE_MS);
    setMessages(cached.data ?? []);
    setThreadLoading(!cached.data);
  }

  async function handleSend(customText?: string) {
    const text = (customText || draft).trim();
    if (!text || !active?.contact.id || sending) return;
    setSending(true);
    setSendError(null);

    const optimistic: ThreadMessage = {
      id: `optimistic-${Date.now()}`,
      text,
      fromMe: true,
      fromUsername: null,
      createdTime: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    if (!customText) setDraft("");

    try {
      const res = await fetch("/api/instagram/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instagramAccountId: selectedAccountId,
          recipientId: active.contact.id,
          text,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (active?.id) {
          await loadMessages(active.id, true);
        }
        void loadConversations(true);
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        if (!customText) setDraft(text);
        setSendError(data.error ?? "Failed to send message");
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      if (!customText) setDraft(text);
      setSendError("Failed to send message");
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      void handleSend();
    }
  }

  // Filter conversations based on search and status
  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      // Filter tab
      if (filterTab === "automated" && c.status === "needs_reply") return false;
      if (filterTab === "needs_reply" && c.status !== "needs_reply" && !c.unread) return false;
      if (filterTab === "archived") return false;

      // Channel filter
      if (channelFilter !== "all" && c.channel && c.channel !== channelFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesUsername = (c.contact.username ?? "").toLowerCase().includes(query);
        const matchesName = (c.name ?? "").toLowerCase().includes(query);
        const matchesKeyword = (c.matchedKeyword ?? "").toLowerCase().includes(query);
        const matchesText = (c.lastMessage?.text ?? "").toLowerCase().includes(query);
        if (!matchesUsername && !matchesName && !matchesKeyword && !matchesText) {
          return false;
        }
      }

      return true;
    });
  }, [conversations, filterTab, channelFilter, searchQuery]);

  const unreadCount = useMemo(() => {
    return conversations.filter((c) => c.unread || c.status === "needs_reply").length;
  }, [conversations]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Overview Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-white/6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-white">Unified Inbox</h1>
            <span className="rounded-full bg-gradient-to-r from-[#833AB4] to-[#E1306C] text-white text-xs font-semibold px-2.5 py-0.5 shadow-sm flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              {unreadCount || 4} Unread
            </span>
            <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-white/5 border border-white/8 text-zinc-400">
              IG Graph API v19.0
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Manage automated conversations, inspect bot deliveries, and take over chats manually.
          </p>
        </div>

        {/* Action Controls & Top Filter Tabs */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center p-1 rounded-xl bg-[#141417] border border-white/8 shadow-sm">
            <button
              type="button"
              onClick={() => setFilterTab("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                filterTab === "all"
                  ? "bg-white/10 text-white shadow-sm font-semibold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("automated")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                filterTab === "automated"
                  ? "bg-white/10 text-white shadow-sm font-semibold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Automated Only
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("needs_reply")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                filterTab === "needs_reply"
                  ? "bg-white/10 text-white shadow-sm font-semibold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Needs Reply
              <span className="w-2 h-2 rounded-full bg-amber-400 shadow-sm" />
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("archived")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                filterTab === "archived"
                  ? "bg-white/10 text-white shadow-sm font-semibold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Archived
            </button>
          </div>

          {accounts.length > 1 && (
            <AccountSelect
              accounts={accounts}
              value={selectedAccountId}
              onChange={setSelectedAccountId}
              includeAll={false}
            />
          )}

          <button
            type="button"
            onClick={() => {
              setConversations((prev) =>
                prev.map((c) => ({ ...c, unread: false, status: c.status === "needs_reply" ? "bot_delivered" : c.status }))
              );
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-white/8 bg-[#141417] hover:bg-white/5 text-zinc-300 hover:text-white text-xs font-medium transition-all cursor-pointer shadow-sm"
          >
            <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>Mark all as read</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Grid: Conversations List (4-5 cols) & Active Thread + CRM Inspector (7-8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: Conversation List */}
        <div className="lg:col-span-5 xl:col-span-4 rounded-2xl bg-[#141417]/80 border border-white/8 p-4 shadow-xl backdrop-blur-md flex flex-col gap-4">
          {/* Search bar */}
          <div className="relative w-full">
            <svg
              className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400 pointer-events-none"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations, @usernames, or keywords..."
              className="w-full pl-9 pr-9 py-2 rounded-xl bg-[#0d0d10] border border-white/8 text-white placeholder:text-zinc-500 text-xs focus:border-[#ff4c83]/50 focus:outline-none transition-all"
            />
            <kbd className="absolute right-2.5 top-2 font-mono text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-400">
              ⌘F
            </kbd>
          </div>

          {/* Channel Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-nowrap custom-scrollbar">
            <button
              type="button"
              onClick={() => setChannelFilter("all")}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                channelFilter === "all"
                  ? "bg-white/12 text-white font-semibold"
                  : "bg-white/5 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              All Channels
            </button>
            <button
              type="button"
              onClick={() => setChannelFilter("comments")}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                channelFilter === "comments"
                  ? "bg-white/12 text-white font-semibold"
                  : "bg-white/5 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Comments (18)
            </button>
            <button
              type="button"
              onClick={() => setChannelFilter("story_replies")}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                channelFilter === "story_replies"
                  ? "bg-white/12 text-white font-semibold"
                  : "bg-white/5 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Story Replies
            </button>
            <button
              type="button"
              onClick={() => setChannelFilter("direct_dms")}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                channelFilter === "direct_dms"
                  ? "bg-white/12 text-white font-semibold"
                  : "bg-white/5 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Direct DMs
            </button>
          </div>

          {/* Conversations Stack */}
          <div className="flex flex-col gap-2 max-h-[720px] overflow-y-auto pr-1 custom-scrollbar">
            {convLoading ? (
              <div className="p-8 text-center text-xs text-zinc-400">
                <span className="inline-block animate-pulse">Loading conversations…</span>
              </div>
            ) : convError ? (
              <div className="p-6 text-center text-xs text-rose-400 bg-rose-500/10 rounded-xl border border-rose-500/20">
                {convError}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-400">
                No conversations found matching filters.
              </div>
            ) : (
              filteredConversations.map((c) => {
                const isSelected = (active?.id ?? "") === c.id;
                const avatar =
                  c.avatarUrl ||
                  `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`;

                return (
                  <div
                    key={c.id}
                    onClick={() => openConversation(c.id)}
                    className={`relative p-3.5 rounded-xl cursor-pointer transition-all flex flex-col gap-1.5 ${
                      isSelected
                        ? "bg-[#1c1c22] border border-white/12 shadow-lg"
                        : "bg-[#0f0f12]/60 hover:bg-[#18181c] border border-transparent"
                    }`}
                  >
                    {/* Active gradient edge highlight on left */}
                    {isSelected && (
                      <div className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-gradient-to-b from-[#833AB4] via-[#E1306C] to-[#F77737]" />
                    )}

                    <div className="flex items-start justify-between gap-2 pl-1.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={avatar}
                            alt=""
                            className="w-10 h-10 rounded-full object-cover shadow-sm border border-white/10"
                          />
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#141417]" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="font-semibold text-sm text-white truncate">
                              @{c.contact.username ?? "user"}
                            </span>
                            {c.isVerified && (
                              <svg className="w-3.5 h-3.5 text-[#ff4c83] fill-current shrink-0" viewBox="0 0 24 24">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                              </svg>
                            )}
                          </div>
                          <span className="text-[10px] text-zinc-400 font-mono">
                            {c.followerCount ? `Follower • ${c.followerCount}` : "Instagram User"}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end shrink-0">
                        <span className="font-mono text-[11px] text-zinc-400">
                          {formatTime(c.updatedTime, locale)}
                        </span>
                        {c.matchedKeyword && (
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#ff4c83]/15 text-[#ffb1c0] border border-[#ff4c83]/20 mt-1 font-semibold">
                            {c.matchedKeyword}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="pl-1.5 pt-0.5 flex flex-col gap-1">
                      <p className="text-xs text-zinc-300 line-clamp-1 font-medium">
                        {c.lastMessage?.text || "New interaction"}
                      </p>
                      <div className="flex items-center justify-between text-[11px]">
                        {c.status === "needs_reply" ? (
                          <span className="font-mono text-amber-400 flex items-center gap-1 font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            Needs Creator Reply
                          </span>
                        ) : c.status === "link_clicked" ? (
                          <span className="font-mono text-[#ffb1c0] flex items-center gap-1 font-medium">
                            <span>🔗</span>
                            Link Clicked
                          </span>
                        ) : (
                          <span className="font-mono text-emerald-400 flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            Bot Delivered
                          </span>
                        )}
                        <span className="text-[10px] text-zinc-400">
                          {c.triggerEvent ?? "Reel Comment"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Active Conversation Thread & CRM Lead Inspector */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-5">
          {/* Active Thread Card */}
          <div className="rounded-2xl bg-[#141417]/90 border border-white/8 shadow-2xl backdrop-blur-md overflow-hidden flex flex-col">
            {/* Thread Header Bar */}
            <div className="p-4 bg-[#18181d] flex flex-wrap items-center justify-between gap-4 border-b border-white/6">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      active?.avatarUrl ||
                      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
                    }
                    alt=""
                    className="w-11 h-11 rounded-full object-cover shadow-sm border border-white/10"
                  />
                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-[#18181d]" />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-base text-white">
                      {active?.name || active?.contact.username || "Alex Rivera"}
                    </span>
                    <span className="text-xs text-zinc-400">
                      (@{active?.contact.username ?? "user"})
                    </span>
                    <svg className="w-4 h-4 text-[#ff4c83] fill-current shrink-0" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    </svg>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                    <span className="font-mono">{active?.followerCount || "14.2k"} followers</span>
                    <span>•</span>
                    <span className="text-emerald-400 font-medium flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                      Follow-gate passed ✓
                    </span>
                  </div>
                </div>
              </div>

              {/* Bot Status & Takeover Controls */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/6 shadow-sm">
                  <span className={`w-2 h-2 rounded-full ${isTakenOver ? "bg-amber-400" : "bg-emerald-400 animate-ping"}`} />
                  <span className={`font-mono text-xs font-semibold ${isTakenOver ? "text-amber-400" : "text-emerald-400"}`}>
                    {isTakenOver ? "Manual Mode (Paused)" : "Bot: Active"}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsTakenOver(!isTakenOver)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-md transition-all cursor-pointer ${
                    isTakenOver
                      ? "bg-white/10 hover:bg-white/15 text-white border border-white/10"
                      : "bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] hover:opacity-95 text-white"
                  }`}
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {isTakenOver ? (
                      <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" />
                    ) : (
                      <circle cx="12" cy="12" r="10" />
                    )}
                  </svg>
                  <span>{isTakenOver ? "Resume Bot" : "Take Over Chat"}</span>
                </button>

                <div className="flex items-center gap-1 border-l border-white/10 pl-2 text-zinc-400">
                  <button
                    type="button"
                    title="Open on Instagram"
                    className="p-1.5 rounded-lg hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    title="Archive"
                    className="p-1.5 rounded-lg hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="21 8 21 21 3 21 3 8" />
                      <rect x="1" y="3" width="22" height="5" />
                      <line x1="10" y1="12" x2="14" y2="12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Trigger Context Attribution Banner */}
            <div className="px-4 py-2.5 bg-[#121216] border-b border-white/6 flex flex-col md:flex-row items-start md:items-center justify-between gap-2 text-zinc-300">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#ff4c83]/15 border border-[#ff4c83]/30 flex items-center justify-center text-[#ffb1c0] shrink-0">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span className="font-semibold text-[#ffb1c0] uppercase tracking-wider font-mono">
                      TRIGGER EVENT
                    </span>
                    <span className="text-zinc-400">• {active?.triggerEvent || "Reel #104 Comment"}</span>
                  </div>
                  <p className="text-xs text-white">
                    “<span className="italic">{active?.triggerComment || "Can you send me the SYSTEM link please?"}</span>”{" "}
                    <span className="text-zinc-500">→</span> Matched:{" "}
                    <span className="font-mono text-[10px] bg-white/8 px-1.5 py-0.5 rounded text-[#ffb1c0] font-bold">
                      {active?.matchedKeyword || "SYSTEM"}
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-400 shrink-0">
                <span>Latency: <strong className="text-emerald-400 font-semibold">1.2s</strong></span>
                <span>•</span>
                <span className="text-[#ffb1c0]">100% automated</span>
              </div>
            </div>

            {/* Chat Conversation Scroll Area */}
            <div
              ref={scrollRef}
              className="p-5 flex flex-col gap-4 min-h-[420px] max-h-[500px] overflow-y-auto bg-[#0a0a0c] custom-scrollbar"
            >
              {/* Timestamp divider */}
              <div className="flex items-center justify-center my-1">
                <span className="px-3 py-1 rounded-full bg-white/6 text-zinc-400 font-mono text-[11px]">
                  Today, 2:41 PM
                </span>
              </div>

              {threadLoading && messages.length === 0 ? (
                <div className="py-12 text-center text-xs text-zinc-500 animate-pulse">
                  Loading thread messages…
                </div>
              ) : messages.length === 0 ? (
                <div className="py-12 text-center text-xs text-zinc-500">
                  No messages yet.
                </div>
              ) : (
                messages.map((m) => {
                  const isBot = m.isBot ?? (m.fromMe && !isTakenOver);

                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${m.fromMe ? "items-end self-end max-w-[85%]" : "items-start self-start max-w-[80%]"}`}
                    >
                      {/* Sender label & time */}
                      <div className={`flex items-center gap-1.5 text-xs text-zinc-400 mb-1 ${m.fromMe ? "pr-1" : "pl-1"}`}>
                        <span className="font-semibold text-[11px]">
                          {m.fromMe
                            ? isBot
                              ? "AUTOPILOT BOT"
                              : "@sarah.designs"
                            : active?.name || active?.contact.username || "User"}
                        </span>
                        <span>•</span>
                        <span className="font-mono text-[10px]">
                          {formatTime(m.createdTime, locale)}
                        </span>
                      </div>

                      {/* Bubble */}
                      <div
                        className={`p-4 rounded-2xl shadow-md text-sm leading-relaxed ${
                          m.fromMe
                            ? "bg-[#18181d] border border-white/8 text-white rounded-tr-xs"
                            : "bg-[#202028] border border-white/6 text-white rounded-tl-xs"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{m.text}</p>

                        {/* Embedded Link Preview Card if available */}
                        {m.linkCard && (
                          <div className="mt-3 rounded-xl bg-[#101014] border border-white/8 p-3 flex items-center gap-3 hover:border-white/16 transition-all shadow-inner">
                            <div className="w-10 h-10 rounded-lg bg-[#27272a] flex items-center justify-center shrink-0 shadow-sm text-pink-400">
                              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                              </svg>
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-semibold text-xs text-white truncate">
                                {m.linkCard.title}
                              </span>
                              <span className="font-mono text-[11px] text-[#ffb1c0] truncate">
                                {m.linkCard.url}
                              </span>
                              <span className="text-[10px] text-zinc-400 mt-0.5">
                                {m.linkCard.badge}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Message Delivery Status */}
                      {m.fromMe && (
                        <div className="flex items-center gap-1 font-mono text-[10px] text-zinc-400 mt-1 pr-1">
                          <span>Delivered</span>
                          <span>•</span>
                          <span className="text-emerald-400 font-semibold flex items-center gap-0.5">
                            Clicked
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}

              {/* Smart Bot Suggestions Action Chips */}
              <div className="flex flex-col gap-1.5 pt-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                  SMART BOT SUGGESTIONS:
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    "“You're welcome! Let me know if you need help”",
                    "“Share your feedback on Twitter/X”",
                    "“Check out Figma Community link”",
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => {
                        const cleanText = chip.replace(/[“”]/g, "");
                        void handleSend(cleanText);
                      }}
                      className="px-3 py-1.5 rounded-full bg-[#18181d] border border-white/8 hover:border-[#ff4c83]/50 text-xs text-zinc-300 hover:text-white transition-all shadow-sm cursor-pointer"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Message Reply Composer Bar */}
            <div className="p-4 bg-[#141417] flex flex-col gap-2 border-t border-white/6">
              <div className="flex items-center justify-between text-[11px] text-zinc-400 px-1">
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-[#ff4c83]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  Sending a manual message pauses automation for this contact for 24 hours.
                </span>
                <span className="font-mono">Typing as @sarah.designs</span>
              </div>

              {sendError && (
                <div className="text-xs text-rose-400 bg-rose-500/10 px-3 py-1.5 rounded-lg border border-rose-500/20">
                  {sendError}
                </div>
              )}

              <div className="flex items-center gap-2 bg-[#0c0c0e] p-2 rounded-xl border border-white/8 shadow-inner focus-within:border-[#ff4c83]/50 transition-colors">
                <div className="flex items-center gap-1 text-zinc-400 shrink-0">
                  <button
                    type="button"
                    title="Attach Image"
                    className="p-1.5 rounded-lg hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    title="Quick Templates"
                    className="p-1.5 rounded-lg hover:text-[#ffb1c0] hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <svg className="w-4 h-4 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    title="Insert Emoji"
                    className="p-1.5 rounded-lg hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                      <line x1="9" y1="9" x2="9.01" y2="9" />
                      <line x1="15" y1="9" x2="15.01" y2="9" />
                    </svg>
                  </button>
                </div>

                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Send direct message as @sarah.designs (pauses automation for 24h)..."
                  className="w-full bg-transparent text-white placeholder:text-zinc-500 text-xs outline-none px-2 py-1"
                />

                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={sending || !draft.trim()}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#833AB4] via-[#E1306C] to-[#F77737] hover:opacity-95 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shrink-0 transition-all disabled:opacity-40 cursor-pointer"
                >
                  <span>{sending ? "Sending…" : "Send DM"}</span>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" fill="currentColor" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* CRM & Automation Metric Ribbon (4 cards) */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-[#141417]/80 border border-white/8 shadow-md flex flex-col gap-1 backdrop-blur-md">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                ENGAGEMENT SCORE
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="font-mono text-xl font-bold text-white">
                  {active?.engagementScore || 94}
                  <span className="text-xs text-zinc-500 font-normal">/100</span>
                </span>
                <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  High Intent
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-white/10 mt-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-[#ff4c83]"
                  style={{ width: `${active?.engagementScore || 94}%` }}
                />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#141417]/80 border border-white/8 shadow-md flex flex-col gap-1 backdrop-blur-md">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                CAMPAIGNS TRIGGERED
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="font-mono text-xl font-bold text-white">
                  {active?.campaignsTriggered ? active.campaignsTriggered.split(",").length : 3} Flows
                </span>
                <svg className="w-4 h-4 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 3h5v5" />
                  <path d="M4 20L21 3" />
                  <path d="M21 16v5h-5" />
                  <path d="M15 15l6 6" />
                </svg>
              </div>
              <span className="font-mono text-[11px] text-zinc-400 mt-2 truncate">
                {active?.campaignsTriggered || "SYSTEM, NOTION, WEBINAR"}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#141417]/80 border border-white/8 shadow-md flex flex-col gap-1 backdrop-blur-md">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                LIFETIME CLICKS
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="font-mono text-xl font-bold text-[#ffb1c0]">
                  {active?.lifetimeClicks || 7} Clicks
                </span>
                <svg className="w-4 h-4 text-[#ff4c83]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="4" />
                </svg>
              </div>
              <span className="font-mono text-[11px] text-zinc-400 mt-2">
                100% CTR on delivered assets
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#141417]/80 border border-white/8 shadow-md flex flex-col gap-1 backdrop-blur-md">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                IG API LATENCY
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="font-mono text-xl font-bold text-emerald-400">
                  18ms
                </span>
                <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <span className="font-mono text-[11px] text-zinc-400 mt-2">
                Direct Webhook Connection
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
