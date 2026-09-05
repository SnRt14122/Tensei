"use client";

// 皮肤系统的核心：客户端 Provider，负责
// 1. 挂载时从 localStorage 读取用户保存的主题设置
// 2. 把设置写成 CSS 变量挂在 <html> 元素上（globals.css 里的样式全部引用这些变量）
// 3. 提供一个 Context，让设置面板组件（ThemeSettingsPanel）可以修改设置并广播更新
// 4. 全局监听鼠标位置，换算成"相对当前 hover 面板"的坐标，写到该面板自己的 CSS 变量
//    --mouse-x/--mouse-y 上，供"液态玻璃 hover 跟随光晕"效果使用
//    （纯 CSS 方案：用 radial-gradient 定位在鼠标坐标）

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  DEFAULT_THEME,
  hexToRgbString,
  loadThemeSettings,
  saveThemeSettings,
  type ThemeSettings,
} from "@/lib/theme";

interface ThemeContextValue {
  theme: ThemeSettings;
  setTheme: (next: ThemeSettings) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

/** 把主题设置对象应用为 <html> 上的 CSS 变量和 data-* 属性 */
function applyThemeToDocument(theme: ThemeSettings) {
  const root = document.documentElement;
  root.style.setProperty("--accent", theme.accent);
  root.style.setProperty("--accent-rgb", hexToRgbString(theme.accent));
  root.style.setProperty("--background", theme.background);
  // data-* 属性用于 CSS 选择器区分"要不要显示背景动效/液态特效"，
  // 比用 JS 逐个切换 class 更集中、globals.css 里管理起来更清晰
  root.setAttribute("data-bg-effect", theme.backgroundEffect);
  root.setAttribute("data-liquid-effects", theme.liquidEffects ? "on" : "off");
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // 用 useState 的惰性初始值直接读取 localStorage：
  // - 这个 Provider 只负责给 <html> 挂 CSS 变量，theme 状态本身不影响渲染出的 JSX 结构，
  //   所以服务端渲染时（loadThemeSettings 内部判断 window 为 undefined 返回默认值）
  //   和客户端水合时的初始值差异不会造成 hydration 内容不一致的报错。
  // - 比"先渲染默认值，再在 effect 里 setState 覆盖"更简洁，也避免了在 effect 里
  //   同步调用 setState 触发的连锁重渲染（React 官方不建议这种写法）。
  const [theme, setThemeState] = useState<ThemeSettings>(() => loadThemeSettings());
  const rafRef = useRef<number | null>(null);

  // 每次 theme 变化（包括挂载时的初始值）都同步应用到 <html> 的 CSS 变量上，
  // 这是"用外部系统（DOM）同步 React 状态"的标准 effect 用法。
  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  const setTheme = useCallback((next: ThemeSettings) => {
    setThemeState(next);
    saveThemeSettings(next);
  }, []);

  // 全局监听鼠标移动，把坐标写成 CSS 变量，用 requestAnimationFrame 节流，
  // 避免 mousemove 高频触发导致的性能问题（这是纯 CSS 液态 hover 效果的关键：
  // JS 只负责"告诉 CSS 鼠标在哪"，实际的模糊/渐变渲染都交给 CSS 处理，避免用 JS 逐帧画图）
  //
  // ⚠️ 之前这里把坐标写在 document.documentElement（<html>）上，值是 e.clientX/clientY
  // ——也就是"鼠标相对于整个浏览器视口的坐标"。但 .glass-panel::after 用的是
  // position: absolute + left/top: var(--mouse-x/--mouse-y)，而 .glass-panel 本身
  // 因为设置了 backdrop-filter，会被浏览器当成自己子元素的"定位基准"（CSS 规范里
  // backdrop-filter/transform/filter 都会创建新的 containing block）。
  // 结果就是：一个"视口坐标"被相对于"面板自己的左上角"重新解释了一遍，
  // 面板在页面上的位置离视口左上角越远（越靠右下），光晕就偏移得越厉害，
  // 正好对应用户反馈的"光晕跟不上鼠标，偏到右下方"。
  //
  // 修复思路：光晕要跟着鼠标在"当前这个面板内部"的相对位置走，不是视口位置。
  // 用 e.target.closest(".glass-panel") 找到鼠标正下方的面板（如果有），
  // 用该面板自己的 getBoundingClientRect() 换算出"鼠标相对这个面板左上角的坐标"，
  // 再把这两个变量写到这个面板自己的 style 上（而不是 <html> 上）——
  // 这样每个面板各自维护自己的坐标，互不影响，且和 backdrop-filter 造成的
  // "以面板自身为基准"这件事完全对齐。
  useEffect(() => {
    function handlePointerMove(e: PointerEvent) {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        const target = e.target as HTMLElement | null;
        const panel = target?.closest<HTMLElement>(".glass-panel");
        if (panel) {
          const rect = panel.getBoundingClientRect();
          panel.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
          panel.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
        }
        rafRef.current = null;
      });
    }
    window.addEventListener("pointermove", handlePointerMove);
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, []);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}
