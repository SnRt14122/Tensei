"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "./ThemeProvider";
import { DEFAULT_THEME, THEME_PRESETS, type BackgroundEffect, type ThemeCoreSettings, type ThemeSettings } from "@/lib/theme";

const BG_EFFECT_OPTIONS: { value: BackgroundEffect; label: string }[] = [
  { value: "drift", label: "几何漂浮" },
  { value: "aurora", label: "极光流动" },
  { value: "none", label: "关闭动效" },
];

function PresetSwatch({ settings }: { settings: ThemeCoreSettings }) {
  return <span className="theme-preset-swatch" style={{ backgroundColor: settings.background, backgroundImage: settings.backgroundImage ? `url(${settings.backgroundImage})` : undefined }} />;
}

function isSameAppearance(left: ThemeCoreSettings, right: ThemeCoreSettings) {
  return left.accent === right.accent
    && left.background === right.background
    && left.backgroundImage === right.backgroundImage
    && left.backgroundEffect === right.backgroundEffect
    && left.liquidEffects === right.liquidEffects;
}

function PresetButton({ settings, active, children, onClick }: { settings: ThemeCoreSettings; active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button className={active ? "theme-preset-button active" : "theme-preset-button"} onClick={onClick}>
      <PresetSwatch settings={settings} />
      <span>{children}</span>
      {active && <span className="theme-preset-check" aria-label="当前选中">✓</span>}
    </button>
  );
}

export function ThemeSettingsPanel() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ThemeSettings>(theme);
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
    setDraft((current) => ({ ...settings, customPresets: current.customPresets }));
  }

  function resetDefault() {
    setDraft((current) => ({ ...DEFAULT_THEME, customPresets: current.customPresets }));
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
        setDraft((current) => ({ ...current, backgroundImage: reader.result as string }));
        setImageError("");
      }
    };
    reader.onerror = () => setImageError("图片读取失败，请重试");
    reader.readAsDataURL(file);
  }

  function savePreset() {
    const name = presetName.trim() || `背景 ${draft.customPresets.length + 1}`;
    const nextPreset = {
      id: `custom-${Date.now().toString(36)}`,
      name: name.slice(0, 24),
      settings: {
        accent: draft.accent,
        background: draft.background,
        backgroundImage: draft.backgroundImage,
        backgroundEffect: draft.backgroundEffect,
        liquidEffects: draft.liquidEffects,
      },
    };
    setDraft((current) => ({ ...current, customPresets: [...current.customPresets, nextPreset].slice(0, 5) }));
    setPresetName("");
  }

  function removePreset(id: string) {
    setDraft((current) => ({ ...current, customPresets: current.customPresets.filter((preset) => preset.id !== id) }));
  }

  function openSettings() {
    setDraft(theme);
    setImageError("");
    setOpen(true);
  }

  function saveChanges() {
    setTheme(draft);
    setOpen(false);
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
              {THEME_PRESETS.map((preset) => <PresetButton key={preset.name} settings={preset.settings} active={isSameAppearance(draft, preset.settings)} onClick={() => applyPreset(preset.settings)}>{preset.name}</PresetButton>)}
            </div>
          </section>

          <section className="theme-settings-section">
            <div className="theme-section-heading"><div><h3>我的背景预设 <span>{draft.customPresets.length}/5</span></h3><p>保存当前颜色、图片和动效组合</p></div></div>
            {draft.customPresets.length > 0 && <div className="theme-preset-grid">{draft.customPresets.map((preset) => <div className="theme-custom-preset" key={preset.id}><PresetButton settings={preset.settings} active={isSameAppearance(draft, preset.settings)} onClick={() => applyPreset(preset.settings)}>{preset.name}</PresetButton><button className="theme-preset-delete" onClick={() => removePreset(preset.id)} aria-label={`删除${preset.name}`}>×</button></div>)}</div>}
            <div className="theme-save-preset"><input value={presetName} onChange={(event) => setPresetName(event.target.value)} placeholder="预设名称（可选）" maxLength={24} /><button className="theme-primary-button" onClick={savePreset} disabled={draft.customPresets.length >= 5}>保存当前预设</button></div>
          </section>

          <section className="theme-settings-section">
            <div className="theme-section-heading"><div><h3>当前背景</h3><p>设置颜色，或使用一张本地图片</p></div></div>
            <div className="theme-background-controls">
              <label className="theme-control-row"><span>背景色</span><input type="color" value={draft.background} onChange={(event) => setDraft((current) => ({ ...current, background: event.target.value }))} /></label>
              <div className="theme-image-control"><div><strong>背景图片</strong><p>{draft.backgroundImage ? "已添加本地图片" : "尚未添加图片"}</p></div><div className="theme-image-actions"><button className="theme-secondary-button" onClick={() => fileInputRef.current?.click()}>添加图片</button>{draft.backgroundImage && <button className="theme-text-button" onClick={() => setDraft((current) => ({ ...current, backgroundImage: "" }))}>移除</button>}<input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} hidden /></div></div>
              {imageError && <p className="theme-error">{imageError}</p>}
            </div>
          </section>

          <section className="theme-settings-section theme-settings-section-last">
            <div className="theme-section-heading"><div><h3>交互效果</h3><p>控制背景动效和鼠标交互</p></div></div>
            <div className="theme-effect-options">{BG_EFFECT_OPTIONS.map((option) => <button key={option.value} className={draft.backgroundEffect === option.value ? "theme-effect-option active" : "theme-effect-option"} onClick={() => setDraft((current) => ({ ...current, backgroundEffect: option.value }))}>{option.label}</button>)}</div>
            <label className="theme-toggle-row"><span><strong>液态玻璃交互</strong><small>保留按钮与卡片的悬停反馈</small></span><input type="checkbox" checked={draft.liquidEffects} onChange={(event) => setDraft((current) => ({ ...current, liquidEffects: event.target.checked }))} /></label>
          </section>
        </div>
        <footer className="theme-settings-footer"><button className="theme-secondary-button" onClick={() => setOpen(false)}>取消</button><button className="theme-primary-button" onClick={saveChanges}>保存修改</button></footer>
      </section>
    </div>, document.body,
  ) : null;

  return <><button className="liquid-btn theme-launch-button" onClick={openSettings} aria-expanded={open} aria-label="打开皮肤设置"><span aria-hidden="true">◐</span> 皮肤</button>{panel}</>;
}
