import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId, getCurrentWorkspaceId } from "@/lib/auth";
import { prisma } from "@/lib/db/client";
import {
  calculateCtr,
  normalizeTopKeywords,
  summarizeDmStatuses,
} from "@/lib/tracking/analytics";

export async function GET(request: NextRequest) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) {
    if (process.env.NODE_ENV === "development") {
      return NextResponse.json({
        success: true,
        data: {
          userName: "Sarah",
          contactsCount: 3892,
          totalAutomations: 11,
          activeAutomations: 8,
          dmsSentToday: 1429,
          dmsSentWeek: 8940,
          dmsSentMonth: 142850,
          dmsSkippedMonth: 120,
          dmsFailedMonth: 28,
          totalDMs: 142850,
          clicksThisMonth: 48850,
          totalClicks: 48850,
          ctrThisMonth: 34.2,
          instagramAccounts: [
            { id: "mock-1", username: "sarah.designs", name: "Sarah Studio IG" },
          ],
          selectedInstagramAccountId: "mock-1",
          topKeywords: [
            { keyword: "LINK", count: 842 },
            { keyword: "PRICE", count: 419 },
            { keyword: "DEMO", count: 168 },
          ],
          dailyDMs: [
            { date: "Mon", count: 180 },
            { date: "Tue", count: 240 },
            { date: "Wed", count: 195 },
            { date: "Thu", count: 310 },
            { date: "Fri", count: 280 },
            { date: "Sat", count: 410 },
            { date: "Sun", count: 390 },
          ],
          recentLogs: [
            {
              id: "log-1",
              commenterName: "emily_creative",
              commentText: "Can you send the link please? LINK",
              status: "SENT",
              createdAt: new Date().toISOString(),
              automation: { name: "Summer Reel Lead Magnet" },
              instagramAccount: { username: "sarah.designs" },
            },
            {
              id: "log-2",
              commenterName: "marcus_dev",
              commentText: "LINK",
              status: "SENT",
              createdAt: new Date().toISOString(),
              automation: { name: "Bio Link DM Automation" },
              instagramAccount: { username: "sarah.designs" },
            },
            {
              id: "log-3",
              commenterName: "alexandra.photo",
              commentText: "Interested in the presets! LINK",
              status: "PENDING",
              createdAt: new Date().toISOString(),
              automation: { name: "Presets Giveaway" },
              instagramAccount: { username: "sarah.designs" },
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

  const userId = await getCurrentUserId();

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const requestedInstagramAccountId =
    request.nextUrl.searchParams.get("instagramAccountId");
  const selectedAccountId =
    requestedInstagramAccountId && requestedInstagramAccountId !== "all"
      ? requestedInstagramAccountId
      : null;
  const accountFilter = selectedAccountId
    ? { instagramAccountId: selectedAccountId }
    : {};

  const [
    workspace,
    instagramAccount,
    instagramAccounts,
    totalAutomations,
    activeAutomations,
    dmsSentToday,
    dmsSentWeek,
    dmsSentMonth,
    totalDMs,
    dmStatusCountsThisMonth,
    clicksThisMonth,
    totalClicks,
    topKeywordRows,
    recentLogs,
    user,
    contactRows,
  ] = await Promise.all([
    prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        name: true,
        dmsSentThisPeriod: true,
      },
    }),
    prisma.instagramAccount.findFirst({
      where: { workspaceId },
      orderBy: { connectedAt: "desc" },
      select: {
        id: true,
        username: true,
        instagramId: true,
        provider: true,
        tokenExpiresAt: true,
        webhookSubscribed: true,
      },
    }),
    prisma.instagramAccount.findMany({
      where: { workspaceId },
      orderBy: { connectedAt: "desc" },
      select: {
        id: true,
        username: true,
        instagramId: true,
        name: true,
        provider: true,
        tokenExpiresAt: true,
        webhookSubscribed: true,
      },
    }),
    prisma.automation.count({ where: { workspaceId, ...accountFilter } }),
    prisma.automation.count({
      where: { workspaceId, isActive: true, ...accountFilter },
    }),
    prisma.dmLog.count({
      where: {
        workspaceId,
        status: "SENT",
        createdAt: { gte: todayStart },
        ...accountFilter,
      },
    }),
    prisma.dmLog.count({
      where: {
        workspaceId,
        status: "SENT",
        createdAt: { gte: weekStart },
        ...accountFilter,
      },
    }),
    prisma.dmLog.count({
      where: {
        workspaceId,
        status: "SENT",
        createdAt: { gte: monthStart },
        ...accountFilter,
      },
    }),
    prisma.dmLog.count({
      where: { workspaceId, status: "SENT", ...accountFilter },
    }),
    prisma.dmLog.groupBy({
      by: ["status"],
      where: { workspaceId, createdAt: { gte: monthStart }, ...accountFilter },
      _count: { _all: true },
    }),
    prisma.linkClick.count({
      where: { workspaceId, createdAt: { gte: monthStart }, ...accountFilter },
    }),
    prisma.linkClick.count({ where: { workspaceId, ...accountFilter } }),
    prisma.dmLog.groupBy({
      by: ["matchedKeyword"],
      where: { workspaceId, matchedKeyword: { not: null }, ...accountFilter },
      _count: { _all: true },
    }),
    prisma.dmLog.findMany({
      where: { workspaceId, ...accountFilter },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        automation: { select: { name: true } },
        instagramAccount: { select: { username: true } },
      },
    }),
    userId
      ? prisma.user.findUnique({
          where: { id: userId },
          select: { name: true, email: true },
        })
      : Promise.resolve(null),
    // Distinct people who have interacted, counted as "contacts".
    prisma.dmLog.findMany({
      where: { workspaceId, ...accountFilter },
      distinct: ["commenterId"],
      select: { commenterId: true },
    }),
  ]);

  const dailyDMs: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(todayStart);
    dayStart.setDate(dayStart.getDate() - i);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const count = await prisma.dmLog.count({
      where: {
        workspaceId,
        status: "SENT",
        createdAt: { gte: dayStart, lt: dayEnd },
        ...accountFilter,
      },
    });

    dailyDMs.push({
      date: dayStart.toLocaleDateString("en-US", { weekday: "short" }),
      count,
    });
  }

  const monthlyStatusSummary = summarizeDmStatuses(
    dmStatusCountsThisMonth.map((row) => ({
      status: row.status,
      _count: row._count._all,
    }))
  );
  const topKeywords = normalizeTopKeywords(
    topKeywordRows.map((row) => ({
      matchedKeyword: row.matchedKeyword,
      _count: row._count._all,
    }))
  );

  const firstName =
    user?.name?.trim().split(/\s+/)[0] ||
    user?.email?.split("@")[0] ||
    null;

  return NextResponse.json({
    success: true,
    data: {
      userName: firstName,
      contactsCount: contactRows.length,
      workspace,
      instagramAccount,
      instagramAccounts,
      selectedInstagramAccountId: selectedAccountId,
      totalAutomations,
      activeAutomations,
      dmsSentToday,
      dmsSentWeek,
      dmsSentMonth,
      dmsSkippedMonth: monthlyStatusSummary.skipped,
      dmsFailedMonth: monthlyStatusSummary.failed,
      totalDMs,
      clicksThisMonth,
      totalClicks,
      ctrThisMonth: calculateCtr(clicksThisMonth, dmsSentMonth),
      topKeywords,
      dailyDMs,
      recentLogs,
    },
  });
}
