import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const sources = await prisma.source.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(sources);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const source = await prisma.source.create({
    data: {
      name: body.name,
      url: body.url,
      type: body.type ?? "WEBSITE",
      category: body.category ?? null,
      itemSelector: body.itemSelector ?? null,
      titleSelector: body.titleSelector ?? null,
      linkSelector: body.linkSelector ?? null,
      dateSelector: body.dateSelector ?? null,
      contentSelector: body.contentSelector ?? null,
      isActive: true,
    },
  });

  return NextResponse.json(source, { status: 201 });
}
