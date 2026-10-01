"use client";

/**
 * Campaign Builder
 *
 * Two-pane campaign editor: a control panel on the left and a live phone
 * preview on the right. Used for both creating and editing a campaign.
 *
 * Turn 1 wires the fully-functional pieces: trigger scope (specific / any /
 * next post), match mode (specific words / any word), the opening + reveal DM
 * text, public reply, and the tracked link. Button-driven delivery and the
 * follow / email / follow-up steps arrive in later turns.
 */

import { useI18n } from "@/lib/i18n/provider";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AccountSelect, { type AccountOption } from "@/components/account-select";
import PostPicker from "@/components/post-picker";
import KeywordInput from "@/components/keyword-input";
import CampaignPreview, { type PreviewTab } from "@/components/campaign-preview";
import { readCache, writeCache } from "@/lib/client-cache";
import {
  IMPORT_QUEUE_KEY,
  IMPORT_ACCOUNT_KEY,
  type ImportRow,
} from "@/lib/import-queue";

type TriggerScope = "specific" | "any" | "next";
type MatchMode = "specific" | "any";

interface LoadedCampaign {
  id: string;
  name: string;
  postId: string | null;
  postUrl: string | null;
  pendingNextReel: boolean;
  matchAnyPost: boolean;
  keywords: string[];
  matchAnyWord: boolean;
  dmTriggerEnabled: boolean;
  dmMessage: string;
  openingDmEnabled: boolean;
  openingDmMessage: string | null;
  openingDmButtonLabel: string | null;
  linkButtonLabel: string | null;
  requireFollow: boolean;
  followPromptMessage: string | null;
  followPromptButtonLabel: string | null;
  followUpEnabled: boolean;
  followUpMessage: string | null;
  followUpDelayMinutes: number | null;
  publicReplyEnabled: boolean;
  publicReplyMessage: string | null;
  publicReplyMessages: string[];
  isActive: boolean;
  instagramAccountId: string;
  trackedLinks?: { destinationUrl: string; label?: string | null }[];
}

interface CampaignBuilderProps {
  mode: "new" | "edit";
  campaignId?: string;
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4 rounded-2xl border border-white/8 bg-[#141417]/80 p-5 shadow-lg backdrop-blur-md transition-colors hover:border-white/12">
      <div className="border-b border-white/6 pb-3">
        <h2 className="text-sm font-semibold tracking-wide text-white">{title}</h2>
        {subtitle && <p className="text-xs text-zinc-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Radio({
  checked,
  onSelect,
  children,
}: {
  checked: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center gap-3.5 rounded-xl border p-3.5 text-left text-sm transition-all duration-150 cursor-pointer ${
        checked
          ? "border-[#ff4c83]/60 bg-gradient-to-r from-[#ff4c83]/10 via-[#833ab4]/10 to-transparent shadow-sm text-white"
          : "border-white/6 bg-[#0f0f12]/60 hover:bg-[#18181c] hover:border-white/12 text-zinc-300"
      }`}
    >
      <span
        className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border transition-colors ${
          checked
            ? "border-[#ff4c83] bg-[#ff4c83]"
            : "border-zinc-600 bg-transparent"
        }`}
      >
        {checked && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
      </span>
      <span className="flex-1 font-medium">{children}</span>
    </button>
  );
}

function Toggle({
  on,
  onToggle,
}: {
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        on ? "bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045]" : "bg-white/10"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
          on ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export default function CampaignBuilder({ mode, campaignId }: CampaignBuilderProps) {
  const { t } = useI18n();
  const router = useRouter();

  const [loading, setLoading] = useState(mode === "edit");
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);

  const [triggerScope, setTriggerScope] = useState<TriggerScope>("specific");
  const [postId, setPostId] = useState<string | null>(null);
  const [postUrl, setPostUrl] = useState<string | null>(null);
  const [postThumb, setPostThumb] = useState<string | null>(null);
  const [postCaption, setPostCaption] = useState("");

  // Post IDs already tied to another automation on this account, so the picker
  // can flag them and the user knows not to double-assign. Maps postId ->
  // the campaign name using it (for the tooltip).
  const [usedPosts, setUsedPosts] = useState<Record<string, string>>({});

  const [matchMode, setMatchMode] = useState<MatchMode>("specific");
  const [keywordText, setKeywordText] = useState("");
  const [dmTriggerEnabled, setDmTriggerEnabled] = useState(false);

  const [publicReplyEnabled, setPublicReplyEnabled] = useState(false);
  const [publicReplyMessages, setPublicReplyMessages] = useState<string[]>([""]);

  const [openingDmEnabled, setOpeningDmEnabled] = useState(false);
  const [openingDmMessage, setOpeningDmMessage] = useState("");
  const [openingDmButtonLabel, setOpeningDmButtonLabel] = useState("");

  const [dmMessage, setDmMessage] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);
  const [trackedDestinationUrl, setTrackedDestinationUrl] = useState("");
  const [linkButtonLabel, setLinkButtonLabel] = useState("Open link");
  const [secondLinkOpen, setSecondLinkOpen] = useState(false);
  const [secondaryDestinationUrl, setSecondaryDestinationUrl] = useState("");
  const [secondaryButtonLabel, setSecondaryButtonLabel] = useState("Open link");
  const [requireFollow, setRequireFollow] = useState(false);
  const [followPromptMessage, setFollowPromptMessage] = useState("");
  const [followPromptButtonLabel, setFollowPromptButtonLabel] =
    useState("i'm following");
  const [followUpEnabled, setFollowUpEnabled] = useState(false);
  const [followUpMessage, setFollowUpMessage] = useState("");
  const [followUpDelayMinutes, setFollowUpDelayMinutes] = useState(0);

  const [previewTab, setPreviewTab] = useState<PreviewTab>("dm");

  // CSV import queue. When present, each save advances to the next row instead
  // of returning to the campaigns list.
  const [importQueue, setImportQueue] = useState<ImportRow[] | null>(null);
  const [importTotal, setImportTotal] = useState(0);

  const keywords = useMemo(
    () =>
      keywordText
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean),
    [keywordText]
  );

