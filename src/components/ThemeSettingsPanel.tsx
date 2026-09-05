"use client";

// 皮肤设置面板：一个可以从导航栏打开的悬浮面板，让用户调整主题色/背景色/
// 背景动效/是否启用液态特效。所有修改立即生效（写 CSS 变量）并存 localStorage。

import { useState } from "react";
import { useTheme } from "./ThemeProvider";
import { THEME_PRESETS, type BackgroundEffect } from "@/lib/theme";

const BG_EFFECT_OPTIONS: { value: BackgroundEffect; label: string }[] = [
  { value: "drift", label: "几何漂浮" },
  { value: "aurora", label: "极光流动" },
  { value: "none", label: "关闭动效" },
];

export function ThemeSettingsPanel() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="liquid-btn rounded-full border border-white/15 px-3 py-1 text-xs text-white/60 hover:border-white/35 hover:text-white"
        aria-expanded={open}
        aria-label="皮肤设置"
      >
        🎨 皮肤
      </button>

      {open && (
        <div className="glass-panel slide-transition absolute right-0 top-full mt-2 w-72 rounded-2xl p-4 z-20">
          <p className="text-sm text-white font-medium mb-3">皮肤设置</p>

          <div className="mb-4">
            <p className="text-xs text-white/50 mb-2">预设主题</p>
            <div className="grid grid-cols-2 gap-2">
              {THEME_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => setTheme(preset.settings)}
                  className="liquid-btn rounded-lg border border-white/10 px-2 py-1.5 text-xs text-white/70 hover:border-white/30 hover:text-white text-left"
                >
                  <span
                    className="inline-block h-2 w-2 rounded-full mr-1.5"
                    style={{ backgroundColor: preset.settings.accent }}
                  />
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          <label className="mb-3 flex items-center justify-between text-xs text-white/60">
            主题色
            <input
              type="color"
              value={theme.accent}
              onChange={(e) => setTheme({ ...theme, accent: e.target.value })}
              className="h-6 w-10 cursor-pointer rounded border border-white/15 bg-transparent"
            />
          </label>

          <label className="mb-3 flex items-center justify-between text-xs text-white/60">
            背景色
            <input
              type="color"
              value={theme.background}
              onChange={(e) => setTheme({ ...theme, background: e.target.value })}
              className="h-6 w-10 cursor-pointer rounded border border-white/15 bg-transparent"
            />
          </label>

          <div className="mb-3">
            <p className="text-xs text-white/50 mb-2">背景动效</p>
            <div className="flex gap-2">
              {BG_EFFECT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTheme({ ...theme, backgroundEffect: opt.value })}
                  className={`liquid-btn rounded-full px-2.5 py-1 text-xs ${
                    theme.backgroundEffect === opt.value
                      ? "bg-cyan-500 text-black font-medium"
                      : "border border-white/15 text-white/60 hover:border-white/35 hover:text-white"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center justify-between text-xs text-white/60">
            液态玻璃 hover/click 特效
            <input
              type="checkbox"
              checked={theme.liquidEffects}
              onChange={(e) => setTheme({ ...theme, liquidEffects: e.target.checked })}
              className="h-4 w-4 cursor-pointer accent-cyan-400"
            />
          </label>
        </div>
      )}
    </div>
  );
}
