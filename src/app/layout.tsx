import type { Metadata } from "next";
import { Space_Grotesk, Noto_Sans_JP } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AmbientBackground } from "@/components/AmbientBackground";
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
      <body className="min-h-full flex flex-col">
        {/* ThemeProvider 挂在最外层，负责把用户保存的皮肤设置应用成 CSS 变量 */}
        <ThemeProvider>
          {/* 背景动效装饰层挂在根布局里，保证所有页面（不只是首页）都能正常显示
              "几何漂浮/极光流动"背景特效，修复之前"背景特效没有显示"的问题 */}
          <AmbientBackground />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
