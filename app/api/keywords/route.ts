import { NextResponse } from "next/server";
import { prisma } from "@/lib/storage/db";
import { ensureSeed } from "@/lib/storage/seed";

export async function GET() {
  await ensureSeed();
  const keywords = await prisma.keyword.findMany({
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ keywords });
}

export async function POST(req: Request) {
  const body = (await req.json()) as { phrase?: string };
  const phrase = body.phrase?.trim();
  if (!phrase) return NextResponse.json({ error: "關鍵字不可空白" }, { status: 400 });
  const keyword = await prisma.keyword.upsert({
    where: { phrase },
    update: { enabled: true },
    create: { phrase, enabled: true },
  });
  return NextResponse.json({ keyword });
}

export async function PATCH(req: Request) {
  const body = (await req.json()) as { id?: string; enabled?: boolean };
  if (!body.id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });
  const keyword = await prisma.keyword.update({
    where: { id: body.id },
    data: { enabled: Boolean(body.enabled) },
  });
  return NextResponse.json({ keyword });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });
  await prisma.keyword.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
