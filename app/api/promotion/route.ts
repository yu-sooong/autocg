import { NextResponse } from "next/server";
import { promotionConfigSchema } from "@/lib/schema";
import { readPromotionConfig, writePromotionConfig } from "@/lib/storage/json";

export async function GET() {
  return NextResponse.json(readPromotionConfig());
}

export async function PUT(req: Request) {
  const body = await req.json();
  const parsed = promotionConfigSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  writePromotionConfig(parsed.data);
  return NextResponse.json(parsed.data);
}
