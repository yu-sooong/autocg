import { prisma } from "./db";

const DEFAULT_KEYWORDS = [
  "互相認識",
  "互相追蹤",
  "互相曝光",
  "歡迎新朋友",
  "認識新朋友",
  "留下你的作品",
  "分享你的作品",
  "最滿意的作品",
  "讓更多人認識你",
  "自我介紹",
  "分享網站",
  "創作者交流",
  "作品展示",
];

export async function ensureSeed() {
  await prisma.queueControl.upsert({
    where: { id: "default" },
    update: {},
    create: {
      delayMs: Number(process.env.QUEUE_DELAY_MS ?? 8000),
      maxDailyActions: Number(process.env.MAX_DAILY_ACTIONS ?? 20),
      authorCooldownDays: Number(process.env.AUTHOR_COOLDOWN_DAYS ?? 30),
    },
  });

  const count = await prisma.keyword.count();
  if (count === 0) {
    await prisma.keyword.createMany({
      data: DEFAULT_KEYWORDS.map((phrase) => ({ phrase, enabled: true })),
    });
  }
}
