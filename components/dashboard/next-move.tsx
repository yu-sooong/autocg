"use client";

import { Search, Sparkles, Send } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { Overview } from "./types";

type Props = {
  data: Overview;
  selectableCount: number;
  selectedCount: number;
  busy: boolean;
  onCrawl: () => void;
  onAnalyze: () => void;
  onSend: () => void;
};

export function NextMove({
  data,
  selectableCount,
  selectedCount,
  busy,
  onCrawl,
  onAnalyze,
  onSend,
}: Props) {
  const queued = (data.queue.counts.queued ?? 0) + (data.queue.counts.sending ?? 0);
  if (queued > 0) return null;

  if (data.posts.length === 0) {
    return (
      <Hero
        kicker="下一步"
        title="開始海巡"
        body="先找出適合交流的公開貼文。預設 Mock，不會真的發到 Threads。"
        action="開始海巡"
        icon={<Search className="h-4 w-4" />}
        busy={busy}
        onClick={onCrawl}
      />
    );
  }

  if (data.counts.pendingAi > 0 && selectableCount === 0) {
    return (
      <Hero
        kicker="下一步"
        title={`分析 ${data.counts.pendingAi} 篇`}
        body="關鍵字已過濾。交給 Cursor 寫建議留言，你稍後再確認。"
        action="交給 Cursor"
        icon={<Sparkles className="h-4 w-4" />}
        busy={busy}
        onClick={onAnalyze}
      />
    );
  }

  if (selectableCount > 0) {
    return (
      <Hero
        kicker="待你確認"
        title={`${selectableCount} 篇方案已寫好`}
        body="這一步一定會停下來等你。勾選後送出，或先改文案。"
        action={selectedCount > 0 ? `送出 ${selectedCount} 篇` : "先採用方案"}
        icon={<Send className="h-4 w-4" />}
        busy={busy}
        disabled={selectedCount === 0}
        onClick={onSend}
      />
    );
  }

  return (
    <Hero
      kicker="目前沒事"
      title="沒有待處理的貼文"
      body="可以再海巡一次，或到關鍵字／推廣調整條件。"
      action="開始海巡"
      icon={<Search className="h-4 w-4" />}
      busy={busy}
      onClick={onCrawl}
    />
  );
}

function Hero({
  kicker,
  title,
  body,
  action,
  icon,
  busy,
  disabled,
  onClick,
}: {
  kicker: string;
  title: string;
  body: string;
  action: string;
  icon: ReactNode;
  busy: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <section className="surface flex flex-col justify-between gap-8 rounded-[20px] px-7 py-7 md:flex-row md:items-end">
      <div className="max-w-xl">
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-primary">{kicker}</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight">{title}</h2>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">{body}</p>
      </div>
      <Button size="lg" disabled={busy || disabled} onClick={onClick}>
        {icon}
        {action}
      </Button>
    </section>
  );
}
