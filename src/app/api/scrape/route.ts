import { NextResponse } from "next/server";
import { scrapeAllSources } from "@/scraper/orchestrator";

export const dynamic = "force-dynamic";

export async function POST() {
  const results = await scrapeAllSources();
  return NextResponse.json({ results });
}
