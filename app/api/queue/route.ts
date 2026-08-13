import { NextResponse } from "next/server";
import {
  enqueuePosts,
  getQueueControl,
  pauseQueue,
  queueSnapshot,
  resumeQueue,
  retryPost,
  startLoop,
  stopQueue,
} from "@/lib/queue/engine";
import { prisma } from "@/lib/storage/db";

export async function GET() {
  await getQueueControl();
  return NextResponse.json(await queueSnapshot());
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    action?: string;
    ids?: string[];
    id?: string;
  };

  switch (body.action) {
    case "enqueue": {
      const ids = body.ids ?? [];
      if (!ids.length) {
        return NextResponse.json({ error: "沒有選擇貼文" }, { status: 400 });
      }
      const posts = await prisma.post.findMany({ where: { id: { in: ids } } });
      const missingCopy = posts.filter((p) => !p.suggestedComment);
      if (missingCopy.length) {
        return NextResponse.json(
          { error: `有 ${missingCopy.length} 篇沒有文案，無法送出` },
          { status: 400 },
        );
      }
      await enqueuePosts(ids);
      startLoop();
      return NextResponse.json(await queueSnapshot());
    }
    case "pause":
      await pauseQueue();
      return NextResponse.json(await queueSnapshot());
    case "resume":
      await resumeQueue();
      return NextResponse.json(await queueSnapshot());
    case "stop":
      await stopQueue();
      return NextResponse.json(await queueSnapshot());
    case "retry":
      if (!body.id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });
      await retryPost(body.id);
      return NextResponse.json(await queueSnapshot());
    default:
      return NextResponse.json({ error: "未知動作" }, { status: 400 });
  }
}
