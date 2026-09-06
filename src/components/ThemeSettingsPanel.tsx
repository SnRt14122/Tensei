"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "./ThemeProvider";
import { DEFAULT_THEME, THEME_PRESETS, type BackgroundEffect, type ThemeCoreSettings } from "@/lib/theme";

const BG_EFFECT_OPTIONS: { value: BackgroundEffect; label: string }[] = [
  { value: "drift", label: "几何漂浮" },
  { value: "aurora", label: "极光流动" },
  { value: "none", label: "关闭动效" },
];

function PresetSwatch({ settings }: { settings: ThemeCoreSettings }) {
  return <span className="theme-preset-swatch" style={{ backgroundColor: settings.background, backgroundImage: settings.backgroundImage ? `url(${settings.backgroundImage})` : undefined }} />;
}

export function ThemeSettingsPanel() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [imageError, setImageError] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  function applyPreset(settings: ThemeCoreSettings) {
    setTheme({ ...settings, customPresets: theme.customPresets });
  }

  function resetDefault() {
    setTheme({ ...DEFAULT_THEME, customPresets: theme.customPresets });
    setImageError("");
  }

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setImageError("请选择图片文件");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setImageError("图片不能超过 3 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setTheme({ ...theme, backgroundImage: reader.result });
        setImageError("");
      }
    };
    reader.onerror = () => setImageError("图片读取失败，请重试");
    reader.readAsDataURL(file);
  }

  function savePreset() {
    const name = presetName.trim() || `背景 ${theme.customPresets.length + 1}`;
    const nextPreset = {
      id: `custom-${Date.now().toString(36)}`,
      name: name.slice(0, 24),
      settings: {
        accent: theme.accent,
        background: theme.background,
        backgroundImage: theme.backgroundImage,
        backgroundEffect: theme.backgroundEffect,
        liquidEffects: theme.liquidEffects,
      },
    };
    setTheme({ ...theme, customPresets: [...theme.customPresets, nextPreset].slice(0, 5) });
    setPresetName("");
  }

  function removePreset(id: string) {
    setTheme({ ...theme, customPresets: theme.customPresets.filter((preset) => preset.id !== id) });
  }

  const panel = open ? createPortal(
    <div className="theme-settings-overlay" onPointerDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="theme-settings-dialog" role="dialog" aria-modal="true" aria-labelledby="theme-settings-title">
        <header className="theme-settings-header">
          <div><p className="theme-settings-kicker">APPEARANCE</p><h2 id="theme-settings-title">皮肤设置</h2></div>
          <button className="theme-icon-button" onClick={() => setOpen(false)} aria-label="关闭皮肤设置">×</button>
        </header>

        <div className="theme-settings-body">
          <section className="theme-settings-section">
            <div className="theme-section-heading"><div><h3>主题预设</h3><p>快速切换整套颜色与背景动效</p></div><button className="theme-text-button" onClick={resetDefault}>恢复默认</button></div>
            <div className="theme-preset-grid">
              {THEME_PRESETS.map((preset) => <button key={preset.name} className="theme-preset-button" onClick={() => applyPreset(preset.settings)}><PresetSwatch settings={preset.settings} /><span>{preset.name}</span></button>)}
            </div>
          </section>

          <section className="theme-settings-section">
            <div className="theme-section-heading"><div><h3>我的背景预设 <span>{theme.customPresets.length}/5</span></h3><p>保存当前颜色、图片和动效组合</p></div></div>
            {theme.customPresets.length > 0 && <div className="theme-preset-grid">{theme.customPresets.map((preset) => <div className="theme-custom-preset" key={preset.id}><button className="theme-preset-button" onClick={() => applyPreset(preset.settings)}><PresetSwatch settings={preset.settings} /><span>{preset.name}</span></button><button className="theme-preset-delete" onClick={() => removePreset(preset.id)} aria-label={`删除${preset.name}`}>×</button></div>)}</div>}
            <div className="theme-save-preset"><input value={presetName} onChange={(event) => setPresetName(event.target.value)} placeholder="预设名称（可选）" maxLength={24} /><button className="theme-primary-button" onClick={savePreset} disabled={theme.customPresets.length >= 5}>保存当前预设</button></div>
          </section>

          <section className="theme-settings-section">
            <div className="theme-section-heading"><div><h3>当前背景</h3><p>设置颜色，或使用一张本地图片</p></div></div>
            <div className="theme-background-controls">
              <label className="theme-control-row"><span>背景色</span><input type="color" value={theme.background} onChange={(event) => setTheme({ ...theme, background: event.target.value })} /></label>
              <div className="theme-image-control"><div><strong>背景图片</strong><p>{theme.backgroundImage ? "已添加本地图片" : "尚未添加图片"}</p></div><div className="theme-image-actions"><button className="theme-secondary-button" onClick={() => fileInputRef.current?.click()}>添加图片</button>{theme.backgroundImage && <button className="theme-text-button" onClick={() => setTheme({ ...theme, backgroundImage: "" })}>移除</button>}<input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} hidden /></div></div>
              {imageError && <p className="theme-error">{imageError}</p>}
            </div>
          </section>

          <section className="theme-settings-section theme-settings-section-last">
            <div className="theme-section-heading"><div><h3>交互效果</h3><p>控制背景动效和鼠标交互</p></div></div>
            <div className="theme-effect-options">{BG_EFFECT_OPTIONS.map((option) => <button key={option.value} className={theme.backgroundEffect === option.value ? "theme-effect-option active" : "theme-effect-option"} onClick={() => setTheme({ ...theme, backgroundEffect: option.value })}>{option.label}</button>)}</div>
            <label className="theme-toggle-row"><span><strong>液态玻璃交互</strong><small>保留按钮与卡片的悬停反馈</small></span><input type="checkbox" checked={theme.liquidEffects} onChange={(event) => setTheme({ ...theme, liquidEffects: event.target.checked })} /></label>
          </section>
        </div>
      </section>
    </div>, document.body,
  ) : null;

  return <><button className="liquid-btn theme-launch-button" onClick={() => setOpen(true)} aria-expanded={open} aria-label="打开皮肤设置"><span aria-hidden="true">◐</span> 皮肤</button>{panel}</>;
}
