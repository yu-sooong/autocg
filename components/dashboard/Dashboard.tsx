"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { canSendPost } from "@/lib/queue/logic";
import { jsonFetch, postJson } from "./api";
import { ConfirmSendDialog, EditCommentDialog, PromptDialog, QueueNotice } from "./dialogs";
import { PostCard } from "./post-card";
import { KeywordsPanel, LoginPanel, PromotionForm } from "./settings";
import type { Overview, Post, PreparedAi } from "./types";

export function Dashboard() {
  const [data, setData] = useState<Overview | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editing, setEditing] = useState<Post | null>(null);
  const [editText, setEditText] = useState("");
  const [aiWaiting, setAiWaiting] = useState(false);
  const [lastAiHash, setLastAiHash] = useState("");
  const [promptOpen, setPromptOpen] = useState(false);
  const [prepared, setPrepared] = useState<PreparedAi | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const next = await jsonFetch<Overview>("/api/overview");
    setData(next);
    return next;
  }, []);

  useEffect(() => {
    void refresh().catch((err) => toast.error(err.message));
  }, [refresh]);

  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const status = await jsonFetch<{ hash: string; changed: boolean; merged: number }>(
          "/api/ai/status",
        );
        if (status.changed && status.hash !== lastAiHash) {
          setLastAiHash(status.hash);
          setAiWaiting(false);
          toast.success(`分析完成，已合併 ${status.merged} 篇`);
          await refresh();
        } else {
          setData(await jsonFetch<Overview>("/api/overview"));
        }
      } catch {
        /* ignore poll errors */
      }
    }, 2000);
    return () => clearInterval(t);
  }, [lastAiHash, refresh]);

  const selectable = useMemo(() => data?.posts.filter(canSendPost) ?? [], [data]);

  async function crawl() {
    setBusy(true);
    try {
      const result = await jsonFetch<{
        discovered: number;
        added: number;
        matched: number;
        limitation?: string;
        error?: string;
      }>("/api/crawl", { method: "POST" });
      toast.success(
        `找到 ${result.discovered} 篇 → 過濾 ${result.matched} → 新增 ${result.added}`,
      );
      if (result.limitation) toast.message(result.limitation);
      if (result.error) toast.warning(result.error);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "海巡失敗");
    } finally {
      setBusy(false);
    }
  }

  async function prepareAi() {
    setBusy(true);
    try {
      const result = await jsonFetch<PreparedAi>("/api/ai/prepare", { method: "POST" });
      setPrepared(result);
      setPromptOpen(true);
      setAiWaiting(true);
      await navigator.clipboard.writeText(result.prompt).catch(() => undefined);
      toast.success("已準備分析，Prompt 已複製");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "準備失敗");
    } finally {
      setBusy(false);
    }
  }

  async function runCli() {
    setBusy(true);
    try {
      await jsonFetch("/api/ai/cli", { method: "POST" });
      toast.success("Cursor CLI 已跑完");
      await refresh();
      setAiWaiting(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "CLI 不可用，請改貼 Prompt");
    } finally {
      setBusy(false);
    }
  }

  async function sendSelected() {
    setBusy(true);
    try {
      await postJson("/api/queue", { action: "enqueue", ids: selected });
      toast.success(`已排入 ${selected.length} 篇`);
      setSelected([]);
      setConfirmOpen(false);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "入隊失敗");
    } finally {
      setBusy(false);
    }
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        載入中…
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28">
      <header className="px-6 pt-14 sm:px-10">
        <div className="mx-auto flex max-w-3xl items-start justify-between gap-6">
          <div>
            <p className="text-sm text-muted-foreground">autocg</p>
            <h1 className="mt-3 text-[32px] font-medium leading-none tracking-tight">海巡</h1>
            <p className="mt-4 max-w-md text-sm leading-7 text-muted-foreground">
              找出適合交流的公開貼文，確認文案後再送出。
            </p>
          </div>
          <span className="mt-1 shrink-0 text-xs text-muted-foreground">
            {data.providers.mockMode ? "Mock" : "真實"} · {data.providers.discovery}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-16 pt-12 sm:px-10">
        <dl className="flex flex-wrap gap-x-10 gap-y-4 text-sm">
          <Stat label="今日" value={data.counts.todayFound} />
          <Stat label="待分析" value={data.counts.pendingAi} />
          <Stat label="待確認" value={data.counts.needsReview} />
          <Stat label="已送" value={data.counts.sent} />
        </dl>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Button size="lg" onClick={() => void crawl()} disabled={busy}>
            開始海巡
          </Button>
          <Button variant="ghost" onClick={() => void prepareAi()} disabled={busy}>
            交給 Cursor
          </Button>
          <Button
            variant="ghost"
            disabled={busy || selected.length === 0}
            onClick={() => setConfirmOpen(true)}
          >
            送出 {selected.length || ""}
          </Button>
        </div>

        {aiWaiting && (
          <p className="mt-8 text-sm leading-7 text-muted-foreground">
            正在等待 Cursor 寫入分析結果，完成後列表會自動更新。
          </p>
        )}

        <div className="mt-10">
          <QueueNotice data={data} onRefresh={refresh} />
        </div>

        <Tabs defaultValue="posts" className="mt-14">
          <TabsList>
            <TabsTrigger value="posts">貼文</TabsTrigger>
            <TabsTrigger value="keywords">關鍵字</TabsTrigger>
            <TabsTrigger value="promo">推廣</TabsTrigger>
            <TabsTrigger value="login">登入</TabsTrigger>
          </TabsList>

          <TabsContent value="posts">
            {data.posts.length > 0 && (
              <div className="mb-6 flex items-baseline justify-between text-sm text-muted-foreground">
                <p>
                  {data.posts.length} 篇
                  {selected.length > 0 && <span className="ml-3">已選 {selected.length}</span>}
                </p>
                {selectable.length > 0 && (
                  <button
                    className="text-foreground/80 underline-offset-4 hover:underline"
                    onClick={() => setSelected(selectable.map((p) => p.id))}
                  >
                    全選可發送
                  </button>
                )}
              </div>
            )}
            <div className="space-y-5">
              {data.posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  checked={selected.includes(post.id)}
                  onToggle={(checked) =>
                    setSelected((cur) =>
                      checked ? [...cur, post.id] : cur.filter((id) => id !== post.id),
                    )
                  }
                  onEdit={() => {
                    setEditing(post);
                    setEditText(post.suggestedComment ?? "");
                  }}
                  onRefresh={refresh}
                  onReanalyze={(prompt) => {
                    if (prompt) void navigator.clipboard.writeText(prompt);
                    setAiWaiting(true);
                    toast.success("已準備重新分析");
                  }}
                />
              ))}
              {data.posts.length === 0 && (
                <div className="py-24 text-center">
                  <p className="text-[15px] leading-8 text-muted-foreground">
                    還沒有貼文。
                    <br />
                    按「開始海巡」即可；預設 Mock 模式不會碰到真實 Threads。
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="keywords">
            <KeywordsPanel keywords={data.keywords} onRefresh={refresh} />
          </TabsContent>
          <TabsContent value="promo">
            <PromotionForm initial={data.promotion} onSaved={refresh} />
          </TabsContent>
          <TabsContent value="login">
            <LoginPanel hasAuth={data.providers.hasPlaywrightAuth} />
          </TabsContent>
        </Tabs>

        {data.limitations[0] && (
          <p className="mt-16 max-w-xl text-xs leading-6 text-muted-foreground/80">
            {data.limitations[0]}
          </p>
        )}
      </main>

      {selected.length > 0 && (
        <div className="fixed bottom-8 left-1/2 z-40 flex -translate-x-1/2 items-center gap-5 rounded-full border bg-card/95 px-6 py-3 shadow-sm backdrop-blur">
          <span className="text-sm">已選 {selected.length} 篇</span>
          <Button size="sm" onClick={() => setConfirmOpen(true)}>
            送出
          </Button>
        </div>
      )}

      <ConfirmSendDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        posts={data.posts}
        selected={selected}
        mockMode={data.providers.mockMode}
        busy={busy}
        onConfirm={() => void sendSelected()}
      />
      <EditCommentDialog
        post={editing}
        text={editText}
        onTextChange={setEditText}
        onClose={() => setEditing(null)}
        onSaved={refresh}
      />
      <PromptDialog
        open={promptOpen}
        onOpenChange={setPromptOpen}
        prepared={prepared}
        onRunCli={() => void runCli()}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-2xl font-medium tracking-tight">{value}</dd>
    </div>
  );
}
