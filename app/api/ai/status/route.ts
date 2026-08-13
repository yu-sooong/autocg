import { NextResponse } from "next/server";
import { aiStatus, mergeAiAnalysis } from "@/lib/ai/merge";

export const dynamic = "force-dynamic";

let lastHash = "";

export async function GET() {
  const status = await aiStatus();
  if (status.exists && status.valid && status.hash !== lastHash) {
    const merged = await mergeAiAnalysis();
    lastHash = status.hash;
    return NextResponse.json({ ...status, merged: merged.merged, changed: true });
  }
  return NextResponse.json({ ...status, changed: false, merged: 0 });
}
