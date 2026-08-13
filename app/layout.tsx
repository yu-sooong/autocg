import type { Metadata } from "next";
import { DM_Sans, Noto_Sans_TC } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const notoSans = Noto_Sans_TC({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-cjk",
  display: "swap",
});

export const metadata: Metadata = {
  title: "autocg · Threads 海巡助手",
  description: "本機開源工具：發現公開貼文、Cursor 分析、確認後再送出",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body className={`${dmSans.variable} ${notoSans.variable} font-sans`}>
        {children}
        <Toaster position="top-right" theme="light" richColors />
      </body>
    </html>
  );
}
