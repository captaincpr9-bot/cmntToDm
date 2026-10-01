import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspaceId } from "@/lib/auth";
import { getWorkspaceInstagramAccount } from "@/lib/instagram-accounts";
import {
  getConversationMessages,
  MetaApiError,
} from "@/lib/instagram/provider";
import { createInstagramContext } from "@/lib/instagram/provider";

export interface ThreadMessage {
  id: string;
  text: string;
  fromMe: boolean;
  fromUsername: string | null;
  createdTime: string | null;
  isBot?: boolean;
  deliveredTime?: string;
  clickedTime?: string;
  linkCard?: {
    title: string;
    url: string;
    badge: string;
  };
}

export interface ThreadResponse {
  messages: ThreadMessage[];
}

const DEV_MOCK_THREADS: Record<string, ThreadMessage[]> = {
  "conv-1": [
    {
      id: "msg-1",
      text: "Hey @alex_ui! 👋 Thanks for commenting on my latest reel. Here is the direct link to download the 10 Figma Design Systems:",
      fromMe: true,
      fromUsername: "sarah.designs",
      createdTime: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      isBot: true,
      deliveredTime: "2:41 PM",
      clickedTime: "2:42 PM",
      linkCard: {
        title: "Figma 2025 System Architecture Kit",
        url: "openreply.io/figma-2025",
        badge: "Free Download • 4.8MB ZIP",
      },
    },
    {
      id: "msg-2",
      text: "Let me know what you build! Let me know if you run into any permission issues.",
      fromMe: true,
      fromUsername: "sarah.designs",
      createdTime: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
      isBot: true,
    },
    {
      id: "msg-3",
      text: "Thanks so much! Just downloaded the kit, the token naming convention is incredible 🔥",
      fromMe: false,
      fromUsername: "alex_ui",
      createdTime: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    },
  ],
  "conv-2": [
    {
      id: "msg-201",
      text: "Is there a version for teams? We have 6 product designers working across multiple client brands.",
      fromMe: false,
      fromUsername: "marta_dev",
      createdTime: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
    },
  ],
  "conv-3": [
    {
      id: "msg-301",
      text: "Hey @lucas_ux! Here is your Client Pricing & Proposal PDF guide:",
      fromMe: true,
      fromUsername: "sarah.designs",
      createdTime: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
      isBot: true,
      deliveredTime: "1:15 PM",
      clickedTime: "1:18 PM",
      linkCard: {
        title: "2025 Client Rate Calculator & Proposal PDF",
        url: "openreply.io/pricing-kit",
        badge: "PDF Guide • 2.1MB",
      },
    },
  ],
  "conv-4": [
    {
      id: "msg-401",
      text: "Hey @chloe_creates! 🚀 Exclusive early access to the Growth Masterclass is unlocked below:",
      fromMe: true,
      fromUsername: "sarah.designs",
      createdTime: new Date(Date.now() - 65 * 60 * 1000).toISOString(),
      isBot: true,
      deliveredTime: "12:30 PM",
      clickedTime: "12:31 PM",
      linkCard: {
        title: "Instagram Organic Growth Masterclass 2025",
        url: "openreply.io/growth-masterclass",
        badge: "Video Course • Free Access",
      },
    },
  ],
  "conv-5": [
    {
      id: "msg-501",
      text: "Hey! Loved the reel on design systems",
      fromMe: false,
      fromUsername: "dev_sam",
      createdTime: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
    },
  ],
};

type RouteProps = { params: Promise<{ id: string }> };

// Message history for a single conversation (20 most recent, chronological).
export async function GET(request: NextRequest, { params }: RouteProps) {
  const workspaceId = await getCurrentWorkspaceId();
  const { id: conversationId } = await params;

  if (!workspaceId) {
    if (process.env.NODE_ENV === "development") {
      const messages = DEV_MOCK_THREADS[conversationId] || DEV_MOCK_THREADS["conv-1"];
      return NextResponse.json({ success: true, data: { messages } });
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
      const messages = DEV_MOCK_THREADS[conversationId] || DEV_MOCK_THREADS["conv-1"];
      return NextResponse.json({ success: true, data: { messages } });
    }
    return NextResponse.json(
      { success: false, error: "Instagram account not connected." },
      { status: 400 }
    );
  }

  try {
    const accessToken = await createInstagramContext(account);
    const raw = await getConversationMessages({
      context: accessToken,
      conversationId: conversationId,
    });

    // The API returns newest-first; reverse to read top-to-bottom.
    const messages: ThreadMessage[] = raw
      .map((m) => ({
        id: m.id,
        text: m.message ?? "",
        fromMe: m.from?.id === account.instagramId,
        fromUsername: m.from?.username ?? null,
        createdTime: m.created_time ?? null,
      }))
      .reverse();

    const data: ThreadResponse = { messages };
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("[Conversation Messages] Error:", err);
    const message =
      err instanceof MetaApiError ? err.message : "Failed to load messages";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
