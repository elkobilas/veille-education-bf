import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const communiques = await prisma.communique.findMany({
    orderBy: { detectedAt: "desc" },
    take: 30,
    include: { source: { select: { name: true } } },
  });
  return NextResponse.json(communiques);
}
