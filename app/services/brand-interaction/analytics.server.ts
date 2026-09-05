import { prisma } from "~/db.server";
import { AnalyticsEventPayloadSchema } from "./validation";
import { FEATURE_FLAGS } from "./entitlements";

// ── Ingest batched analytics events from the storefront ──────────────

export async function ingestAnalyticsEvents(shopId: string, payload: unknown) {
  if (!FEATURE_FLAGS.ENABLE_ANALYTICS) {
    return { ok: true as const, message: "Analytics disabled" };
  }

  const parsed = AnalyticsEventPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false as const, errors: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) };
  }

  const { sessionId, experienceId, events, deviceType } = parsed.data;

  // Upsert session
  await prisma.analyticsSession.upsert({
    where: { id: sessionId },
    update: { endedAt: new Date() },
    create: {
      id: sessionId,
      shopId,
      experienceId,
      anonymousSessionId: sessionId,
      deviceType,
      startedAt: new Date(),
    },
  });

  // Batch insert events
  await prisma.analyticsEvent.createMany({
    data: events.map((e) => ({
      shopId,
      experienceId,
      anonymousSessionId: sessionId,
      eventType: e.eventType,
      pageType: e.pageType ?? null,
      elementType: e.elementType ?? null,
      metadata: (e.metadata ?? {}) as unknown as import("@prisma/client/runtime/library").InputJsonValue,
      occurredAt: new Date(e.occurredAt),
    })),
  });

  return { ok: true as const };
}

// ── Dashboard aggregation queries ────────────────────────────────────

export async function getAnalyticsOverview(shopId: string, days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const [totalSessions, totalEvents, dailyMetrics] = await Promise.all([
    prisma.analyticsSession.count({ where: { shopId, startedAt: { gte: since } } }),
    prisma.analyticsEvent.count({ where: { shopId, occurredAt: { gte: since } } }),
    prisma.analyticsDailyMetric.findMany({
      where: { shopId, date: { gte: since } },
      orderBy: { date: "asc" },
    }),
  ]);

  return { totalSessions, totalEvents, dailyMetrics, period: days };
}

export async function getInteractionBreakdown(shopId: string, days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const events = await prisma.analyticsEvent.groupBy({
    by: ["eventType"],
    where: { shopId, occurredAt: { gte: since } },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
  });

  return events.map((e) => ({ eventType: e.eventType, count: e._count.id }));
}
