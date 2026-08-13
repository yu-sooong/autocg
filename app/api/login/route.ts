import { NextResponse } from "next/server";
import { spawn } from "node:child_process";
import fs from "node:fs";
import { AUTH_STATE, ROOT } from "@/lib/paths";

export async function GET() {
  return NextResponse.json({
    loggedIn: fs.existsSync(AUTH_STATE),
    authPath: AUTH_STATE,
  });
}

export async function POST() {
  const child = spawn("pnpm", ["threads:login"], {
    cwd: ROOT,
    detached: true,
    stdio: "ignore",
  });
  child.unref();
  return NextResponse.json({
    ok: true,
    message:
      "已啟動獨立 Chromium。請在該視窗自行登入 Threads。程式不會讀取密碼。登入後回終端機按 Enter 儲存 session。",
  });
}
