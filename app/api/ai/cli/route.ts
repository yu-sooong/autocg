import { NextResponse } from "next/server";
import { runCursorCliAnalysis } from "@/lib/ai/cursor";
import { mergeAiAnalysis } from "@/lib/ai/merge";

export async function POST() {
  const result = await runCursorCliAnalysis();
  if (result.ok) {
    const merged = await mergeAiAnalysis();
    return NextResponse.json({ ...result, merged: merged.merged });
  }
  return NextResponse.json(result, { status: 500 });
}
