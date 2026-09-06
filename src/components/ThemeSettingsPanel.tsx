"use client";

// 皮肤设置面板：一个可以从导航栏打开的悬浮面板，让用户调整主题色/背景色/
// 背景动效/是否启用液态特效。所有修改立即生效（写 CSS 变量）并存 localStorage。

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "./ThemeProvider";
import { THEME_PRESETS, type BackgroundEffect } from "@/lib/theme";
import FluidGlass from "./FluidGlass";

const BG_EFFECT_OPTIONS: { value: BackgroundEffect; label: string }[] = [
  { value: "drift", label: "几何漂浮" },
  { value: "aurora", label: "极光流动" },
  { value: "none", label: "关闭动效" },
];

export function ThemeSettingsPanel() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({ visibility: "hidden" });

  useEffect(() => {
    if (!open) return;

    function updatePosition() {
      const button = buttonRef.current;
      const panel = panelRef.current;
      if (!button || !panel) return;

      const buttonRect = button.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();
      const viewportPadding = 12;
      const gap = 10;

      let left = buttonRect.right - panelRect.width;
      left = Math.max(viewportPadding, Math.min(left, window.innerWidth - panelRect.width - viewportPadding));

      let top = buttonRect.bottom + gap;
      const maxTop = window.innerHeight - panelRect.height - viewportPadding;
      if (top > maxTop) {
        top = Math.max(viewportPadding, buttonRect.top - panelRect.height - gap);
      }

      setPanelStyle({
        position: "fixed",
        left,
        top,
        zIndex: 60,
        visibility: "visible",
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const panel = open
    ? createPortal(
      <div
        ref={panelRef}
        style={panelStyle}
        className="theme-popover glass-panel slide-transition w-[min(24rem,calc(100vw-1.5rem))] max-h-[calc(100vh-1.5rem)] overflow-hidden rounded-2xl shadow-2xl shadow-black/50"
      >
        <div className="pointer-events-none absolute inset-0 opacity-75">
          <FluidGlass
            mode="lens"
            lensProps={{
              scale: 0.18,
              ior: 1.12,
              thickness: 4,
              chromaticAberration: 0.08,
              anisotropy: 0.01,
            }}
            backgroundColor="#080a0e"
          />
        </div>

        <div className="relative z-10 p-4">
        <p className="mb-3 text-sm font-medium text-white">皮肤设置</p>

        <div className="mb-4">
          <p className="mb-2 text-xs text-white/50">预设主题</p>
          <div className="grid grid-cols-2 gap-2">
            {THEME_PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => setTheme(preset.settings)}
                className="liquid-btn rounded-lg border border-white/10 px-2 py-1.5 text-left text-xs text-white/70 hover:border-white/30 hover:text-white"
              >
                <span
                  className="mr-1.5 inline-block h-2 w-2 rounded-full"
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
          <p className="mb-2 text-xs text-white/50">背景动效</p>
          <div className="flex gap-2">
            {BG_EFFECT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTheme({ ...theme, backgroundEffect: opt.value })}
                className={`liquid-btn rounded-full px-2.5 py-1 text-xs ${
                  theme.backgroundEffect === opt.value
                    ? "bg-cyan-500 font-medium text-black"
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
      </div>,
      document.body,
    )
    : null;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen((o) => !o)}
        className="liquid-btn rounded-full border border-white/15 px-3 py-1 text-xs text-white/60 hover:border-white/35 hover:text-white"
        aria-expanded={open}
        aria-label="皮肤设置"
      >
        🎨 皮肤
      </button>
      {panel}
    </div>
  );
}
