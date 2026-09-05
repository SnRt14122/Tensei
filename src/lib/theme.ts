// 皮肤系统的配置类型与本地持久化逻辑。
//
// 设计取向（用户已确认）：全部用纯 CSS 方案实现视觉效果（backdrop-filter、渐变、
// transform、CSS 变量），不引入额外的动画/WebGL 库，保持轻量、所有设备兼容性好。
//
// 原理：把用户选择的主题色/背景色/动效模式存到 localStorage，
// ThemeProvider 组件在客户端读取这份设置，把它们写成 CSS 变量挂在 <html> 上，
// globals.css 里的样式全部通过 var(--accent) 之类的变量取值，
// 这样"换主题"本质上只是改几个 CSS 变量的值，不需要重新渲染整个组件树。

export type BackgroundEffect = "drift" | "aurora" | "none";

export interface ThemeSettings {
  /** 主题强调色（用于按钮、高光、边框等），CSS 颜色值，例如 "#22d3ee" */
  accent: string;
  /** 背景基础色 */
  background: string;
  /** 背景动效模式：几何形状漂浮 / 极光渐变流动 / 关闭动效 */
  backgroundEffect: BackgroundEffect;
  /** 是否启用 hover/click 的液态玻璃交互特效（关闭后退化为普通的颜色过渡，性能更省） */
  liquidEffects: boolean;
}

export const DEFAULT_THEME: ThemeSettings = {
  accent: "#22d3ee", // 对应原来硬编码的 cyan-400 系
  background: "#05060a",
  backgroundEffect: "drift",
  liquidEffects: true,
};

/** 几套预设主题，方便用户一键切换，不用每次都手动调颜色 */
export const THEME_PRESETS: { name: string; settings: ThemeSettings }[] = [
  { name: "青蓝夜色（默认）", settings: DEFAULT_THEME },
  {
    name: "紫粉极光",
    settings: { accent: "#c084fc", background: "#0a0612", backgroundEffect: "aurora", liquidEffects: true },
  },
  {
    name: "琥珀暖阳",
    settings: { accent: "#fbbf24", background: "#0c0a05", backgroundEffect: "drift", liquidEffects: true },
  },
  {
    name: "极简静态",
    settings: { accent: "#67e8f9", background: "#050505", backgroundEffect: "none", liquidEffects: false },
  },
];

const STORAGE_KEY = "tenseiing-theme-settings";

/** 从 localStorage 读取用户保存的主题设置，没有则返回默认值 */
export function loadThemeSettings(): ThemeSettings {
  if (typeof window === "undefined") return DEFAULT_THEME;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_THEME;
    const parsed = JSON.parse(raw);
    // 简单合并默认值，防止旧版本存的设置缺字段导致 undefined
    return { ...DEFAULT_THEME, ...parsed };
  } catch {
    return DEFAULT_THEME;
  }
}

/** 保存主题设置到 localStorage */
export function saveThemeSettings(settings: ThemeSettings): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

/** 把十六进制颜色转成 "r, g, b" 字符串，供 CSS rgba() 函数拼接透明度用 */
export function hexToRgbString(hex: string): string {
  const normalized = hex.replace("#", "");
  const bigint = parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `${r}, ${g}, ${b}`;
}
