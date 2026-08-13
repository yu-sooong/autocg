"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  FileText,
  KeyRound,
  Megaphone,
  Search,
  Sparkles,
  Tags,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { canSendPost } from "@/lib/queue/logic";
import { jsonFetch, postJson } from "./api";
import { ConfirmSendDialog, EditCommentDialog, PromptDialog, QueueNotice } from "./dialogs";
import { NextMove } from "./next-move";
import { PostCard } from "./post-card";
import { KeywordsPanel, LoginPanel, PromotionForm } from "./settings";
import type { Overview, Post, PreparedAi } from "./types";

const HIDDEN = new Set(["sent", "skipped"]);

const NAV = [
  { value: "posts", label: "貼文", icon: FileText },
  { value: "keywords", label: "關鍵字", icon: Tags },
  { value: "promo", label: "推廣", icon: Megaphone },
  { value: "login", label: "登入", icon: KeyRound },
] as const;

const TITLES: Record<string, { crumb: string; title: string }> = {
  posts: { crumb: "海巡", title: "貼文總覽" },
  keywords: { crumb: "設定", title: "搜尋關鍵字" },
  promo: { crumb: "設定", title: "推廣設定" },
  login: { crumb: "設定", title: "Threads 登入" },
};

export function Dashboard() {
  const [data, setData] = useState<Overview | null>(null);
  const [tab, setTab] = useState("posts");
  const [scope, setScope] = useState<"actionable" | "all">("actionable");
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
  const visiblePosts = useMemo(() => {
    if (!data) return [];
    if (scope === "all") return data.posts;
    return data.posts.filter((p) => !HIDDEN.has(p.status));
  }, [data, scope]);

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

  const page = TITLES[tab] ?? TITLES.posts;

  return (
    <Tabs value={tab} onValueChange={setTab} className="min-h-screen">
      <aside className="fixed inset-y-4 left-4 z-20 hidden w-[250px] flex-col rounded-[20px] bg-card px-4 py-6 shadow-horizon xl:flex">
        <div className="mb-8 flex items-center gap-3 px-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
            a
          </span>
          <div>
            <p className="text-[15px] font-bold tracking-tight">autocg</p>
            <p className="text-xs text-muted-foreground">海巡後台</p>
          </div>
        </div>
        <p className="mb-2 px-4 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Menu
        </p>
        <TabsList>
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <TabsTrigger key={item.value} value={item.value}>
                <Icon className="h-4 w-4" />
                {item.label}
                <span className="absolute -right-4 top-1/2 h-8 w-1 -translate-y-1/2 rounded-l-full bg-primary opacity-0 group-data-[state=active]:opacity-100" />
              </TabsTrigger>
            );
          })}
        </TabsList>
        <div className="mt-auto rounded-2xl bg-gradient-to-br from-primary to-[hsl(152_22%_28%)] p-5 text-primary-foreground">
          <p className="text-sm font-semibold">{data.providers.mockMode ? "Mock 模式" : "真實模式"}</p>
          <p className="mt-1 text-xs leading-5 text-white/80">
            發現 {data.providers.discovery} · 今日 {data.queue.dailyCount}/
            {data.queue.maxDailyActions}
          </p>
        </div>
      </aside>

      <div className="xl:pl-[282px]">
        <header className="flex flex-wrap items-center justify-between gap-4 px-4 pb-2 pt-6 sm:px-8">
          <div>
            <p className="text-sm text-muted-foreground">
              Pages / {page.crumb}
            </p>
            <h1 className="mt-1 text-[28px] font-bold tracking-tight">{page.title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center rounded-full bg-card px-4 py-2 text-sm text-muted-foreground shadow-horizon sm:flex">
              冷卻 {data.queue.authorCooldownDays} 天
            </div>
            <Badge variant={data.providers.mockMode ? "warning" : "success"}>
              {data.providers.mockMode ? "Mock" : "真實"}
            </Badge>
          </div>
        </header>

        <nav className="mx-4 mb-2 flex gap-2 overflow-auto xl:hidden">
          {NAV.map((item) => (
            <Button
              key={item.value}
              size="sm"
              variant={tab === item.value ? "default" : "secondary"}
              onClick={() => setTab(item.value)}
            >
              {item.label}
            </Button>
          ))}
        </nav>

        <main className="px-4 pb-24 pt-4 sm:px-8">
          {tab === "posts" && (
            <div className="space-y-5">
              <NextMove
                data={data}
                selectableCount={selectable.length}
                selectedCount={selected.length}
                busy={busy}
                onCrawl={() => void crawl()}
                onAnalyze={() => void prepareAi()}
                onSend={() => setConfirmOpen(true)}
              />

              <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                <Stat icon={BarChart3} label="今日發現" value={data.counts.todayFound} />
                <Stat icon={Sparkles} label="待分析" value={data.counts.pendingAi} />
                <Stat icon={FileText} label="待確認" value={data.counts.needsReview} />
                <Stat icon={Search} label="已發送" value={data.counts.sent} />
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" size="sm" disabled={busy} onClick={() => void crawl()}>
                  <Search className="h-3.5 w-3.5" />
                  再海巡
                </Button>
                <Button variant="outline" size="sm" disabled={busy} onClick={() => void prepareAi()}>
                  <Sparkles className="h-3.5 w-3.5" />
                  再分析
                </Button>
              </div>

              {aiWaiting && (
                <div className="surface flex items-center gap-3 rounded-[20px] px-5 py-3 text-sm">
                  <span className="agent-pulse h-2.5 w-2.5 rounded-full bg-primary" />
                  Cursor 正在分析 · 寫入後會自動更新
                </div>
              )}

              <QueueNotice data={data} onRefresh={refresh} />
            </div>
          )}

          <TabsContent value="posts">
            {data.posts.length > 0 && (
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex rounded-full bg-card p-1 shadow-horizon">
                  <FilterChip
                    active={scope === "actionable"}
                    onClick={() => setScope("actionable")}
                    label="待處理"
                  />
                  <FilterChip active={scope === "all"} onClick={() => setScope("all")} label="全部" />
                </div>
                {selectable.length > 0 && (
                  <button
                    className="text-sm font-medium text-primary"
                    onClick={() => setSelected(selectable.map((p) => p.id))}
                  >
                    全選可發送
                  </button>
                )}
              </div>
            )}
            <div className="space-y-4">
              {visiblePosts.map((post) => (
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
              {visiblePosts.length === 0 && data.posts.length > 0 && (
                <p className="py-16 text-center text-sm text-muted-foreground">
                  沒有待處理貼文。切到「全部」可看歷史。
                </p>
              )}
              {data.posts.length === 0 && (
                <div className="surface rounded-[20px] py-20 text-center">
                  <p className="text-[15px] leading-8 text-muted-foreground">
                    還沒有貼文。按上方「開始海巡」即可。
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
        </main>
      </div>

      {selected.length > 0 && (
        <div className="surface fixed bottom-8 left-1/2 z-40 flex -translate-x-1/2 items-center gap-5 rounded-full px-6 py-3 xl:left-[calc(50%+125px)]">
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
    </Tabs>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof FileText;
}) {
  return (
    <div className="surface flex items-center gap-4 rounded-[20px] px-5 py-5">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-[22px] font-bold leading-none tracking-tight">{value}</p>
      </div>
    </div>
  );
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={
        active
          ? "rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground"
          : "rounded-full px-4 py-1.5 text-sm text-muted-foreground hover:text-foreground"
      }
    >
      {label}
    </button>
  );
}
