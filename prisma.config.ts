import dotenv from "dotenv";
import { defineConfig, env } from "prisma/config";

dotenv.config({ override: true });

const databaseUrl = process.env.DATABASE_URL || "file:./dev.db";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: databaseUrl,
  },
});
