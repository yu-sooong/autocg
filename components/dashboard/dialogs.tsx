"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { confirmMessage } from "@/lib/queue/logic";
import { jsonFetch, patchJson } from "./api";
import type { Overview, Post, PreparedAi } from "./types";

export function ConfirmSendDialog({
  open,
  onOpenChange,
  posts,
  selected,
  mockMode,
  busy,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  posts: Post[];
  selected: string[];
  mockMode: boolean;
  busy: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{confirmMessage(selected.length)}</DialogTitle>
          <DialogDescription>
            {mockMode
              ? "目前是 Mock 模式，不會真的發到 Threads。"
              : "會依序發送（一次一篇），並受每日上限與作者冷卻限制。"}
          </DialogDescription>
        </DialogHeader>
        <ul className="max-h-48 space-y-2 overflow-auto text-sm leading-7">
          {posts
            .filter((p) => selected.includes(p.id))
            .map((p) => (
              <li key={p.id}>
                {p.author}
                {p.promotionScore !== null ? ` · ${p.promotionScore} 分` : ""}
              </li>
            ))}
        </ul>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={onConfirm} disabled={busy}>
            確認送出
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EditCommentDialog({
  post,
  text,
  onTextChange,
  onClose,
  onSaved,
}: {
  post: Post | null;
  text: string;
  onTextChange: (value: string) => void;
  onClose: () => void;
  onSaved: () => Promise<unknown>;
}) {
  return (
    <Dialog open={Boolean(post)} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>編輯文案</DialogTitle>
          <DialogDescription>{post?.author}</DialogDescription>
        </DialogHeader>
        <Textarea rows={6} value={text} onChange={(e) => onTextChange(e.target.value)} />
        <DialogFooter>
          <Button
            onClick={() => {
              if (!post) return;
              void patchJson("/api/posts", {
                id: post.id,
                suggestedComment: text,
              }).then(() => {
                onClose();
                return onSaved();
              });
            }}
          >
            儲存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PromptDialog({
  open,
  onOpenChange,
  prepared,
  onRunCli,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prepared: PreparedAi | null;
  onRunCli: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>準備 Cursor 分析</DialogTitle>
          <DialogDescription>{prepared?.message}</DialogDescription>
        </DialogHeader>
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-7">
          {prepared?.nextSteps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        <pre className="max-h-40 overflow-auto rounded-xl bg-muted p-4 text-xs leading-6">
          {prepared?.prompt}
        </pre>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => void navigator.clipboard.writeText(prepared?.prompt ?? "")}
          >
            複製 Prompt
          </Button>
          {prepared?.cliAvailable && (
            <Button variant="secondary" onClick={onRunCli}>
              用 Cursor CLI
            </Button>
          )}
          <Button onClick={() => onOpenChange(false)}>知道了</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function QueueNotice({
  data,
  onRefresh,
}: {
  data: Overview;
  onRefresh: () => Promise<unknown>;
}) {
  const queuedTotal = (data.queue.counts.queued ?? 0) + (data.queue.counts.sending ?? 0);
  const sent = data.queue.counts.sent ?? 0;
  const failed = data.queue.counts.failed ?? 0;
  const total = queuedTotal + sent + failed;
  if (total === 0) return null;

  const done = sent + failed;

  return (
    <div className="surface flex flex-wrap items-center justify-between gap-4 rounded-[20px] px-6 py-5">
      <div className="flex items-center gap-3">
        <span className="agent-pulse h-2.5 w-2.5 rounded-full bg-primary" />
        <div>
          <p className="text-sm font-medium">
            {data.queue.paused ? "已暫停" : "發送中"} {done} / {total}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            一次一篇 · 成功 {sent} · 失敗 {failed} · 今日 {data.queue.dailyCount}/
            {data.queue.maxDailyActions}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            void jsonAction(data.queue.paused ? "resume" : "pause").then(onRefresh)
          }
        >
          {data.queue.paused ? "繼續" : "暫停"}
        </Button>
        <Button variant="outline" size="sm" onClick={() => void jsonAction("stop").then(onRefresh)}>
          停止
        </Button>
      </div>
    </div>
  );
}

function jsonAction(action: string) {
  return jsonFetch("/api/queue", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });
}
