import { NextResponse } from "next/server";
import { runDiscovery } from "@/lib/crawler/run";
import { logEvent } from "@/lib/logger";

export async function POST() {
  try {
    const result = await runDiscovery();
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logEvent("error", "海巡失敗", { message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