  // Fetch the connected account's real avatar for the preview (cache-first so
  // it shows instantly on a return visit instead of a blank circle).
  useEffect(() => {
    if (!selectedAccountId) return;
    let cancelled = false;
    const cacheKey = `ig-avatar:${selectedAccountId}`;
    const cached = readCache<string | null>(cacheKey, 30 * 60 * 1000);
    // Hydrating state from cache is a legitimate effect use here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (cached.data !== null) setAvatarUrl(cached.data);

    const params = new URLSearchParams({ instagramAccountId: selectedAccountId });
    fetch(`/api/instagram/profile?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const url = d.success ? d.data.profilePictureUrl ?? null : null;
        setAvatarUrl(url);
        writeCache(cacheKey, url);
      })
      .catch(() => {
        if (!cancelled && cached.data === null) setAvatarUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedAccountId]);

  // Load accounts (both modes need them for the preview username + selector).
  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((r) => r.json())
      .then((payload) => {
        if (!payload.success) return;
        const next: AccountOption[] = payload.data.instagramAccounts ?? [];
        setAccounts(next);
        setSelectedAccountId(
          (prev) => prev || payload.data.selectedInstagramAccountId || next[0]?.id || ""
        );
      })
      .catch(() => setAccounts([]));
  }, []);

  // Prefill when editing.
  useEffect(() => {
    if (mode !== "edit" || !campaignId) return;
    fetch("/api/automations", { cache: "no-store" })
      .then((r) => r.json())
      .then((payload) => {
        if (!payload.success) return setNotFound(true);
        const c = (payload.data as LoadedCampaign[]).find((x) => x.id === campaignId);
        if (!c) return setNotFound(true);
        setName(c.name);
        setSelectedAccountId(c.instagramAccountId);
        setTriggerScope(
          c.matchAnyPost ? "any" : c.pendingNextReel ? "next" : "specific"
        );
        setPostId(c.postId);
        setPostUrl(c.postUrl);
        setMatchMode(c.matchAnyWord ? "any" : "specific");
        setKeywordText(c.keywords.join(", "));
        setDmTriggerEnabled(c.dmTriggerEnabled ?? false);
        setPublicReplyEnabled(c.publicReplyEnabled);
        setPublicReplyMessages(
          c.publicReplyMessages?.length
            ? c.publicReplyMessages
            : c.publicReplyMessage
              ? [c.publicReplyMessage]
              : [""]
        );
        setOpeningDmEnabled(c.openingDmEnabled);
        setOpeningDmMessage(c.openingDmMessage ?? "");
        setOpeningDmButtonLabel(c.openingDmButtonLabel ?? "");
        setDmMessage(c.dmMessage);
        setLinkButtonLabel(c.linkButtonLabel ?? "Open link");
        setIsActive(c.isActive);
        const link = c.trackedLinks?.[0]?.destinationUrl ?? "";
        setTrackedDestinationUrl(link);
        setLinkOpen(Boolean(link));
        const secondLink = c.trackedLinks?.[1];
        setSecondaryDestinationUrl(secondLink?.destinationUrl ?? "");
        setSecondaryButtonLabel(secondLink?.label ?? "Open link");
        setSecondLinkOpen(Boolean(secondLink?.destinationUrl));
        setRequireFollow(c.requireFollow ?? false);
        setFollowPromptMessage(c.followPromptMessage ?? "");
        setFollowPromptButtonLabel(
          c.followPromptButtonLabel ?? "i'm following"
        );
        setFollowUpEnabled(c.followUpEnabled ?? false);
        setFollowUpMessage(c.followUpMessage ?? "");
        setFollowUpDelayMinutes(c.followUpDelayMinutes ?? 0);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [mode, campaignId]);

  // Track which posts on the selected account are already assigned to an
  // automation, so the picker can highlight them. The campaign being edited is
  // excluded — its own post should read as selected, not "taken".
  useEffect(() => {
    if (!selectedAccountId) return;
    let cancelled = false;
    fetch("/api/automations", { cache: "no-store" })
      .then((r) => r.json())
      .then((payload) => {
        if (cancelled || !payload.success) return;
        const map: Record<string, string> = {};
        for (const a of payload.data as LoadedCampaign[]) {
          if (!a.postId) continue;
          if (a.instagramAccountId !== selectedAccountId) continue;
          if (mode === "edit" && a.id === campaignId) continue;
          map[a.postId] = a.name;
        }
        setUsedPosts(map);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [selectedAccountId, mode, campaignId]);

  // Prefill the editable fields from one queued import row. The reel is left
  // unset so the user picks it per row.
  function prefillFromRow(row: ImportRow) {
    setName(row.name ?? "");
    setTriggerScope("specific");
    setPostId(null);
    setPostUrl(null);
    setPostThumb(null);
    setPostCaption("");
    setMatchMode("specific");
    setKeywordText((row.keywords ?? []).join(", "));
    setDmMessage(row.dmMessage ?? "");
    setPublicReplyEnabled(Boolean(row.publicReply));
    setPublicReplyMessages(row.publicReply ? [row.publicReply] : [""]);
    const hasOpening = Boolean(row.openingDmMessage);
    setOpeningDmEnabled(hasOpening);
    setOpeningDmMessage(row.openingDmMessage ?? "");
    setOpeningDmButtonLabel(
      row.openingDmButtonLabel || (hasOpening ? "Send link" : "")
    );
    const link = row.trackedUrl ?? "";
    setTrackedDestinationUrl(link);
    setLinkOpen(Boolean(link));
    setError(null);
  }

  // Pick up a staged CSV import (new mode only) and prefill the first row.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (mode !== "new") return;
    try {
      const raw = window.localStorage.getItem(IMPORT_QUEUE_KEY);
      const acct = window.localStorage.getItem(IMPORT_ACCOUNT_KEY);
      if (!raw) return;
      const queue = JSON.parse(raw) as ImportRow[];
      if (!Array.isArray(queue) || queue.length === 0) return;
      setImportQueue(queue);
      setImportTotal(queue.length);
      if (acct) setSelectedAccountId(acct);
      prefillFromRow(queue[0]);
    } catch {
      // ignore a malformed queue
    }
  }, [mode]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const username =
    accounts.find((a) => a.id === selectedAccountId)?.username ?? "yourbrand";

  function handlePostSelect(
    id: string,
    url?: string,
    thumb?: string,
    caption?: string
  ) {
    setPostId(id);
    setPostUrl(url ?? null);
    setPostThumb(thumb ?? null);
    setPostCaption(caption ?? "");
  }

  function ensureLinkToken() {
    setDmMessage((cur) => (cur.includes("{link}") ? cur : `${cur.trim()} {link}`.trim()));
  }

  async function handleSubmit(activeValue: boolean) {
    setError(null);

    if (!selectedAccountId) return setError(t("Connect an Instagram account first."));
    if (triggerScope === "specific" && !postId)
      return setError(t("Pick a post or reel to trigger the campaign."));
    if (matchMode === "specific" && keywords.length === 0)
      return setError(t("Add at least one keyword, or switch to any word."));
    if (!dmMessage.trim()) return setError(t("Add the DM with the link."));
    if (openingDmEnabled && (!openingDmMessage.trim() || !openingDmButtonLabel.trim()))
      return setError(t("Your opening DM needs a message and a button label."));

    setSaving(true);

    const payload = {
      name: name.trim() || `Campaign for @${username}`,
      instagramAccountId: selectedAccountId,
      postId: triggerScope === "specific" ? postId : null,
      postUrl: triggerScope === "specific" ? postUrl : null,
      matchAnyPost: triggerScope === "any",
      pendingNextReel: triggerScope === "next",
      matchAnyWord: matchMode === "any",
      keywords: matchMode === "any" ? [] : keywords,
      dmTriggerEnabled,
      dmMessage,
      openingDmEnabled,
      openingDmMessage: openingDmEnabled ? openingDmMessage : null,
      openingDmButtonLabel: openingDmEnabled ? openingDmButtonLabel : null,
      publicReplyEnabled,
      publicReplyMessages: publicReplyEnabled
        ? publicReplyMessages.map((m) => m.trim()).filter(Boolean)
        : [],
      trackedDestinationUrl: trackedDestinationUrl.trim() || "",
      linkButtonLabel: linkButtonLabel.trim() || "Open link",
      secondaryDestinationUrl: secondaryDestinationUrl.trim() || "",
      secondaryButtonLabel: secondaryButtonLabel.trim() || "Open link",
      requireFollow,
      followPromptMessage: requireFollow ? followPromptMessage.trim() : "",
      followPromptButtonLabel: requireFollow
        ? followPromptButtonLabel.trim() || "i'm following"
        : "",
      followUpEnabled,
      followUpMessage: followUpEnabled ? followUpMessage.trim() : "",
      followUpDelayMinutes: followUpEnabled ? followUpDelayMinutes : 0,
      isActive: activeValue,
    };

    try {
      const res =
        mode === "new"
          ? await fetch("/api/automations", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            })
          : await fetch(`/api/automations?id=${campaignId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
      const data = await res.json();
      if (data.success) {
        // The post we just assigned is now in use. Reflect it immediately so
        // the picker flags it on the next imported row — the fetch that builds
        // this map doesn't re-run while the builder stays mounted through the
        // import queue.
        if (triggerScope === "specific" && postId) {
          const assignedPostId = postId;
          setUsedPosts((prev) => ({ ...prev, [assignedPostId]: payload.name }));
        }
        // Importing: advance to the next queued row instead of leaving.
        if (importQueue && importQueue.length > 1) {
          const remaining = importQueue.slice(1);
          try {
            window.localStorage.setItem(
              IMPORT_QUEUE_KEY,
              JSON.stringify(remaining)
            );
          } catch {
            // ignore
          }
          setImportQueue(remaining);
          prefillFromRow(remaining[0]);
          setSaving(false);
          if (typeof window !== "undefined") window.scrollTo({ top: 0 });
          return;
        }
        if (importQueue) {
          try {
            window.localStorage.removeItem(IMPORT_QUEUE_KEY);
            window.localStorage.removeItem(IMPORT_ACCOUNT_KEY);
          } catch {
            // ignore
          }
        }
        // refresh() busts the router cache so the list reflects the save
        // instead of landing on a stale (empty) campaigns page.
        router.push("/campaigns");
        router.refresh();
      } else {
        // Surface the specific field that failed validation instead of a
        // generic "Invalid input".
        const fieldErrors = data.details?.fieldErrors as
          | Record<string, string[]>
          | undefined;
        const firstField = fieldErrors && Object.keys(fieldErrors)[0];
        setError(
          firstField
            ? `${firstField}: ${fieldErrors[firstField][0]}`
            : data.error ?? t("Failed to save campaign")
        );
        if (typeof window !== "undefined")
          window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch {
      setError(t("Failed to save campaign"));
    } finally {
      setSaving(false);
    }
  }

  // Skip the current imported row without saving a campaign for it, advancing
  // to the next one (or finishing the import if it was the last).
  function skipRow() {
    if (!importQueue) return;
    setError(null);
    if (importQueue.length > 1) {
      const remaining = importQueue.slice(1);
      try {
        window.localStorage.setItem(IMPORT_QUEUE_KEY, JSON.stringify(remaining));
      } catch {
        // ignore
      }
      setImportQueue(remaining);
      prefillFromRow(remaining[0]);
      if (typeof window !== "undefined") window.scrollTo({ top: 0 });
      return;
    }
    // Last row skipped — finish the import.
    try {
      window.localStorage.removeItem(IMPORT_QUEUE_KEY);
      window.localStorage.removeItem(IMPORT_ACCOUNT_KEY);
    } catch {
      // ignore
    }
    router.push("/campaigns");
    router.refresh();
  }

  if (loading) {
    return <div className="panel h-64 rounded" />;
  }

  if (notFound) {
    return (
      <div className="panel rounded p-8 text-center">
        <p className="text-sm text-muted">{t("Campaign not found.")}</p>
        <button
          onClick={() => router.push("/campaigns")}
          className="mt-4 rounded border border-border px-4 py-2 text-sm text-muted hover:text-foreground"
        >
          {t("Back to campaigns")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {importQueue && (
        <div className="rounded-2xl border border-[#ff4c83]/30 bg-[#ff4c83]/10 p-4 text-sm shadow-md">
          <span className="font-semibold text-white">
            {t("Importing {current} of {total}.", { current: importTotal - importQueue.length + 1, total: importTotal })}
          </span>{" "}
          <span className="text-zinc-300">
            {t("Fields are prefilled from your CSV. Pick the reel, edit anything, and save to load the next one — or Skip if you don’t want this one.")}
          </span>
        </div>
      )}

      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 pb-2 border-b border-white/6">
        <div className="flex min-w-0 items-center gap-3">
          {mode === "edit" ? (
            <>
              <span className="truncate text-base font-semibold text-white">
                {name || t("Untitled campaign")}
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  isActive
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                    : "bg-zinc-500/15 text-zinc-400 border border-zinc-500/20"
                }`}
              >
                {isActive ? t("LIVE") : t("PAUSED")}
              </span>
            </>
          ) : (
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-white tracking-tight">{t("New campaign")}</span>
                <span className="rounded-full bg-[#ff4c83]/15 border border-[#ff4c83]/30 px-2 py-0.5 text-[10px] font-semibold text-[#ffb1c0]">
                  STITCH BUILDER
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Configure comment triggers, keyword matching, and automated DM delivery
              </p>
            </div>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2.5">
          {importQueue && (
            <button
              type="button"
              onClick={skipRow}
              disabled={saving}
              className="rounded-xl border border-white/10 bg-[#141417] px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white hover:border-white/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              {importQueue.length > 1 ? t("Skip") : t("Skip & finish")}
            </button>
          )}
          {mode === "edit" &&
            (isActive ? (
              <button
                type="button"
                onClick={() => handleSubmit(false)}
                disabled={saving}
                className="rounded-xl border border-white/10 bg-[#141417] px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white hover:border-white/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                {t("Stop")}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSubmit(true)}
                disabled={saving}
                className="rounded-xl border border-white/10 bg-[#141417] px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white hover:border-white/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                {t("Go Live")}
              </button>
            ))}
          <button
            type="button"
            onClick={() => handleSubmit(mode === "new" ? true : isActive)}
            disabled={saving}
            className="rounded-xl bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-[#ff4c83]/20 hover:opacity-95 active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
          >
            {saving ? t("Saving…") : mode === "new" ? t("Go Live") : t("Save changes")}
          </button>
        </div>
      </div>

      {/* Grid: 1fr on left for builder cards, fixed 360px on right for phone preview */}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:gap-8 items-start">
        {/* Left: controls */}
        <div className="space-y-6 min-w-0">
          {error && (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3.5 text-sm text-rose-300 shadow-sm">
              {error}
            </div>
          )}

          {/* Campaign Details Card */}
          <div className="space-y-4 rounded-2xl border border-white/8 bg-[#141417]/80 p-5 shadow-lg backdrop-blur-md">
            <div className="border-b border-white/6 pb-3">
              <h2 className="text-sm font-semibold tracking-wide text-white">Campaign Details</h2>
              <p className="text-xs text-zinc-400 mt-0.5">Set campaign identification and linked Instagram account</p>
            </div>
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                  {t("Campaign name")}{" "}
                  <span className="font-normal lowercase text-zinc-500">{t("(optional)")}</span>
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("e.g. YC referral")}
                  className="w-full rounded-xl border border-white/8 bg-[#0d0d10] px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-[#ff4c83]/50 focus:ring-1 focus:ring-[#ff4c83]/30 focus:outline-none transition-all"
                  maxLength={100}
                />
              </div>
              {accounts.length > 1 && (
                <div className="pt-1">
                  <AccountSelect
                    accounts={accounts}
                    value={selectedAccountId}
                    onChange={(id) => {
                      setSelectedAccountId(id);
                      setPostId(null);
                      setPostUrl(null);
                      setPostThumb(null);
                    }}
                    includeAll={false}
                    label={t("Instagram account")}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Post Trigger Section */}
          <Section
            title={t("When someone comments on")}
            subtitle="Select which posts or reels trigger this automation flow"
          >
            <Radio
              checked={triggerScope === "specific"}
              onSelect={() => setTriggerScope("specific")}
            >
              {t("a specific post or reel")}
            </Radio>
            {triggerScope === "specific" && (
              <div className="rounded-xl border border-white/8 bg-[#0d0d10]/80 p-3 mt-2">
                <PostPicker
                  selectedPostId={postId}
                  instagramAccountId={selectedAccountId}
                  usedPostIds={usedPosts}
                  onSelect={handlePostSelect}
                />
              </div>
            )}
            <Radio
              checked={triggerScope === "any"}
              onSelect={() => setTriggerScope("any")}
            >
              {t("any post or reel")}
            </Radio>
            <Radio
              checked={triggerScope === "next"}
              onSelect={() => setTriggerScope("next")}
            >
              {t("next post or reel")}
            </Radio>
          </Section>

          {/* Keyword Matching Section */}
          <Section
            title={t("And this comment has")}
            subtitle="Choose exact keyword matching or trigger on every single incoming comment"
          >
            <Radio
              checked={matchMode === "specific"}
              onSelect={() => setMatchMode("specific")}
            >
              {t("a specific word or words")}
            </Radio>
            {matchMode === "specific" && (
              <div className="pt-1 pb-1">
                <KeywordInput
                  keywords={keywords}
                  onChange={(updated) => setKeywordText(updated.join(", "))}
                  max={10}
                />
              </div>
            )}
            <Radio
              checked={matchMode === "any"}
              onSelect={() => setMatchMode("any")}
            >
              {t("any word")}
            </Radio>

            <div className="rounded-xl border border-white/8 bg-[#0f0f12]/60 p-3.5 transition-colors hover:border-white/12">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-zinc-200">
                  {t("also reply when someone DMs")}{" "}
                  {matchMode === "any" ? t("anything") : t("these words")}
                </span>
                <Toggle
                  on={dmTriggerEnabled}
                  onToggle={() => setDmTriggerEnabled(!dmTriggerEnabled)}
                />
              </div>
              {dmTriggerEnabled && (
                <p className="mt-2 text-xs text-zinc-400">
                  {matchMode === "any"
                    ? t("Every DM to this account gets the reply below — use with care.")
                    : t("A DM containing any of these words gets the same reply, no comment needed.")}
                </p>
              )}
            </div>

            <div className="rounded-xl border border-white/8 bg-[#0f0f12]/60 p-3.5 transition-colors hover:border-white/12 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-200">
                  {t("reply to their comments under the post")}
                </span>
                <Toggle
                  on={publicReplyEnabled}
                  onToggle={() => setPublicReplyEnabled(!publicReplyEnabled)}
                />
              </div>
              {publicReplyEnabled && (
                <div className="space-y-2.5 pt-1">
                  {publicReplyMessages.map((msg, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        value={msg}
                        onChange={(e) =>
                          setPublicReplyMessages((prev) =>
                            prev.map((m, idx) => (idx === i ? e.target.value : m))
                          )
                        }
                        placeholder={t("Sent you a DM! 📩")}
                        maxLength={1000}
                        className="w-full rounded-xl border border-white/8 bg-[#0d0d10] px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-[#ff4c83]/50 focus:outline-none transition-all"
                      />
                      {publicReplyMessages.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setPublicReplyMessages((prev) =>
                              prev.filter((_, idx) => idx !== i)
                            )
                          }
                          className="shrink-0 p-2 text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer"
                          aria-label={t("Remove reply")}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  {publicReplyMessages.length < 10 && (
                    <button
                      type="button"
                      onClick={() =>
                        setPublicReplyMessages((prev) => [...prev, ""])
                      }
                      className="text-xs font-semibold text-[#ff4c83] hover:text-[#ff80a6] transition-colors cursor-pointer"
                    >
                      {t("+ Add another reply")}
                    </button>
                  )}
                  <p className="text-[11px] text-zinc-400">
                    {t("One is picked at random each time, so replies don't look identical.")}
                  </p>
                </div>
              )}
            </div>
          </Section>

          {/* DM Conversation Opening Section */}
          <Section
            title={t("They will get")}
            subtitle="Configure conversational opening messages or follow verification gates"
          >
            <div className="rounded-xl border border-white/8 bg-[#0f0f12]/60 p-4 transition-colors hover:border-white/12 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-white block">{t("an opening DM")}</span>
                  <span className="text-xs text-zinc-400">Starts conversation with interactive confirmation button</span>
                </div>
                <Toggle
                  on={openingDmEnabled}
                  onToggle={() => setOpeningDmEnabled(!openingDmEnabled)}
                />
              </div>
              {openingDmEnabled && (
                <div className="space-y-2.5 pt-1">
                  <textarea
                    value={openingDmMessage}
                    onChange={(e) => setOpeningDmMessage(e.target.value)}
                    placeholder={t("Hey there! I'm so happy you're here 😊")}
                    rows={3}
                    className="w-full rounded-xl border border-white/8 bg-[#0d0d10] px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-[#ff4c83]/50 focus:outline-none resize-none transition-all"
                    maxLength={1000}
                  />
                  <input
                    value={openingDmButtonLabel}
                    onChange={(e) => setOpeningDmButtonLabel(e.target.value)}
                    placeholder={t("Send me the link")}
                    className="w-full rounded-xl border border-white/8 bg-[#0d0d10] px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-[#ff4c83]/50 focus:outline-none transition-all"
                    maxLength={64}
                  />
                </div>
              )}
            </div>

            <div className="rounded-xl border border-white/8 bg-[#0f0f12]/60 p-4 transition-colors hover:border-white/12 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-white block">
                    {t("a follow requirement first")}
                  </span>
                  <span className="text-xs text-zinc-400">Gate the valuable link until user follows your profile</span>
                </div>
                <Toggle
                  on={requireFollow}
                  onToggle={() => setRequireFollow(!requireFollow)}
                />
              </div>
              {requireFollow && (
                <div className="space-y-2.5 pt-1">
                  <textarea
                    value={followPromptMessage}
                    onChange={(e) => setFollowPromptMessage(e.target.value)}
                    placeholder={t("quick favor before i send your link. i don't make any money from this, it's free. if you want to support me, just don't unfollow after, and star the repo on github if it helps you. tap the button once you're following and i'll send it over")}
                    rows={3}
                    className="w-full rounded-xl border border-white/8 bg-[#0d0d10] px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-[#ff4c83]/50 focus:outline-none resize-none transition-all"
                    maxLength={1000}
                  />
                  <input
                    value={followPromptButtonLabel}
                    onChange={(e) => setFollowPromptButtonLabel(e.target.value)}
                    placeholder={t("i'm following")}
                    className="w-full rounded-xl border border-white/8 bg-[#0d0d10] px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-[#ff4c83]/50 focus:outline-none transition-all"
                    maxLength={20}
                  />
                  <p className="text-[11px] text-zinc-400">
                    {t("We send the link only after they tap the button and Instagram confirms the follow. If it can't be verified, we send it anyway.")}
                  </p>
                </div>
              )}
            </div>
          </Section>

          {/* DM Delivery & Links Section */}
          <Section
            title={t("And then, they will get")}
            subtitle="The primary message containing tracked resource links and follow-up sequence"
          >
            <div className="rounded-xl border border-white/8 bg-[#0f0f12]/60 p-4 transition-colors hover:border-white/12 space-y-3">
              <span className="text-sm font-medium text-white block">{t("a DM with a link")}</span>
              <textarea
                value={dmMessage}
                onChange={(e) => setDmMessage(e.target.value)}
                placeholder={t("Write a message")}
                rows={3}
                className="w-full rounded-xl border border-white/8 bg-[#0d0d10] px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-[#ff4c83]/50 focus:outline-none resize-none transition-all"
                maxLength={1000}
              />
              {linkOpen ? (
                <div className="space-y-2.5 pt-1">
                  <input
                    value={trackedDestinationUrl}
                    onChange={(e) => setTrackedDestinationUrl(e.target.value)}
                    onBlur={ensureLinkToken}
                    placeholder="https://yourlink.com/offer"
                    className="w-full rounded-xl border border-white/8 bg-[#0d0d10] px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-[#ff4c83]/50 focus:outline-none transition-all"
                  />
                  <input
                    value={linkButtonLabel}
                    onChange={(e) => setLinkButtonLabel(e.target.value)}
                    placeholder={t("Button label (e.g. Open link)")}
                    maxLength={20}
                    className="w-full rounded-xl border border-white/8 bg-[#0d0d10] px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-[#ff4c83]/50 focus:outline-none transition-all"
                  />
                  {secondLinkOpen ? (
                    <div className="space-y-2.5 border-t border-white/6 pt-2.5">
                      <input
                        value={secondaryDestinationUrl}
                        onChange={(e) => setSecondaryDestinationUrl(e.target.value)}
                        placeholder="https://yourlink.com/second"
                        className="w-full rounded-xl border border-white/8 bg-[#0d0d10] px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-[#ff4c83]/50 focus:outline-none transition-all"
                      />
                      <input
                        value={secondaryButtonLabel}
                        onChange={(e) => setSecondaryButtonLabel(e.target.value)}
                        placeholder={t("Second button label")}
                        maxLength={20}
                        className="w-full rounded-xl border border-white/8 bg-[#0d0d10] px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-[#ff4c83]/50 focus:outline-none transition-all"
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSecondLinkOpen(true)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 py-2 text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      {t("+ Add A Second Link")}
                    </button>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setLinkOpen(true)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-2 text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  {t("+ Add A Link")}
                </button>
              )}
              <p className="text-[11px] text-zinc-400">
                <span className="font-mono text-[#ffb1c0]">{"{link}"}</span> {t("inserts the tracked link;")} <span className="font-mono text-[#ffb1c0]">{"{username}"}</span> {t("personalizes.")}
              </p>
            </div>

            <div className="rounded-xl border border-white/8 bg-[#0f0f12]/60 p-4 transition-colors hover:border-white/12 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-white block">
                    {t("a follow-up thank-you message")}
                  </span>
                  <span className="text-xs text-zinc-400">Scheduled retention touchpoint after user visits link</span>
                </div>
                <Toggle
                  on={followUpEnabled}
                  onToggle={() => setFollowUpEnabled(!followUpEnabled)}
                />
              </div>
              {followUpEnabled && (
                <div className="space-y-2.5 pt-1">
                  <textarea
                    value={followUpMessage}
                    onChange={(e) => setFollowUpMessage(e.target.value)}
                    placeholder={t("Btw just wanted to say thanks for following me, I appreciate the support 🙌")}
                    rows={3}
                    className="w-full rounded-xl border border-white/8 bg-[#0d0d10] px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-[#ff4c83]/50 focus:outline-none resize-none transition-all"
                    maxLength={1000}
                  />
                  <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-200">
                    <span className="text-xs text-zinc-400">{t("Send it")}</span>
                    <input
                      type="number"
                      min={0}
                      max={1440}
                      value={followUpDelayMinutes}
                      onChange={(e) =>
                        setFollowUpDelayMinutes(
                          Math.max(0, Math.min(1440, Math.floor(Number(e.target.value) || 0)))
                        )
                      }
                      className="w-20 rounded-xl border border-white/8 bg-[#0d0d10] px-2.5 py-1 text-sm font-mono text-white focus:border-[#ff4c83]/50 focus:outline-none"
                    />
                    <span className="text-xs text-zinc-400">
                      {t("minutes after the link")}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    {followUpDelayMinutes > 0
                      ? t("Sent {minutes} min after they tap through.", { minutes: followUpDelayMinutes })
                      : t("Sent right after they tap through.")}
                    {" "}<span className="font-mono text-[#ffb1c0]">{"{username}"}</span> {t("personalizes it. Max 24 hours, to stay inside Instagram's messaging window.")}
                  </p>
                </div>
              )}
            </div>
          </Section>
        </div>

        {/* Right: phone preview */}
        <div className="min-w-0">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{t("Preview")}</span>
            <span className="text-[11px] text-zinc-500 font-mono">iPhone 17 Pro</span>
          </div>
          <div className="flex min-w-0 justify-center lg:sticky lg:top-6 lg:block">
            <CampaignPreview
              tab={previewTab}
              onTabChange={setPreviewTab}
              username={username}
              avatarUrl={avatarUrl}
              postThumb={postThumb}
              caption={postCaption}
              sampleComment={keywords[0] ?? ""}
              dmTriggerEnabled={dmTriggerEnabled}
              publicReplyEnabled={publicReplyEnabled}
              publicReplyMessage={publicReplyMessages.find((m) => m.trim()) ?? ""}
              openingDmEnabled={openingDmEnabled}
              openingDmMessage={openingDmMessage}
              openingDmButtonLabel={openingDmButtonLabel}
              revealMessage={dmMessage}
              hasLink={Boolean(trackedDestinationUrl.trim())}
              linkButtonLabel={linkButtonLabel || "Open link"}
              linkUrl={trackedDestinationUrl.trim() || undefined}
              hasSecondLink={
                secondLinkOpen && Boolean(secondaryDestinationUrl.trim())
              }
              secondLinkButtonLabel={secondaryButtonLabel || "Open link"}
              requireFollow={requireFollow}
              followPromptMessage={followPromptMessage}
              followPromptButtonLabel={followPromptButtonLabel || "i'm following"}
              followUpEnabled={followUpEnabled}
              followUpMessage={followUpMessage}
              followUpDelayMinutes={followUpDelayMinutes}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
