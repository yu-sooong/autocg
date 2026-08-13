export function queueEnv() {
  return {
    delayMs: Number(process.env.QUEUE_DELAY_MS ?? 8000),
    maxDailyActions: Number(process.env.MAX_DAILY_ACTIONS ?? 20),
    authorCooldownDays: Number(process.env.AUTHOR_COOLDOWN_DAYS ?? 30),
  };
}
