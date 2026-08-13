import { prisma } from "../storage/db";
import { getSendProvider } from "../crawler";
import { normalizeAuthor } from "../threads/canonical";
import { logEvent } from "../logger";
import { queueEnv } from "./config";

const g = globalThis as unknown as {
  __threadsQueue?: { running: boolean; timer?: ReturnType<typeof setTimeout> };
};

function runtime() {
  if (!g.__threadsQueue) g.__threadsQueue = { running: false };
  return g.__threadsQueue;
}

function todayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

export async function getQueueControl() {
  const env = queueEnv();
  return prisma.queueControl.upsert({
    where: { id: "default" },
    update: env,
    create: env,
  });
}

export async function enqueuePosts(ids: string[]) {
  const now = new Date();
  await prisma.post.updateMany({
    where: { id: { in: ids } },
    data: {
      status: "queued",
      queuedAt: now,
      approvedAt: now,
      error: null,
    },
  });
  logEvent("queue", `已入隊 ${ids.length} 篇`, { ids });
}

export async function pauseQueue() {
  await prisma.queueControl.update({
    where: { id: "default" },
    data: { paused: true },
  });
  logEvent("queue", "暫停");
}

export async function resumeQueue() {
  await prisma.queueControl.update({
    where: { id: "default" },
    data: { paused: false, stopped: false },
  });
  logEvent("queue", "繼續");
  startLoop();
}

export async function stopQueue() {
  await prisma.queueControl.update({
    where: { id: "default" },
    data: { stopped: true, paused: false },
  });
  runtime().running = false;
  logEvent("queue", "停止");
}

export async function retryPost(id: string) {
  await prisma.post.update({
    where: { id },
    data: { status: "queued", error: null, queuedAt: new Date() },
  });
  logEvent("queue", `重試 ${id}`);
  startLoop();
}

async function processOne() {
  const control = await getQueueControl();
  if (control.stopped || control.paused) return false;

  const counter = await prisma.dailyCounter.upsert({
    where: { day: todayKey() },
    update: {},
    create: { day: todayKey(), count: 0 },
  });
  if (counter.count >= control.maxDailyActions) {
    logEvent("queue", "已達今日發送上限", { count: counter.count });
    return false;
  }

  const next = await prisma.post.findFirst({
    where: { status: "queued" },
    orderBy: { queuedAt: "asc" },
  });
  if (!next) return false;
  if (!next.suggestedComment) {
    await prisma.post.update({
      where: { id: next.id },
      data: { status: "failed", error: "沒有可發送的文案" },
    });
    return true;
  }

  await prisma.post.update({
    where: { id: next.id },
    data: { status: "sending", attemptCount: { increment: 1 } },
  });

  const sender = getSendProvider();
  const result = await sender.reply({
    postId: next.id,
    url: next.url,
    comment: next.suggestedComment,
  });

  if (result.ok) {
    await prisma.$transaction([
      prisma.post.update({
        where: { id: next.id },
        data: { status: "sent", sentAt: new Date(), error: null },
      }),
      prisma.dailyCounter.update({
        where: { day: todayKey() },
        data: { count: { increment: 1 } },
      }),
      prisma.authorCooldown.upsert({
        where: { author: normalizeAuthor(next.author) },
        update: { lastHandled: new Date() },
        create: {
          author: normalizeAuthor(next.author),
          lastHandled: new Date(),
        },
      }),
    ]);
    logEvent("send", `成功 ${next.id}`, { mock: result.mock, provider: sender.id });
  } else {
    await prisma.post.update({
      where: { id: next.id },
      data: {
        status: "failed",
        error: [result.error, result.limitation].filter(Boolean).join(" — "),
      },
    });
    logEvent("error", `發送失敗 ${next.id}`, { error: result.error });
  }
  return true;
}

export function startLoop() {
  const rt = runtime();
  if (rt.running) return;
  rt.running = true;

  const tick = async () => {
    try {
      const control = await getQueueControl();
      if (control.stopped) {
        rt.running = false;
        return;
      }
      if (!control.paused) {
        const did = await processOne();
        if (!did) {
          const remaining = await prisma.post.count({ where: { status: "queued" } });
          if (remaining === 0) {
            rt.running = false;
            return;
          }
        }
      }
      rt.timer = setTimeout(tick, (await getQueueControl()).delayMs);
    } catch (err) {
      logEvent("error", "queue loop 失敗", {
        error: err instanceof Error ? err.message : String(err),
      });
      rt.timer = setTimeout(tick, 5000);
    }
  };

  void tick();
}

export async function queueSnapshot() {
  const control = await getQueueControl();
  const grouped = await prisma.post.groupBy({
    by: ["status"],
    _count: true,
  });
  const counts = Object.fromEntries(grouped.map((g) => [g.status, g._count]));
  const sending = await prisma.post.findMany({
    where: { status: { in: ["queued", "sending"] } },
    orderBy: { queuedAt: "asc" },
  });
  const daily = await prisma.dailyCounter.findUnique({
    where: { day: todayKey() },
  });
  return {
    ...control,
    running: runtime().running,
    counts,
    sending,
    dailyCount: daily?.count ?? 0,
  };
}
