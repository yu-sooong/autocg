import { prisma } from "./db";
import { queueEnv } from "../queue/config";

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
    update: queueEnv(),
    create: queueEnv(),
  });

  const count = await prisma.keyword.count();
  if (count === 0) {
    await prisma.keyword.createMany({
      data: DEFAULT_KEYWORDS.map((phrase) => ({ phrase, enabled: true })),
    });
  }
}
