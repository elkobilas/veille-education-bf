import "dotenv/config";
import { scrapeAllSources } from "./orchestrator";

async function main() {
  console.log("[scrape:once] Démarrage du scraping...");
  const start = Date.now();

  const results = await scrapeAllSources();

  console.log(`\nRésultats (${Date.now() - start}ms) :`);
  for (const r of results) {
    if (r.status === "success") {
      console.log(`  ✅ ${r.sourceName} : ${r.newCount} nouveau(x)`);
    } else {
      console.log(`  ❌ ${r.sourceName} : ${r.error}`);
    }
  }

  console.log("\nTerminé.");
}

main().catch((err) => {
  console.error("Erreur fatale :", err);
  process.exit(1);
});
