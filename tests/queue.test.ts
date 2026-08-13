import { describe, expect, it } from "vitest";
import {
  canSendPost,
  confirmMessage,
  failJob,
  overDailyLimit,
  retryJob,
  selectedCount,
} from "@/lib/queue/logic";

describe("batch selection", () => {
  it("counts selected posts and builds confirm copy", () => {
    const ids = ["a", "b", "c"];
    expect(selectedCount(ids)).toBe(3);
    expect(confirmMessage(3)).toBe("你即將送出 3 篇留言，是否確認？");
    expect(
      canSendPost({ suggestedComment: "hi", status: "needs_review" }),
    ).toBe(true);
    expect(canSendPost({ suggestedComment: null, status: "draft" })).toBe(false);
    expect(canSendPost({ suggestedComment: "hi", status: "sent" })).toBe(false);
  });
});

describe("queue + retry", () => {
  it("processes one-at-a-time daily cap and retry", () => {
    expect(overDailyLimit(20, 20)).toBe(true);
    expect(overDailyLimit(19, 20)).toBe(false);
    const failed = failJob(
      { status: "sending", error: null, attemptCount: 0 },
      "timeout",
    );
    expect(failed.status).toBe("failed");
    expect(failed.attemptCount).toBe(1);
    const retried = retryJob(failed);
    expect(retried.status).toBe("queued");
    expect(retried.error).toBeNull();
  });
});
