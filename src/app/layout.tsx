import type { Metadata } from "next";
import { Space_Grotesk, Noto_Sans_JP } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
});

const notoSansJP = Noto_Sans_JP({
  variable: "--font-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "単語 | 日语单词记忆",
  description: "记忆、检测日语单词，标注振假名，随时复习",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="zh-CN"
      className={`${spaceGrotesk.variable} ${notoSansJP.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
