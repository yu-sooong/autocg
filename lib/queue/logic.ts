export function canSendPost(post: {
  suggestedComment: string | null;
  status: string;
}): boolean {
  return Boolean(
    post.suggestedComment &&
      !["queued", "sending", "sent", "skipped"].includes(post.status),
  );
}

export function selectedCount(ids: string[]): number {
  return ids.length;
}

export function confirmMessage(count: number): string {
  return `你即將送出 ${count} 篇留言，是否確認？`;
}

export function overDailyLimit(used: number, max: number): boolean {
  return used >= max;
}

export function retryJob<T extends { status: string; error: string | null; attemptCount: number }>(
  job: T,
): T {
  return {
    ...job,
    status: "queued",
    error: null,
  };
}

export function failJob<T extends { status: string; error: string | null; attemptCount: number }>(
  job: T,
  error: string,
): T {
  return {
    ...job,
    status: "failed",
    error,
    attemptCount: job.attemptCount + 1,
  };
}
