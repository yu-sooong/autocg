"use client";

import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { jsonFetch, patchJson } from "./api";
import type { Overview, Promotion } from "./types";

export function KeywordsPanel({
  keywords,
  onRefresh,
}: {
  keywords: Overview["keywords"];
  onRefresh: () => Promise<unknown>;
}) {
  const [phrase, setPhrase] = useState("");

  async function addKeyword() {
    const next = phrase.trim();
    if (!next) return;
    await jsonFetch("/api/keywords", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phrase: next }),
    });
    setPhrase("");
    await onRefresh();
  }

  return (
    <section className="max-w-xl space-y-8">
      <div>
        <h2 className="text-lg font-medium tracking-tight">搜尋關鍵字</h2>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">
          海巡後先用這些詞過濾，再交給 Cursor 判斷是否適合交流。
        </p>
      </div>
      <div className="flex gap-2">
        <Input
          value={phrase}
          placeholder="新增關鍵字"
          onChange={(e) => setPhrase(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void addKeyword();
          }}
        />
        <Button onClick={() => void addKeyword()}>新增</Button>
      </div>
      <ul className="divide-y divide-border/80">
        {keywords.map((k) => (
          <li key={k.id} className="flex items-center justify-between py-4">
            <span className="text-sm">{k.phrase}</span>
            <div className="flex items-center gap-4">
              <Switch
                checked={k.enabled}
                onCheckedChange={(enabled) =>
                  void patchJson("/api/keywords", { id: k.id, enabled }).then(onRefresh)
                }
              />
              <button
                className="text-sm text-muted-foreground transition-colors hover:text-destructive"
                onClick={() =>
                  void jsonFetch(`/api/keywords?id=${k.id}`, { method: "DELETE" }).then(onRefresh)
                }
              >
                刪除
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function PromotionForm({
  initial,
  onSaved,
}: {
  initial: Promotion;
  onSaved: () => Promise<unknown>;
}) {
  const [form, setForm] = useState(initial);
  useEffect(() => setForm(initial), [initial]);

  function splitList(value: string) {
    return value
      .split(/[、,]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  return (
    <section className="max-w-xl space-y-8">
      <div>
        <h2 className="text-lg font-medium tracking-tight">推廣設定</h2>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">
          Cursor 會讀這份設定。請寫真實、可核對的介紹，不要讓 AI 改它。
        </p>
      </div>
      <Field label="網站名稱">
        <Input
          value={form.websiteName}
          onChange={(e) => setForm({ ...form, websiteName: e.target.value })}
        />
      </Field>
      <Field label="網站 URL">
        <Input
          value={form.websiteUrl}
          onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })}
        />
      </Field>
      <Field label="網站介紹">
        <Textarea
          rows={4}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </Field>
      <Field label="目標受眾（逗號分隔）">
        <Input
          value={form.targetAudience.join("、")}
          onChange={(e) => setForm({ ...form, targetAudience: splitList(e.target.value) })}
        />
      </Field>
      <Field label="推廣主題（逗號分隔）">
        <Input
          value={form.promotionTopics.join("、")}
          onChange={(e) => setForm({ ...form, promotionTopics: splitList(e.target.value) })}
        />
      </Field>
      <Field label="語氣">
        <Input value={form.tone} onChange={(e) => setForm({ ...form, tone: e.target.value })} />
      </Field>
      <Button
        onClick={() =>
          void jsonFetch("/api/promotion", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
          }).then(() => {
            toast.success("已儲存推廣設定");
            return onSaved();
          })
        }
      >
        儲存
      </Button>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function LoginPanel({ hasAuth }: { hasAuth: boolean }) {
  return (
    <section className="max-w-xl space-y-6">
      <div>
        <h2 className="text-lg font-medium tracking-tight">Threads 登入</h2>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">
          使用獨立 Chromium profile，不會碰你的 Chrome 主帳號，也不會讀取密碼。
        </p>
      </div>
      <p className="text-sm">{hasAuth ? "Session 已存在" : "尚未登入"}</p>
      <p className="text-sm leading-7 text-muted-foreground">
        建議在終端機執行 <code className="rounded bg-muted px-1.5 py-0.5 text-[13px]">pnpm threads:login</code>
        。登入完成後按 Enter 儲存。
      </p>
      <Button
        variant="outline"
        onClick={() =>
          void jsonFetch<{ message: string }>("/api/login", { method: "POST" }).then((r) =>
            toast.message(r.message),
          )
        }
      >
        開啟 Threads 登入
      </Button>
    </section>
  );
}
