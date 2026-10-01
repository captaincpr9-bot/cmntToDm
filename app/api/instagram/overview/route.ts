import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspaceId } from "@/lib/auth";
import { prisma } from "@/lib/db/client";
import { getWorkspaceInstagramAccount } from "@/lib/instagram-accounts";
import {
  getAllUserMedia,
  getMediaInsights,
  PermissionError,
  type InstagramMedia,
} from "@/lib/instagram/provider";
import { createInstagramContext } from "@/lib/instagram/provider";
import {
  ensureFollowerHistory,
  getFollowerHistory,
  type FollowerHistoryPoint,
} from "@/lib/reports/follower-history";

// Allow time for paginated media + per-post insight calls on larger accounts.
export const maxDuration = 60;

// Safety ceiling for "all time": bounds pagination and the number of
// per-media insight requests so we can't hammer the API or time out.
const MAX_POSTS = 500;

// How many insight requests to run at once.
const INSIGHTS_CONCURRENCY = 8;

/** Map over items with a bounded number of in-flight async operations. */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index], index);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () =>
    worker()
  );
  await Promise.all(workers);
  return results;
}

export interface OverviewPost {
  id: string;
  caption: string | null;
  permalink: string | null;
  thumbnailUrl: string | null;
  mediaType: string;
  timestamp: string;
  views: number | null;
  reach: number | null;
  likes: number;
  comments: number;
  saved: number | null;
  shares: number | null;
}

export interface OverviewResponse {
  account: { id: string; username: string };
  accounts: Array<{ id: string; username: string }>;
  requestedCount: "all" | number;
  truncated: boolean;
  insightsAvailable: boolean;
  /** Current follower total, or null if Instagram did not return it. */
  followers: number | null;
  /**
   * Follower total per day, ascending. Independent of the selected post range —
   * limited to what has been snapshotted plus any 30-day insights backfill.
   */
  followerHistory: FollowerHistoryPoint[];
  totals: {
    posts: number;
    views: number;
    reach: number;
    likes: number;
    comments: number;
    saved: number;
    shares: number;
    interactions: number;
  };
  posts: OverviewPost[];
  provider?: "META" | "ZERNIO";
  limitations?: string[];
}

function isVideoLike(media: InstagramMedia): boolean {
  return media.media_product_type === "REELS" || media.media_type === "VIDEO";
}

