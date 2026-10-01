import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspaceId } from "@/lib/auth";
import { getWorkspaceInstagramAccount } from "@/lib/instagram-accounts";
import {
  getConversations,
  sendDirectMessage,
  MetaApiError,
} from "@/lib/instagram/provider";
import { createInstagramContext } from "@/lib/instagram/provider";

export interface ConversationListItem {
  id: string;
  detailsUnavailable?: boolean;
  contact: { id: string; username: string | null };
  updatedTime: string | null;
  lastMessage: {
    text: string;
    fromMe: boolean;
    createdTime: string | null;
  } | null;
  name?: string;
  avatarUrl?: string;
  followerCount?: string;
  isVerified?: boolean;
  triggerEvent?: string;
  matchedKeyword?: string;
  triggerComment?: string;
  status?: "bot_delivered" | "needs_reply" | "link_clicked" | "read";
  channel?: "all" | "comments" | "story_replies" | "direct_dms";
  unread?: boolean;
  followGatePassed?: boolean;
  engagementScore?: number;
  campaignsTriggered?: string;
  lifetimeClicks?: number;
}

export interface ConversationsResponse {
  conversations: ConversationListItem[];
  account: { id: string; username: string; instagramId: string };
}

export const DEV_MOCK_CONVERSATIONS: ConversationListItem[] = [
  {
    id: "conv-1",
    contact: { id: "user_alex_ui", username: "alex_ui" },
    name: "Alex Rivera",
    followerCount: "14.2k",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    isVerified: true,
    triggerEvent: "Reel #104 Comment",
    triggerComment: "Can you send me the SYSTEM link please?",
    matchedKeyword: "SYSTEM",
    updatedTime: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    lastMessage: {
      text: "Thanks so much! Just downloaded the kit, the token naming convention is incredible 🔥",
      fromMe: false,
      createdTime: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    },
    status: "bot_delivered",
    channel: "comments",
    unread: false,
    followGatePassed: true,
    engagementScore: 94,
    campaignsTriggered: "SYSTEM, NOTION, WEBINAR",
    lifetimeClicks: 7,
  },
  {
    id: "conv-2",
    contact: { id: "user_marta_dev", username: "marta_dev" },
    name: "Marta Chen",
    followerCount: "2.4k",
    avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
    isVerified: false,
    triggerEvent: "Story Reply",
    triggerComment: "Is there a version for teams?",
    matchedKeyword: "NOTION",
    updatedTime: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
    lastMessage: {
      text: "Is there a version for teams?",
      fromMe: false,
      createdTime: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
    },
    status: "needs_reply",
    channel: "story_replies",
    unread: true,
    followGatePassed: false,
    engagementScore: 78,
    campaignsTriggered: "NOTION",
    lifetimeClicks: 2,
  },
  {
    id: "conv-3",
    contact: { id: "user_lucas_ux", username: "lucas_ux" },
    name: "Lucas UX",
    followerCount: "3.1k",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    isVerified: false,
    triggerEvent: "Story Mention",
    triggerComment: "Check out this creator's pricing framework!",
    matchedKeyword: "PRICING",
    updatedTime: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
    lastMessage: {
      text: "Automated DM sent: Here is your Client Pricing PDF...",
      fromMe: true,
      createdTime: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
    },
    status: "bot_delivered",
    channel: "story_replies",
    unread: false,
    followGatePassed: true,
    engagementScore: 88,
    campaignsTriggered: "PRICING",
    lifetimeClicks: 4,
  },
  {
    id: "conv-4",
    contact: { id: "user_chloe_creates", username: "chloe_creates" },
    name: "Chloe Creates",
    followerCount: "28.5k",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    isVerified: true,
    triggerEvent: "Reel #102 Comment",
    triggerComment: "GROWTH please!",
    matchedKeyword: "GROWTH",
    updatedTime: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    lastMessage: {
      text: "Clicked link: /growth-masterclass",
      fromMe: true,
      createdTime: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    },
    status: "link_clicked",
    channel: "comments",
    unread: false,
    followGatePassed: true,
    engagementScore: 99,
    campaignsTriggered: "GROWTH, WEBINAR",
    lifetimeClicks: 12,
  },
  {
    id: "conv-5",
    contact: { id: "user_dev_sam", username: "dev_sam" },
    name: "Sam Developer",
    followerCount: "950",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    isVerified: false,
    triggerEvent: "Direct DM",
    triggerComment: "Hey! Loved the reel on design systems",
    matchedKeyword: "SYSTEM",
    updatedTime: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
    lastMessage: {
      text: "Hey! Loved the reel on design systems",
      fromMe: false,
      createdTime: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
    },
    status: "read",
    channel: "direct_dms",
    unread: false,
    followGatePassed: true,
    engagementScore: 65,
    campaignsTriggered: "SYSTEM",
    lifetimeClicks: 1,
  },
];

