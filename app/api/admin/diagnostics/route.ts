import { NextResponse } from "next/server";
import { getCurrentWorkspaceId } from "@/lib/auth";
import { prisma } from "@/lib/db/client";
import { getDMQueue } from "@/lib/queue/client";
import { getWorkerAlerts, getWorkerHealth } from "@/lib/ops/worker-health";

export const runtime = "nodejs";

export async function GET() {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) {
    if (process.env.NODE_ENV === "development") {
      return NextResponse.json({
        success: true,
        data: {
          queueCounts: {
            waiting: 0,
            active: 1,
            delayed: 2,
            failed: 0,
          },
          workerHealth: {
            healthy: true,
            ageMs: 2400,
            heartbeat: {
              checkedAt: new Date(Date.now() - 2400).toISOString(),
              hostname: "worker-node-01.openreply.internal",
              pid: 4208,
              startedAt: new Date(Date.now() - 14 * 86400000).toISOString(),
            },
          },
          workerAlerts: [
            {
              level: "INFO",
              message: "Instagram Graph API burst relief buffer reset (200/min quota restored)",
              createdAt: new Date(Date.now() - 12 * 60000).toISOString(),
            },
            {
              level: "WARN",
              message: "Rate limit buffer engaged for @sam_motion (burst throttle relieved in 8s)",
              commentId: "cmt_17894285012",
              createdAt: new Date(Date.now() - 80 * 60000).toISOString(),
            },
          ],
          webhookFailures: [],
          dmFailures: [
            {
              id: "fail-1",
              status: "FAILED",
              commentId: "cmt_17849204859",
              commentText: "JOIN the masterclass workbook",
              errorMessage: "Instagram Graph API: Recipient account has private messaging restricted (Error 403, Subcode 2018001)",
              updatedAt: new Date(Date.now() - 22 * 60000).toISOString(),
              automation: { name: "Creator Masterclass" },
            },
          ],
          tokenRefreshFailures: [],
          operationalEvents: [
            {
              id: "op-1",
              source: "GRAPH_API",
              level: "SUCCESS",
              message: "OAuth Long-lived token auto-refreshed successfully (Validity extended by 60 days)",
              createdAt: new Date(Date.now() - 4 * 3600000).toISOString(),
              resolvedAt: new Date(Date.now() - 4 * 3600000).toISOString(),
            },
            {
              id: "op-2",
              source: "WEBHOOK_ENGINE",
              level: "INFO",
              message: "Webhook endpoint validated by Meta Challenge handshake (HTTP 200 OK)",
              createdAt: new Date(Date.now() - 18 * 3600000).toISOString(),
              resolvedAt: null,
            },
            {
              id: "op-3",
              source: "REDIS_QUEUE",
              level: "INFO",
              message: "BullMQ dispatch worker initialized with concurrency limit: 8 workers",
              createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
              resolvedAt: null,
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

  const [
    queueCounts,
    workerHealth,
    workerAlerts,
    webhookFailures,
    dmFailures,
    tokenRefreshFailures,
    operationalEvents,
  ] = await Promise.all([
    getDMQueue().getJobCounts("waiting", "active", "delayed", "failed"),
    getWorkerHealth(),
    getWorkerAlerts(10),
    prisma.webhookEvent.findMany({
      where: { workspaceId, status: "FAILED" },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        object: true,
        errorMessage: true,
        createdAt: true,
        processedAt: true,
      },
    }),
    prisma.dmLog.findMany({
      where: {
        workspaceId,
        status: {
          in: [
            "FAILED",
            "SKIPPED_RATE_LIMIT",
            "SKIPPED_PLAN_LIMIT",
            "SKIPPED_NO_MATCH",
          ],
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
      select: {
        id: true,
        status: true,
        commentId: true,
        commentText: true,
        errorMessage: true,
        updatedAt: true,
        automation: { select: { name: true } },
      },
    }),
    prisma.operationalEvent.findMany({
      where: { workspaceId, source: "TOKEN_REFRESH", level: "ERROR" },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        message: true,
        createdAt: true,
        payload: true,
      },
    }),
    prisma.operationalEvent.findMany({
      where: {
        OR: [{ workspaceId }, { workspaceId: null }],
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        source: true,
        level: true,
        message: true,
        createdAt: true,
        resolvedAt: true,
      },
    }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      queueCounts,
      workerHealth,
      workerAlerts,
      webhookFailures,
      dmFailures,
      tokenRefreshFailures,
      operationalEvents,
    },
  });
}
