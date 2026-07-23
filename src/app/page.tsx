import { prisma } from "@/lib/prisma";
import { DashboardClient } from "./dashboard-client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [sources, recentCommuniques, recentLogs] = await Promise.all([
    prisma.source.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.communique.findMany({
      orderBy: { detectedAt: "desc" },
      take: 20,
      include: { source: { select: { name: true } } },
    }),
    prisma.scrapeLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { source: { select: { name: true } } },
    }),
  ]);

  const stats = {
    totalSources: sources.length,
    activeSources: sources.filter((s) => s.isActive).length,
    totalCommuniques: await prisma.communique.count(),
    newToday: await prisma.communique.count({
      where: {
        detectedAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
    sentCount: await prisma.communique.count({
      where: { emailSent: true },
    }),
  };

  return (
    <DashboardClient
      sources={sources.map((s) => ({
        ...s,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      }))}
      communiques={recentCommuniques.map((c) => ({
        ...c,
        detectedAt: c.detectedAt.toISOString(),
        publishedAt: c.publishedAt?.toISOString() ?? null,
        emailSentAt: c.emailSentAt?.toISOString() ?? null,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        metadata: c.metadata as Record<string, unknown> | null,
      }))}
      logs={recentLogs.map((l) => ({
        ...l,
        createdAt: l.createdAt.toISOString(),
      }))}
      stats={stats}
    />
  );
}
