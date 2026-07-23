import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config({ override: true });

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seed des sources par défaut...\n");

  const sources = [
    {
      name: "MEBAPLN - Ministère de l'Éducation",
      url: "https://www.mebapln.gov.bf",
      type: "WEBSITE" as const,
      category: "communiqués",
      itemSelector: "article",
      titleSelector: "h2, h3",
      linkSelector: "a",
    },
    {
      name: "DIOSPB",
      url: "https://www.diospb.gov.bf",
      type: "WEBSITE" as const,
      category: "communiqués",
      itemSelector: "article",
      titleSelector: "h2, h3",
      linkSelector: "a",
    },
    {
      name: "Gouvernement BF - Éducation",
      url: "https://www.gouvernement.gov.bf",
      type: "WEBSITE" as const,
      category: "gouvernement",
      itemSelector: "article",
      titleSelector: "h2, h3",
      linkSelector: "a",
    },
  ];

  for (const src of sources) {
    const existing = await prisma.source.findFirst({
      where: { url: src.url },
    });

    if (!existing) {
      await prisma.source.create({ data: src });
      console.log(`  ✅ ${src.name}`);
    } else {
      console.log(`  ⏭️  ${src.name} (déjà présente)`);
    }
  }

  console.log("\n✅ Seed terminé.");
}

main()
  .catch((err) => {
    console.error("❌ Erreur seed :", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