// List the account's DM conversations for the inbox.
export async function GET(request: NextRequest) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) {
    if (process.env.NODE_ENV === "development") {
      return NextResponse.json({
        success: true,
        data: {
          conversations: DEV_MOCK_CONVERSATIONS,
          account: {
            id: "ig-acc-1",
            username: "sarah.designs",
            instagramId: "17841405309211885",
          },
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
          conversations: DEV_MOCK_CONVERSATIONS,
          account: {
            id: "ig-acc-1",
            username: "sarah.designs",
            instagramId: "17841405309211885",
          },
        },
      });
    }
    return NextResponse.json(
      { success: false, error: "Instagram account not connected." },
      { status: 400 }
    );
  }

  try {
    const accessToken = await createInstagramContext(account);
    const raw = await getConversations({
      context: accessToken,
      igUserId: account.instagramId,
    });

    const conversations: ConversationListItem[] = raw.map((c) => {
      const participants = c.participants?.data ?? [];
      const contact =
        participants.find((p) => p.id !== account.instagramId) ?? null;
      const last = c.messages?.data?.[0] ?? null;

      return {
        id: c.id,
        detailsUnavailable: c.detailsUnavailable,
        contact: {
          id: contact?.id ?? "",
          username: contact?.username ?? null,
        },
        updatedTime: c.updated_time ?? null,
        lastMessage: last
          ? {
              text: last.message ?? "",
              fromMe: last.from?.id === account.instagramId,
              createdTime: last.created_time ?? null,
            }
          : null,
      };
    });

    const data: ConversationsResponse = {
      conversations,
      account: {
        id: account.id,
        username: account.username,
        instagramId: account.instagramId,
      },
    };
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("[Conversations] Error:", err);
    const message =
      err instanceof MetaApiError
        ? err.message
        : "Failed to load conversations";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) {
    if (process.env.NODE_ENV === "development") {
      let body: { text?: string; recipientId?: string } = {};
      try {
        body = await request.json();
      } catch {}
      return NextResponse.json({
        success: true,
        data: { messageId: `dev-msg-${Date.now()}`, text: body.text },
      });
    }
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  let body: {
    instagramAccountId?: string;
    recipientId?: string;
    text?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }

  const text = body.text?.trim();
  if (!body.recipientId || !text) {
    return NextResponse.json(
      { success: false, error: "A recipient and message are required." },
      { status: 400 }
    );
  }

  const account = await getWorkspaceInstagramAccount(
    workspaceId,
    body.instagramAccountId ?? null
  );
  if (!account) {
    return NextResponse.json(
      { success: false, error: "Instagram account not connected." },
      { status: 400 }
    );
  }

  try {
    const accessToken = await createInstagramContext(account);
    const result = await sendDirectMessage({
      context: accessToken,
      instagramAccountId: account.instagramId,
      userId: body.recipientId,
      message: text,
    });
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error("[Conversations] Send error:", err);
    // Surface Meta's own message — the common case is the 24-hour messaging
    // window having closed, which the user needs to see explicitly.
    const message =
      err instanceof MetaApiError ? err.message : "Failed to send message";
    return NextResponse.json(
      { success: false, error: message },
      { status: 502 }
    );
  }
}