export async function GET(request: NextRequest) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) {
    if (process.env.NODE_ENV === "development") {
      return NextResponse.json({
        success: true,
        data: {
          account: { id: "mock-1", username: "sarah.designs" },
          accounts: [{ id: "mock-1", username: "sarah.designs" }],
          requestedCount: 50,
          truncated: false,
          insightsAvailable: true,
          followers: 48920,
          followerHistory: Array.from({ length: 30 }, (_, i) => {
            const d = new Date(Date.now() - (29 - i) * 86400000);
            return {
              date: d.toISOString().split("T")[0],
              followers: 45000 + i * 135 + Math.floor(Math.sin(i) * 50),
              delta: 120 + Math.floor(Math.random() * 40),
            };
          }),
          totals: {
            posts: 28,
            views: 1842500,
            reach: 942800,
            likes: 68420,
            comments: 18450,
            saved: 9240,
            shares: 6180,
            interactions: 102290,
          },
          posts: [
            {
              id: "post-1",
              caption: "Free Design System 2025 drop! Comment FIGMA to get direct access to the entire component library & tokens. 🚀",
              permalink: "https://instagram.com/p/DB123456",
              thumbnailUrl: null,
              mediaType: "VIDEO",
              timestamp: new Date(Date.now() - 2 * 86400000).toISOString(),
              views: 142000,
              reach: 98500,
              likes: 12400,
              comments: 4820,
              saved: 3200,
              shares: 1940,
            },
            {
              id: "post-2",
              caption: "How I closed $18.4k in freelance design projects this quarter. Drop 'PRICING' and I'll send my proposal deck.",
              permalink: "https://instagram.com/p/DB654321",
              thumbnailUrl: null,
              mediaType: "IMAGE",
              timestamp: new Date(Date.now() - 5 * 86400000).toISOString(),
              views: 96400,
              reach: 72100,
              likes: 8420,
              comments: 2940,
              saved: 2150,
              shares: 1120,
            },
            {
              id: "post-3",
              caption: "Notion Freelance OS is live! Stop managing client projects in chaotic spreadsheets. Comment 'OS' for instant copy.",
              permalink: "https://instagram.com/p/DB789012",
              thumbnailUrl: null,
              mediaType: "CAROUSEL_ALBUM",
              timestamp: new Date(Date.now() - 9 * 86400000).toISOString(),
              views: 64200,
              reach: 48900,
              likes: 5120,
              comments: 1890,
              saved: 1640,
              shares: 820,
            },
            {
              id: "post-4",
              caption: "Live masterclass Q&A with top agency founders. Comment 'JOIN' for VIP invite links & workbook PDF.",
              permalink: "https://instagram.com/p/DB901234",
              thumbnailUrl: null,
              mediaType: "VIDEO",
              timestamp: new Date(Date.now() - 14 * 86400000).toISOString(),
              views: 45200,
              reach: 34100,
              likes: 3840,
              comments: 1210,
              saved: 940,
              shares: 480,
            },
            {
              id: "post-5",
              caption: "Behind the scenes of our 2025 brand overhaul. Swipe to see the evolution.",
              permalink: "https://instagram.com/p/DB345678",
              thumbnailUrl: null,
              mediaType: "CAROUSEL_ALBUM",
              timestamp: new Date(Date.now() - 20 * 86400000).toISOString(),
              views: 38900,
              reach: 29400,
              likes: 2940,
              comments: 840,
              saved: 520,
              shares: 310,
            },
          ],
        },
      });
    }

    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const account = await getWorkspaceInstagramAccount(
    workspaceId,
    request.nextUrl.searchParams.get("instagramAccountId")
  );

  if (!account) {
    if (process.env.NODE_ENV === "development") {
      return NextResponse.json({
        success: true,
        data: {
          account: { id: "mock-1", username: "sarah.designs" },
          accounts: [{ id: "mock-1", username: "sarah.designs" }],
          requestedCount: 50,
          truncated: false,
          insightsAvailable: true,
          followers: 48920,
          followerHistory: Array.from({ length: 30 }, (_, i) => {
            const d = new Date(Date.now() - (29 - i) * 86400000);
            return {
              date: d.toISOString().split("T")[0],
              followers: 45000 + i * 135 + Math.floor(Math.sin(i) * 50),
              delta: 120 + Math.floor(Math.random() * 40),
            };
          }),
          totals: {
            posts: 28,
            views: 1842500,
            reach: 942800,
            likes: 68420,
            comments: 18450,
            saved: 9240,
            shares: 6180,
            interactions: 102290,
          },
          posts: [
            {
              id: "post-1",
              caption: "Free Design System 2025 drop! Comment FIGMA to get direct access to the entire component library & tokens. 🚀",
              permalink: "https://instagram.com/p/DB123456",
              thumbnailUrl: null,
              mediaType: "VIDEO",
              timestamp: new Date(Date.now() - 2 * 86400000).toISOString(),
              views: 142000,
              reach: 98500,
              likes: 12400,
              comments: 4820,
              saved: 3200,
              shares: 1940,
            },
            {
              id: "post-2",
              caption: "How I closed $18.4k in freelance design projects this quarter. Drop 'PRICING' and I'll send my proposal deck.",
              permalink: "https://instagram.com/p/DB654321",
              thumbnailUrl: null,
              mediaType: "IMAGE",
              timestamp: new Date(Date.now() - 5 * 86400000).toISOString(),
              views: 96400,
              reach: 72100,
              likes: 8420,
              comments: 2940,
              saved: 2150,
              shares: 1120,
            },
            {
              id: "post-3",
              caption: "Notion Freelance OS is live! Stop managing client projects in chaotic spreadsheets. Comment 'OS' for instant copy.",
              permalink: "https://instagram.com/p/DB789012",
              thumbnailUrl: null,
              mediaType: "CAROUSEL_ALBUM",
              timestamp: new Date(Date.now() - 9 * 86400000).toISOString(),
              views: 64200,
              reach: 48900,
              likes: 5120,
              comments: 1890,
              saved: 1640,
              shares: 820,
            },
          ],
        },
      });
    }

    return NextResponse.json(
      {
        success: false,
        error:
          "Instagram account not connected. Please connect your account first.",
      },
      { status: 400 }
    );
  }

  try {
    const accessToken = await createInstagramContext(account);

    // `count` is either "all" or a positive integer (last N posts).
    const countParam = request.nextUrl.searchParams.get("count");
    const isAll = countParam === "all";
    const parsedCount = countParam ? Number.parseInt(countParam, 10) : NaN;
    const requestedCount: "all" | number = isAll
      ? "all"
      : Number.isFinite(parsedCount)
        ? Math.max(parsedCount, 1)
        : 50;

    const target = isAll
      ? MAX_POSTS
      : Math.min(requestedCount as number, MAX_POSTS);

    const media = await getAllUserMedia({ context: accessToken, max: target });
    const truncated =
      media.length >= MAX_POSTS ||
      (account.provider === "ZERNIO" && media.length >= 25);

    // Likes and comments come free with basic media fields. Views / reach /
    // saved / shares require the insights permission, so fetch them per media
    // (bounded concurrency) and degrade gracefully if the token was granted
    // before that scope.
    let insightsAvailable = false;
    let permissionDenied = false;

    const insights = await mapWithConcurrency(
      media,
      INSIGHTS_CONCURRENCY,
      async (m) => {
        const metrics = isVideoLike(m)
          ? ["views", "reach", "saved", "shares", "total_interactions"]
          : ["reach", "saved", "shares", "total_interactions"];
        try {
          const data = await getMediaInsights({
            context: accessToken,
            mediaId: m.id,
            metrics: metrics,
          });
          insightsAvailable = true;
          return data;
        } catch (err) {
          if (err instanceof PermissionError) permissionDenied = true;
          return null;
        }
      }
    );

    const posts: OverviewPost[] = media.map((m, i) => {
      const ins = insights[i];
      const likes = m.like_count ?? 0;
      const comments = m.comments_count ?? 0;
      return {
        id: m.id,
        caption: m.caption?.trim().slice(0, 120) ?? null,
        permalink: m.permalink ?? null,
        thumbnailUrl: m.thumbnail_url ?? m.media_url ?? null,
        mediaType: m.media_product_type ?? m.media_type,
        timestamp: m.timestamp,
        views: ins?.views ?? null,
        reach: ins?.reach ?? null,
        likes,
        comments,
        saved: ins?.saved ?? null,
        shares: ins?.shares ?? null,
      };
    });

    const totals = posts.reduce(
      (acc, p) => {
        acc.posts += 1;
        acc.views += p.views ?? 0;
        acc.reach += p.reach ?? 0;
        acc.likes += p.likes;
        acc.comments += p.comments;
        acc.saved += p.saved ?? 0;
        acc.shares += p.shares ?? 0;
        acc.interactions +=
          p.likes + p.comments + (p.saved ?? 0) + (p.shares ?? 0);
        return acc;
      },
      {
        posts: 0,
        views: 0,
        reach: 0,
        likes: 0,
        comments: 0,
        saved: 0,
        shares: 0,
        interactions: 0,
      }
    );

    const accounts = await prisma.instagramAccount.findMany({
      where: { workspaceId },
      orderBy: { connectedAt: "desc" },
      select: { id: true, username: true },
    });

    // Followers is a point-in-time figure and deliberately not part of
    // `totals`, which sums over the selected posts. A failure here must not
    // take down the rest of the overview.
    let followers: number | null = null;
    let followerHistory: FollowerHistoryPoint[] = [];
    try {
      followers = await ensureFollowerHistory(
        { id: account.id, instagramId: account.instagramId },
        accessToken
      );
      followerHistory = await getFollowerHistory(account.id);
    } catch (err) {
      console.warn(
        "[Instagram Overview] Follower history unavailable:",
        err instanceof Error ? err.message : err
      );
    }

    const data: OverviewResponse = {
      account: { id: account.id, username: account.username },
      accounts,
      requestedCount,
      provider: account.provider,
      limitations:
        account.provider === "ZERNIO"
          ? [
              "Post reporting covers the 25 most recent Instagram posts.",
              "Insights and follower history require the Zernio Analytics add-on and reflect its last sync. Missing metrics remain unavailable.",
            ]
          : [],
      truncated,
      insightsAvailable: insightsAvailable && !permissionDenied,
      followers,
      followerHistory,
      totals,
      posts,
    };

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("[Instagram Overview] Error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to load Instagram overview" },
      { status: 500 }
    );
  }
}
