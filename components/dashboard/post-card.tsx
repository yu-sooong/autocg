"use client";

import { ExternalLink, Pencil, RotateCcw, SkipForward } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  const isProposal = Boolean(post.suggestedComment);
  const band = post.promotionScore === null ? null : scoreBand(post.promotionScore);

  return (
    <article
      className={cn(
        "surface rounded-[20px] px-6 py-6 transition-shadow hover:shadow-horizon",
        checked && "ring-2 ring-primary/25",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {isProposal ? "方案" : "待分析"}
          <span className="mx-2 text-border">·</span>
          {STATUS_LABEL[post.status] ?? post.status}
          {post.promotionScore !== null && (
            <>
              <span className="mx-2 text-border">·</span>
              <span className={band === "high" ? "text-primary" : ""}>
                {post.promotionScore} {scoreBandLabel(post.promotionScore)}
              </span>
            </>
          )}
          {post.riskLevel && (
            <>
              <span className="mx-2 text-border">·</span>
              風險 {post.riskLevel}
            </>
          )}
        </p>
        <p className="shrink-0 text-sm font-medium">{post.author}</p>
      </div>

      {isProposal ? (
        <blockquote className="mt-4 text-[17px] font-medium leading-8 tracking-tight">
          {post.suggestedComment}
        </blockquote>
      ) : (
        <p className="mt-4 text-[15px] leading-8 text-foreground/90">{post.text}</p>
      )}

      {isProposal && (
        <p className="mt-3 line-clamp-2 text-sm leading-7 text-muted-foreground">{post.text}</p>
      )}

      {post.reason && (
        <p className="mt-3 text-sm leading-7 text-muted-foreground">{post.reason}</p>
      )}

      {post.matchedKeywords.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {post.matchedKeywords.map((k) => (
            <Badge key={k} variant="secondary">
              {k}
            </Badge>
          ))}
        </div>
      )}

      {post.error && <p className="mt-4 text-sm text-destructive">{post.error}</p>}

      <footer className="mt-6 flex flex-wrap items-center gap-2">
        {selectable && (
          <Button size="sm" variant={checked ? "secondary" : "default"} onClick={() => onToggle(!checked)}>
            {checked ? "已選" : "採用"}
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" />
          改文案
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
        <span className="flex-1" />
        <Button variant="ghost" size="sm" asChild>
          <a href={post.url} target="_blank" rel="noreferrer">
            <ExternalLink className="h-3.5 w-3.5" />
            原文
          </a>
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
    </article>
  );
}
