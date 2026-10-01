import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspaceId } from "@/lib/auth";
import { prisma } from "@/lib/db/client";
import { DmStatus } from "@/app/generated/prisma/client";

export async function GET(request: NextRequest) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) {
    if (process.env.NODE_ENV === "development") {
      const searchParams = request.nextUrl.searchParams;
      const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10));
      const limit = Math.min(50, Math.max(1, Number.parseInt(searchParams.get("limit") ?? "20", 10)));
      const status = searchParams.get("status");

      const mockLogs = [
        {
          id: "log-101",
          commenterId: "ig-user-elena",
          commenterName: "elena_crafts",
          commentText: "Please send FIGMA tokens and components! Loved your reel 🔥",
          status: "SENT",
          errorMessage: null,
          createdAt: new Date(Date.now() - 3 * 60000).toISOString(),
          automation: { name: "Figma System 2025", keywords: ["FIGMA"] },
          instagramAccount: { username: "sarah.designs" },
          latencyMs: 38,
          httpStatus: 200,
          dmMessage: "Hey @elena_crafts! Here is your private Figma System 2025 link: https://openreply.io/r/figma-2025",
        },
        {
          id: "log-102",
          commenterId: "ig-user-marcus",
          commenterName: "marcus_agency",
          commentText: "PRICING please! Need this for client proposal deck.",
          status: "SENT",
          errorMessage: null,
          createdAt: new Date(Date.now() - 7 * 60000).toISOString(),
          automation: { name: "Client Pricing Guide", keywords: ["PRICING"] },
          instagramAccount: { username: "sarah.designs" },
          latencyMs: 42,
          httpStatus: 200,
          dmMessage: "Here is your 2025 Freelance & Agency Pricing Guide: https://openreply.io/r/pricing-guide",
        },
        {
          id: "log-103",
          commenterId: "ig-user-sophia",
          commenterName: "sophia_ui",
          commentText: "OS - love your Notion workspace layout",
          status: "SENT",
          errorMessage: null,
          createdAt: new Date(Date.now() - 14 * 60000).toISOString(),
          automation: { name: "Notion Freelance OS", keywords: ["OS"] },
          instagramAccount: { username: "sarah.designs" },
          latencyMs: 45,
          httpStatus: 200,
          dmMessage: "Your Notion Freelance OS template is ready to duplicate: https://openreply.io/r/notion-os",
        },
        {
          id: "log-104",
          commenterId: "ig-user-david",
          commenterName: "david_pixel",
          commentText: "JOIN the masterclass workbook",
          status: "FAILED",
          errorMessage: "Instagram Graph API: Recipient account has private messaging restricted (Error 403, Subcode 2018001)",
          createdAt: new Date(Date.now() - 22 * 60000).toISOString(),
          automation: { name: "Creator Masterclass", keywords: ["JOIN"] },
          instagramAccount: { username: "sarah.designs" },
          latencyMs: 120,
          httpStatus: 403,
          dmMessage: "Join the VIP Creator Masterclass: https://openreply.io/r/masterclass",
        },
        {
          id: "log-105",
          commenterId: "ig-user-alex",
          commenterName: "alex_design",
          commentText: "figma please",
          status: "SKIPPED_DEDUP",
          errorMessage: "Skipped: Automated DM already dispatched to this recipient within the last 24h dedup window.",
          createdAt: new Date(Date.now() - 35 * 60000).toISOString(),
          automation: { name: "Figma System 2025", keywords: ["FIGMA"] },
          instagramAccount: { username: "sarah.designs" },
          latencyMs: 12,
          httpStatus: 200,
          dmMessage: null,
        },
        {
          id: "log-106",
          commenterId: "ig-user-liam",
          commenterName: "liam_dev",
          commentText: "PRICING",
          status: "SENT",
          errorMessage: null,
          createdAt: new Date(Date.now() - 48 * 60000).toISOString(),
          automation: { name: "Client Pricing Guide", keywords: ["PRICING"] },
          instagramAccount: { username: "sarah.designs" },
          latencyMs: 34,
          httpStatus: 200,
          dmMessage: "Here is your 2025 Freelance & Agency Pricing Guide: https://openreply.io/r/pricing-guide",
        },
        {
          id: "log-107",
          commenterId: "ig-user-maya",
          commenterName: "maya_ux",
          commentText: "OS template looks amazing!",
          status: "SENT",
          errorMessage: null,
          createdAt: new Date(Date.now() - 65 * 60000).toISOString(),
          automation: { name: "Notion Freelance OS", keywords: ["OS"] },
          instagramAccount: { username: "sarah.designs" },
          latencyMs: 39,
          httpStatus: 200,
          dmMessage: "Your Notion Freelance OS template is ready to duplicate: https://openreply.io/r/notion-os",
        },
        {
          id: "log-108",
          commenterId: "ig-user-sam",
          commenterName: "sam_motion",
          commentText: "JOIN",
          status: "SKIPPED_RATE_LIMIT",
          errorMessage: "Rate limit buffer active: queued for burst window relief (dispatched 8s later).",
          createdAt: new Date(Date.now() - 80 * 60000).toISOString(),
          automation: { name: "Creator Masterclass", keywords: ["JOIN"] },
          instagramAccount: { username: "sarah.designs" },
          latencyMs: 8200,
          httpStatus: 429,
          dmMessage: "Join the VIP Creator Masterclass: https://openreply.io/r/masterclass",
        },
        {
          id: "log-109",
          commenterId: "ig-user-chloe",
          commenterName: "chloe_creative",
          commentText: "FIGMA 🚀",
          status: "SENT",
          errorMessage: null,
          createdAt: new Date(Date.now() - 95 * 60000).toISOString(),
          automation: { name: "Figma System 2025", keywords: ["FIGMA"] },
          instagramAccount: { username: "sarah.designs" },
          latencyMs: 41,
          httpStatus: 200,
          dmMessage: "Hey @chloe_creative! Here is your private Figma System 2025 link: https://openreply.io/r/figma-2025",
        },
        {
          id: "log-110",
          commenterId: "ig-user-noah",
          commenterName: "noah_builds",
          commentText: "PRICING info please",
          status: "SENT",
          errorMessage: null,
          createdAt: new Date(Date.now() - 110 * 60000).toISOString(),
          automation: { name: "Client Pricing Guide", keywords: ["PRICING"] },
          instagramAccount: { username: "sarah.designs" },
          latencyMs: 37,
          httpStatus: 200,
          dmMessage: "Here is your 2025 Freelance & Agency Pricing Guide: https://openreply.io/r/pricing-guide",
        },
        {
          id: "log-111",
          commenterId: "ig-user-zoe",
          commenterName: "zoe_brand",
          commentText: "Welcome DM automated trigger",
          status: "SENT",
          errorMessage: null,
          createdAt: new Date(Date.now() - 130 * 60000).toISOString(),
          automation: { name: "Welcome DM", keywords: ["Automated Inflow"] },
          instagramAccount: { username: "sarah.designs" },
          latencyMs: 35,
          httpStatus: 200,
          dmMessage: "Thanks for connecting! Let me know if you need any design templates or resources.",
        },
        {
          id: "log-112",
          commenterId: "ig-user-ryan",
          commenterName: "ryan_code",
          commentText: "OS please",
          status: "SENT",
          errorMessage: null,
          createdAt: new Date(Date.now() - 150 * 60000).toISOString(),
          automation: { name: "Notion Freelance OS", keywords: ["OS"] },
          instagramAccount: { username: "sarah.designs" },
          latencyMs: 44,
          httpStatus: 200,
          dmMessage: "Your Notion Freelance OS template is ready to duplicate: https://openreply.io/r/notion-os",
        },
      ];

      const filtered = status && status !== "ALL"
        ? mockLogs.filter((l) => l.status === status)
        : mockLogs;

      return NextResponse.json({
        success: true,
        data: {
          logs: filtered,
          pagination: {
            page,
            limit,
            total: filtered.length,
            totalPages: Math.ceil(filtered.length / limit) || 1,
          },
        },
      });
    }

    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(
    50,
    Math.max(1, Number.parseInt(searchParams.get("limit") ?? "20", 10))
  );
  const status = searchParams.get("status");
  const instagramAccountId = searchParams.get("instagramAccountId");
  const skip = (page - 1) * limit;
  const parsedStatus =
    status && Object.values(DmStatus).includes(status as DmStatus)
      ? (status as DmStatus)
      : null;

  const where = {
    workspaceId,
    ...(parsedStatus ? { status: parsedStatus } : {}),
    ...(instagramAccountId && instagramAccountId !== "all"
      ? { instagramAccountId }
      : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.dmLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        automation: { select: { name: true, keywords: true } },
        instagramAccount: { select: { username: true } },
      },
    }),
    prisma.dmLog.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
  });
}
