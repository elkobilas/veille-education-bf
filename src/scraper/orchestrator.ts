import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { fetchPage, scrapePage } from "./scraper";
import type { ScrapedItem } from "./types";
import { summarizeCommunique } from "@/ai/summarizer";
import { sendNotification } from "@/email/mailer";
import { sendWhatsAppNotification } from "@/notify/whatsapp";

export interface ScrapeResult {
  sourceId: string;
  sourceName: string;
  status: "success" | "error";
  newCount: number;
  error?: string;
}

/**
 * Lance le scraping pour une source donnée.
 * - Télécharge la page
 * - Extrait les communiqués
 * - Déduplique (via l'URL unique)
 * - Génère un résumé IA
 * - Envoie un e-mail pour chaque nouveau communiqué
 */
export async function scrapeSource(sourceId: string): Promise<ScrapeResult> {
  const start = Date.now();

  const source = await prisma.source.findUnique({ where: { id: sourceId } });
  if (!source) {
    return {
      sourceId,
      sourceName: "inconnue",
      status: "error",
      newCount: 0,
      error: "Source introuvable",
    };
  }

  try {
    // 1. Télécharger la page
    const html = await fetchPage(source.url);

    // 2. Extraire les communiqués
    const items = await scrapePage(html, source.url, {
      item: source.itemSelector ?? undefined,
      title: source.titleSelector ?? undefined,
      link: source.linkSelector ?? undefined,
      date: source.dateSelector ?? undefined,
      content: source.contentSelector ?? undefined,
    });

    // 3. Dédupliquer et enregistrer les nouveaux
    let newCount = 0;
    for (const item of items) {
      const exists = await prisma.communique.findUnique({
        where: { url: item.url },
      });
      if (exists) continue;

      const communique = await prisma.communique.create({
        data: {
          sourceId: source.id,
          url: item.url,
          title: item.title,
          rawContent: item.rawContent,
          publishedAt: item.publishedAt,
          status: "NEW",
        },
      });

      newCount++;
      // 4. Générer le résumé IA (en arrière-plan, on continue)
      enrichAndNotify(communique.id, source.name);
    }

    // 5. Logger le succès
    await prisma.scrapeLog.create({
      data: {
        sourceId: source.id,
        status: "success",
        message: `${items.length} éléments trouvés, ${newCount} nouveaux`,
        newCount,
        duration: Date.now() - start,
      },
    });

    return {
      sourceId: source.id,
      sourceName: source.name,
      status: "success",
      newCount,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    await prisma.scrapeLog.create({
      data: {
        sourceId: source.id,
        status: "error",
        message,
        newCount: 0,
        duration: Date.now() - start,
      },
    });

    return {
      sourceId: source.id,
      sourceName: source.name,
      status: "error",
      newCount: 0,
      error: message,
    };
  }
}

/**
 * Lance le scraping pour toutes les sources actives.
 */
export async function scrapeAllSources(): Promise<ScrapeResult[]> {
  const sources = await prisma.source.findMany({ where: { isActive: true } });
  const results: ScrapeResult[] = [];

  for (const source of sources) {
    const result = await scrapeSource(source.id);
    results.push(result);
  }

  return results;
}

// ---------------------------------------------------------------------------
// Enrichissement + notification (exécuté après sauvegarde)
// ---------------------------------------------------------------------------

async function enrichAndNotify(communiqueId: string, sourceName: string) {
  try {
    const communique = await prisma.communique.findUnique({
      where: { id: communiqueId },
    });
    if (!communique || !communique.rawContent) return;

    // Résumé IA
    const summary = await summarizeCommunique(
      communique.title,
      communique.rawContent
    );

    await prisma.communique.update({
      where: { id: communiqueId },
      data: {
        summary: summary.summary,
        targetAudience: summary.targetAudience,
        importantDates: summary.importantDates,
        requiredDocs: summary.requiredDocs,
        status: "SUMMARIZED",
      },
    });

    // Notification selon le canal configuré
    const channel = env.NOTIFICATION_CHANNEL;
    const shouldEmail = (channel === "email" || channel === "both") && env.SMTP_USER && env.NOTIFICATION_EMAIL;
    const shouldWhatsApp = (channel === "whatsapp" || channel === "both") && env.WHATSAPP_PROVIDER;

    const notification = {
      title: communique.title,
      url: communique.url,
      summary: summary.summary,
      targetAudience: summary.targetAudience,
      importantDates: summary.importantDates,
      requiredDocs: summary.requiredDocs,
      publishedAt: communique.publishedAt?.toISOString() ?? "Non spécifiée",
      sourceName,
    };

    let sent = false;

    if (shouldEmail) {
      try {
        await sendNotification(notification);
        sent = true;
      } catch (err) {
        console.error("[email] Échec envoi :", err);
      }
    }

    if (shouldWhatsApp) {
      try {
        await sendWhatsAppNotification(notification);
        sent = true;
      } catch (err) {
        console.error("[whatsapp] Échec envoi :", err);
      }
    }

    if (sent) {
      await prisma.communique.update({
        where: { id: communiqueId },
        data: {
          status: "SENT",
          emailSent: true,
          emailSentAt: new Date(),
        },
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.communique.update({
      where: { id: communiqueId },
      data: {
        status: "ERROR",
        metadata: { error: message },
      },
    });
    console.error(`[enrichAndNotify] Erreur pour ${communiqueId}:`, message);
  }
}
