// 皮肤系统的配置类型与本地持久化逻辑。
//
// 面板使用 CSS；全局透镜由 FluidGlass 渲染，受 liquidEffects 开关控制。
//
// 原理：把用户选择的主题色/背景色/动效模式存到 localStorage，
// ThemeProvider 组件在客户端读取这份设置，把它们写成 CSS 变量挂在 <html> 上，
// globals.css 里的样式全部通过 var(--accent) 之类的变量取值，
// 这样"换主题"本质上只是改几个 CSS 变量的值，不需要重新渲染整个组件树。

export type BackgroundEffect = "drift" | "aurora" | "none";

export interface ThemePresetSettings {
  accent: string;
  background: string;
  backgroundImage?: string;
  backgroundEffect: BackgroundEffect;
  liquidEffects: boolean;
}

export interface ThemeSettings extends ThemePresetSettings {
  /** 用户保存的背景预设，最多保留 5 个 */
  customPresets: { id: string; name: string; settings: ThemePresetSettings }[];
}

export type ThemeCoreSettings = ThemePresetSettings;

export const DEFAULT_THEME: ThemeSettings = {
  accent: "#22d3ee", // 对应原来硬编码的 cyan-400 系
  background: "#05060a",
  backgroundImage: "",
  backgroundEffect: "drift",
  liquidEffects: true,
  customPresets: [],
};

/** 几套预设主题，方便用户一键切换，不用每次都手动调颜色 */
export const THEME_PRESETS: { name: string; settings: ThemePresetSettings }[] = [
  { name: "青蓝夜色（默认）", settings: { ...DEFAULT_THEME } },
  {
    name: "紫粉极光",
    settings: { accent: "#c084fc", background: "#0a0612", backgroundImage: "", backgroundEffect: "aurora", liquidEffects: true },
  },
  {
    name: "琥珀暖阳",
    settings: { accent: "#fbbf24", background: "#0c0a05", backgroundImage: "", backgroundEffect: "drift", liquidEffects: true },
  },
  {
    name: "极简静态",
    settings: { accent: "#67e8f9", background: "#050505", backgroundImage: "", backgroundEffect: "none", liquidEffects: false },
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
    const customPresets = Array.isArray(parsed.customPresets)
      ? parsed.customPresets
        .filter((preset: unknown): preset is { id: string; name: string; settings: ThemePresetSettings } => {
          if (!preset || typeof preset !== "object") return false;
          const candidate = preset as { id?: unknown; name?: unknown; settings?: unknown };
          return typeof candidate.id === "string"
            && typeof candidate.name === "string"
            && !!candidate.settings
            && typeof candidate.settings === "object";
        })
        .slice(0, 5)
      : [];
    return { ...DEFAULT_THEME, ...parsed, customPresets };
  } catch {
    return DEFAULT_THEME;
  }
}

/** 保存主题设置到 localStorage */
export function saveThemeSettings(settings: ThemeSettings): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
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
