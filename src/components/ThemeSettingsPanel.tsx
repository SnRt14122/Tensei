"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Check, Palette, RotateCcw, Save, Trash2, Upload, X } from "lucide-react";
import { createPortal } from "react-dom";
import { useTheme } from "./ThemeProvider";
import { DEFAULT_THEME, THEME_PRESETS, type BackgroundEffect, type ThemeCoreSettings, type ThemeSettings } from "@/lib/theme";

const BG_EFFECT_OPTIONS: { value: BackgroundEffect; label: string }[] = [
  { value: "drift", label: "几何漂浮" },
  { value: "aurora", label: "极光流动" },
  { value: "none", label: "关闭动效" },
];

function PresetSwatch({ settings }: { settings: ThemeCoreSettings }) {
  return <span aria-hidden="true" className="theme-preset-swatch" style={{ "--preview-accent": settings.accent, backgroundColor: settings.background, backgroundImage: settings.backgroundImage ? `url(${settings.backgroundImage})` : undefined } as CSSProperties}>
    {!settings.backgroundImage && (settings.backgroundEffect === "drift" ? <><span className="theme-preview-shape" /><span className="theme-preview-shape" /></> : settings.backgroundEffect === "aurora" ? <span className="theme-preview-aurora" /> : <span className="theme-preview-static" />)}
  </span>;
}

function isSameAppearance(left: ThemeCoreSettings, right: ThemeCoreSettings) {
  return left.accent === right.accent
    && left.background === right.background
    && (left.backgroundImage || "") === (right.backgroundImage || "")
    && left.backgroundEffect === right.backgroundEffect
    && left.liquidEffects === right.liquidEffects;
}

function PresetButton({ settings, active, children, onClick }: { settings: ThemeCoreSettings; active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button aria-pressed={active} className={active ? "theme-preset-button active" : "theme-preset-button"} onClick={onClick}>
      <PresetSwatch settings={settings} />
      <span className="theme-preset-name">{children}</span>
      {active && <span className="theme-preset-check" aria-label="当前选中"><Check size={14} /></span>}
    </button>
  );
}

export function ThemeSettingsPanel() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ThemeSettings>(theme);
  const [presetName, setPresetName] = useState("");
  const [imageError, setImageError] = useState("");
  const [saveError, setSaveError] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
      if (event.key === "Tab") {
        const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not([hidden]):not(:disabled)') ?? []);
        const target = event.shiftKey ? focusable.at(-1) : focusable[0];
        if ((event.shiftKey && document.activeElement === focusable[0]) || (!event.shiftKey && document.activeElement === focusable.at(-1))) { event.preventDefault(); target?.focus(); }
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    const trigger = triggerRef.current;
    return () => { document.removeEventListener("keydown", handleKeyDown); document.body.style.overflow = overflow; trigger?.focus(); };
  }, [open]);

  function applyPreset(settings: ThemeCoreSettings) {
    setDraft((current) => ({ ...settings, customPresets: current.customPresets }));
  }

  function resetDefault() {
    setDraft((current) => ({ ...DEFAULT_THEME, customPresets: current.customPresets }));
    setImageError("");
    setSaveError("");
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
    if (!setTheme(draft)) { setSaveError("保存失败：浏览器存储空间不足，请减少背景图片后重试。"); return; }
    setOpen(false);
  }

  const panel = open ? createPortal(
    <div className="theme-settings-overlay" onPointerDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section ref={dialogRef} className="theme-settings-dialog" role="dialog" aria-modal="true" aria-labelledby="theme-settings-title">
        <header className="theme-settings-header">
          <div><p className="theme-settings-kicker">APPEARANCE</p><h2 id="theme-settings-title">皮肤设置</h2></div>
          <button className="theme-icon-button" onClick={() => setOpen(false)} aria-label="关闭皮肤设置" title="关闭"><X size={18} /></button>
        </header>

        <div className="theme-settings-body">
          <section className="theme-settings-section">
            <div className="theme-section-heading"><h3>主题预设</h3><button className="theme-text-button" onClick={resetDefault}><RotateCcw size={14} />恢复默认</button></div>
            <div className="theme-preset-grid">
              {THEME_PRESETS.map((preset) => <PresetButton key={preset.name} settings={preset.settings} active={isSameAppearance(draft, preset.settings)} onClick={() => applyPreset(preset.settings)}>{preset.name}</PresetButton>)}
            </div>
          </section>

          <section className="theme-settings-section">
            <div className="theme-section-heading"><div><h3>我的背景预设 <span>{draft.customPresets.length}/5</span></h3></div></div>
            {draft.customPresets.length > 0 && <div className="theme-preset-grid">{draft.customPresets.map((preset) => <div className="theme-custom-preset" key={preset.id}><PresetButton settings={preset.settings} active={isSameAppearance(draft, preset.settings)} onClick={() => applyPreset(preset.settings)}>{preset.name}</PresetButton><button className="theme-preset-delete" onClick={() => removePreset(preset.id)} aria-label={`删除${preset.name}`} title={`删除${preset.name}`}><Trash2 size={14} /></button></div>)}</div>}
            <div className="theme-save-preset"><input value={presetName} onChange={(event) => setPresetName(event.target.value)} placeholder="预设名称（可选）" maxLength={24} /><button className="theme-primary-button" onClick={savePreset} disabled={draft.customPresets.length >= 5}>保存当前预设</button></div>
          </section>

          <section className="theme-settings-section">
            <div className="theme-section-heading"><div><h3>当前背景</h3></div></div>
            <div className="theme-background-controls">
              <label className="theme-control-row"><span>背景色</span><input type="color" value={draft.background} onChange={(event) => setDraft((current) => ({ ...current, background: event.target.value }))} /></label>
              <div className="theme-image-control"><div><strong>背景图片</strong><p>{draft.backgroundImage ? "已添加本地图片" : "尚未添加图片"}</p></div><div className="theme-image-actions"><button className="theme-secondary-button" onClick={() => fileInputRef.current?.click()}><Upload size={14} />添加图片</button>{draft.backgroundImage && <button className="theme-text-button" onClick={() => setDraft((current) => ({ ...current, backgroundImage: "" }))}>移除</button>}<input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} hidden /></div></div>
              {imageError && <p role="alert" className="theme-error">{imageError}</p>}
            </div>
          </section>

          <section className="theme-settings-section theme-settings-section-last">
            <div className="theme-section-heading"><div><h3>交互效果</h3></div></div>
            <div className="theme-effect-options">{BG_EFFECT_OPTIONS.map((option) => <button key={option.value} className={draft.backgroundEffect === option.value ? "theme-effect-option active" : "theme-effect-option"} onClick={() => setDraft((current) => ({ ...current, backgroundEffect: option.value }))}>{option.label}</button>)}</div>
            <label className="theme-toggle-row"><span><strong>液态玻璃交互</strong></span><input type="checkbox" checked={draft.liquidEffects} onChange={(event) => setDraft((current) => ({ ...current, liquidEffects: event.target.checked }))} /></label>
          </section>
        </div>
        <footer className="theme-settings-footer">{saveError && <p className="theme-error" role="alert">{saveError}</p>}<button className="theme-secondary-button" onClick={() => setOpen(false)}>取消</button><button className="theme-primary-button" onClick={saveChanges}><Save size={15} />保存修改</button></footer>
      </section>
    </div>, document.body,
  ) : null;

  return <><button ref={triggerRef} className="liquid-btn theme-launch-button" onClick={openSettings} aria-expanded={open} aria-label="打开皮肤设置"><Palette size={16} />皮肤</button>{panel}</>;
}
