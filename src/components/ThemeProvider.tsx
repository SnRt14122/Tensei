"use client";

// 皮肤系统的核心：客户端 Provider，负责
// 1. 挂载时从 localStorage 读取用户保存的主题设置
// 2. 把设置写成 CSS 变量挂在 <html> 元素上（globals.css 里的样式全部引用这些变量）
// 3. 提供一个 Context，让设置面板组件（ThemeSettingsPanel）可以修改设置并广播更新
// 4. 全局监听鼠标位置，把坐标写成 CSS 变量 --mouse-x/--mouse-y，
//    供"液态玻璃 hover 跟随光晕"效果使用（纯 CSS 方案：用 radial-gradient 定位在鼠标坐标）

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
  useEffect(() => {
    function handlePointerMove(e: PointerEvent) {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        document.documentElement.style.setProperty("--mouse-x", `${e.clientX}px`);
        document.documentElement.style.setProperty("--mouse-y", `${e.clientY}px`);
        rafRef.current = null;
      });
    }
    window.addEventListener("pointermove", handlePointerMove);
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, []);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}
