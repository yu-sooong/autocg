"use client";

import { ExternalLink, Pencil, RotateCcw, SkipForward } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { canSendPost } from "@/lib/queue/logic";
import { scoreBand, scoreBandLabel } from "@/lib/schema";
import { cn } from "@/lib/utils";
import { patchJson, postJson } from "./api";
import { STATUS_LABEL } from "./constants";
import type { Post } from "./types";

type Props = {
  post: Post;
  checked: boolean;
  onToggle: (checked: boolean) => void;
  onEdit: () => void;
  onRefresh: () => Promise<unknown>;
  onReanalyze: (prompt?: string) => void;
};

export function PostCard({ post, checked, onToggle, onEdit, onRefresh, onReanalyze }: Props) {
  const selectable = canSendPost(post);
  const band = post.promotionScore === null ? null : scoreBand(post.promotionScore);

  return (
    <article
      className={cn(
        "rounded-2xl border border-border/80 bg-card px-6 py-7 transition-colors",
        checked && "border-foreground/20 bg-accent/40",
      )}
    >
      <div className="flex gap-5">
        <div className="pt-1">
          <Checkbox
            checked={checked}
            disabled={!selectable}
            onCheckedChange={(v) => onToggle(Boolean(v))}
            aria-label={`選擇 ${post.author}`}
          />
        </div>

        <div className="min-w-0 flex-1">
          <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
            <p className="text-[15px] font-medium tracking-tight">{post.author}</p>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{STATUS_LABEL[post.status] ?? post.status}</span>
              {post.promotionScore !== null && (
                <span className={band === "high" ? "text-foreground" : ""}>
                  {post.promotionScore} · {scoreBandLabel(post.promotionScore)}
                </span>
              )}
              {post.riskLevel && <span>風險 {post.riskLevel}</span>}
            </div>
          </header>

          <p className="mt-4 max-w-2xl text-[15px] leading-8 text-foreground/90">{post.text}</p>

          {post.matchedKeywords.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {post.matchedKeywords.map((k) => (
                <Badge key={k} variant="secondary">
                  {k}
                </Badge>
              ))}
            </div>
          )}

          {post.reason && (
            <p className="mt-5 max-w-2xl text-sm leading-7 text-muted-foreground">{post.reason}</p>
          )}

          {post.suggestedComment && (
            <blockquote className="mt-5 max-w-2xl border-l-2 border-border pl-4 text-[15px] leading-8 text-foreground/80">
              {post.suggestedComment}
            </blockquote>
          )}

          {post.error && <p className="mt-4 text-sm text-destructive">{post.error}</p>}

          <footer className="mt-6 flex flex-wrap items-center gap-1">
            <Button variant="ghost" size="sm" asChild>
              <a href={post.url} target="_blank" rel="noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
                查看
              </a>
            </Button>
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
              編輯
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                void postJson<{ prompt?: string }>("/api/posts", {
                  action: "reanalyze",
                  id: post.id,
                }).then((result) => onReanalyze(result.prompt))
              }
            >
              <RotateCcw className="h-3.5 w-3.5" />
              再分析
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                void patchJson("/api/posts", { id: post.id, status: "skipped" }).then(onRefresh)
              }
            >
              <SkipForward className="h-3.5 w-3.5" />
              跳過
            </Button>
            {post.status === "failed" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  void postJson("/api/queue", { action: "retry", id: post.id }).then(onRefresh)
                }
              >
                重試
              </Button>
            )}
          </footer>
        </div>
      </div>
    </article>
  );
}
