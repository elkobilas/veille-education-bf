import "dotenv/config";
import { env } from "@/lib/env";
import { scrapeAllSources } from "@/scraper/orchestrator";

const INTERVAL_MS = env.SCRAPE_INTERVAL_MINUTES * 60 * 1000;

async function tick() {
  const now = new Date().toLocaleTimeString("fr-FR");
  console.log(`\n[cron] ${now} — Vérification des sources...`);
  const start = Date.now();

  try {
    const results = await scrapeAllSources();
    const totalNew = results.reduce((sum, r) => sum + r.newCount, 0);
    console.log(
      `[cron] Terminé en ${Date.now() - start}ms — ${totalNew} nouveau(x) communiqué(s)`
    );

    if (totalNew > 0) {
      for (const r of results) {
        if (r.newCount > 0) {
          console.log(`  📬 ${r.sourceName} : ${r.newCount} communiqué(s)`);
        }
      }
    }
  } catch (err) {
    console.error("[cron] Erreur:", err);
  }
}

async function main() {
  console.log("═".repeat(50));
  console.log("  Veille Éducation Burkina Faso — Planificateur");
  console.log(`  Fréquence : toutes les ${env.SCRAPE_INTERVAL_MINUTES} minute(s)`);
  console.log("═".repeat(50));

  // Premier lancement immédiat
  await tick();

  // Planification
  setInterval(tick, INTERVAL_MS);
  console.log(`\n⏱️  Prochaine vérification dans ${env.SCRAPE_INTERVAL_MINUTES} minute(s)...`);
  console.log("   (Ctrl+C pour arrêter)\n");
}

main().catch((err) => {
  console.error("Erreur fatale :", err);
  process.exit(1);
});
