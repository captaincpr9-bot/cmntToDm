"use client";

/* eslint-disable @next/next/no-img-element */

/**
 * Post Picker
 *
 * Grid of Instagram post thumbnails, selectable.
 * Fetches from /api/instagram/posts.
 */

import { useI18n } from "@/lib/i18n/provider";
import { useEffect, useState } from "react";
import { readCache, writeCache } from "@/lib/client-cache";

const PAGE_SIZE = 60;

interface InstagramPost {
  id: string;
  caption?: string;
  media_type: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp: string;
}

interface PostPickerProps {
  selectedPostId: string | null;
  instagramAccountId?: string | null;
  /** postId -> name of the campaign already using it. Flagged in the grid. */
  usedPostIds?: Record<string, string>;
  onSelect: (
    postId: string,
    postUrl?: string,
    thumbUrl?: string,
    caption?: string
  ) => void;
}

export default function PostPicker({
  selectedPostId,
  instagramAccountId,
  usedPostIds,
  onSelect,
}: PostPickerProps) {
  const { t } = useI18n();
  const [limitations, setLimitations] = useState<string[]>([]);
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  // The post currently hovered — its video (if it's a reel) plays a preview.
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  // The grid loads the whole library (all=true). On accounts with hundreds of
  // posts, rendering every tile at once is enough to make mobile Safari drop
  // the page, so they are revealed in batches.
  const [shown, setShown] = useState(PAGE_SIZE);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    if (instagramAccountId) {
      params.set("instagramAccountId", instagramAccountId);
    }
    // Load the full library so older posts/reels are selectable, not just the
    // most recent page.
    params.set("all", "true");

    // Show the cached library instantly (stale-while-revalidate), then refresh.
    const cacheKey = `ig-posts:${instagramAccountId ?? "default"}`;
    const cached = readCache<InstagramPost[]>(cacheKey, 15 * 60 * 1000);
    // Hydrating state from cache is a legitimate effect use here.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (cached.data) {
      setPosts(cached.data);
      setLoading(false);
    }
    /* eslint-enable react-hooks/set-state-in-effect */

    fetch(`/api/instagram/posts${params.size ? `?${params}` : ""}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.success) {
          setPosts(data.data);
          setLimitations(data.limitations ?? []);
          writeCache(cacheKey, data.data);
        } else if (!cached.data) {
          setError(data.error ?? "Failed to load posts");
        }
      })
      .catch(() => {
        if (!cancelled && !cached.data) setError("Failed to load posts");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [instagramAccountId]);

  if (loading) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="aspect-square rounded bg-surface" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted">{error === "Failed to load posts" ? t("Failed to load posts") : error}</p>
        <p className="text-xs text-zinc-500 mt-1">{t("Connect your Instagram account first")}</p>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted">{t("No posts found")}</p>
      </div>
    );
  }

  const matching = query.trim()
    ? posts.filter((p) =>
        (p.caption ?? "").toLowerCase().includes(query.trim().toLowerCase())
      )
    : posts;

  const visible = matching.slice(0, shown);
  const remaining = matching.length - visible.length;

  return (
    <div className="space-y-2.5">
      {limitations.map(note => <p key={note} className="text-xs text-zinc-400">{note}</p>)}
      <div className="flex items-center justify-between gap-2">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            // Back to one batch on every new search. Without this, a grid
            // expanded under an earlier query stays expanded once it is
            // cleared, which is the case this whole change exists to avoid.
            setShown(PAGE_SIZE);
          }}
          placeholder={t("Search your posts by caption…")}
          className="w-full rounded-xl border border-white/8 bg-[#0d0d10] px-3.5 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-[#ff4c83]/50 focus:outline-none transition-all"
        />
        <span className="shrink-0 text-xs font-mono text-zinc-400 bg-white/5 px-2 py-1 rounded-md border border-white/6">{posts.length}</span>
      </div>
      {visible.length === 0 ? (
        <p className="py-6 text-center text-sm text-zinc-400">
          {t("No posts match “")}{query}{t("”")}
        </p>
      ) : (
        <>
          {usedPostIds && Object.keys(usedPostIds).length > 0 && (
            <p className="flex items-center gap-1.5 px-1 text-[11px] text-zinc-400">
              <span className="inline-block h-2.5 w-2.5 rounded-sm border border-amber-500/50 bg-amber-500/10" />
              {t("Already used")}
            </p>
          )}
          {/* auto-rows-min + content-start keep each row at its natural height.
              Without them the rows share out max-h-64 instead of scrolling, and
              the square thumbnails flatten into strips. */}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-64 auto-rows-min content-start overflow-y-auto p-1 custom-scrollbar">
            {visible.map((post) => {
              const isSelected = selectedPostId === post.id;
              const usedByName = usedPostIds?.[post.id];
              const isUsed = Boolean(usedByName) && !isSelected;
              const thumb = post.thumbnail_url ?? post.media_url;
              const isVideo = post.media_type === "VIDEO";
              const showVideo =
                isVideo && hoveredId === post.id && Boolean(post.media_url);
              return (
          <button
            key={post.id}
            type="button"
            onClick={() => onSelect(post.id, post.permalink, thumb, post.caption)}
            onMouseEnter={() => setHoveredId(post.id)}
            onMouseLeave={() =>
              setHoveredId((cur) => (cur === post.id ? null : cur))
            }
            aria-pressed={isSelected}
            title={isUsed && usedByName ? t("Already used by \"{name}\"", { name: usedByName }) : undefined}
            className={`
              relative aspect-square rounded-xl overflow-hidden border-2 transition-all duration-150 cursor-pointer
              ${
                isSelected
                  ? "border-[#ff4c83] ring-2 ring-[#ff4c83]/30 shadow-md shadow-[#ff4c83]/20"
                  : isUsed
                    ? "border-amber-500/40 hover:border-amber-500/70"
                    : "border-white/8 hover:border-white/20 bg-[#141417]"
              }
            `}
          >
            {thumb ? (
              <img
                src={thumb}
                alt={post.caption?.slice(0, 50) ?? t("Instagram post")}
                loading="lazy"
                decoding="async"
                className={`w-full h-full object-cover transition-opacity ${isUsed ? "opacity-75" : ""}`}
              />
            ) : (
              <div className="w-full h-full bg-[#18181c] flex items-center justify-center">
                <span className="text-[11px] text-zinc-500">{t("No image")}</span>
              </div>
            )}
            {showVideo && (
              <video
                src={post.media_url}
                poster={thumb}
                autoPlay
                muted
                loop
                playsInline
                preload="none"
                className={`absolute inset-0 h-full w-full object-cover ${
                  isUsed ? "opacity-60" : ""
                }`}
              />
            )}
            {isSelected && (
              <span className="absolute bottom-0 inset-x-0 bg-gradient-to-r from-[#ff4c83] to-[#833ab4] text-white text-[10px] font-bold py-0.5 tracking-wider uppercase">
                {t("Selected")}
              </span>
            )}
          </button>
              );
            })}
          </div>
          {remaining > 0 && (
            <button
              type="button"
              onClick={() => setShown((n) => n + PAGE_SIZE)}
              className="w-full rounded-lg border border-border py-2 text-sm text-muted hover:text-foreground"
            >
              {t("Show")} {Math.min(PAGE_SIZE, remaining)} {t("more")}
            </button>
          )}
        </>
      )}
    </div>
  );
}
