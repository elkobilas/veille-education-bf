import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const source = await prisma.source.update({
    where: { id },
    data: {
      isActive: body.isActive,
    },
  });

  return NextResponse.json(source);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  await prisma.source.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
