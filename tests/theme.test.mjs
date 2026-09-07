import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { DEFAULT_THEME, loadThemeSettings, saveThemeSettings } from '../src/lib/theme.ts';

function storage(value) {
  let raw = value === undefined ? null : JSON.stringify(value);
  globalThis.window = { localStorage: { getItem: () => raw, setItem: (_, next) => { raw = next; } } };
}
afterEach(() => { delete globalThis.window; });

test('legacy settings preserve the enabled and disabled states', () => {
  storage({ liquidEffects: true });
  assert.equal(loadThemeSettings().cursorEffect, 'glass');
  storage({ liquidEffects: false });
  assert.equal(loadThemeSettings().liquidEffects, false);
  assert.equal(loadThemeSettings().borderGlow, false);
});

test('glow selection and custom presets survive save and reload', () => {
  storage();
  const settings = { ...DEFAULT_THEME, cursorEffect: 'glow', borderGlow: false, customPresets: [{ id: 'one', name: 'Glow', settings: { ...DEFAULT_THEME, cursorEffect: 'glow', borderGlow: false } }] };
  assert.equal(saveThemeSettings(settings), true);
  assert.equal(loadThemeSettings().cursorEffect, 'glow');
  assert.equal(loadThemeSettings().customPresets[0].settings.cursorEffect, 'glow');
  assert.equal(loadThemeSettings().borderGlow, false);
  assert.equal(loadThemeSettings().customPresets[0].settings.borderGlow, false);
});

test('legacy custom presets get defaults without losing their appearance', () => {
  storage({ customPresets: [{ id: 'old', name: 'Old', settings: { accent: '#abcdef', liquidEffects: false, backgroundImage: 'data:image/png;base64,test' } }] });
  const preset = loadThemeSettings().customPresets[0].settings;
  assert.equal(preset.cursorEffect, 'glass');
  assert.equal(preset.accent, '#abcdef');
  assert.equal(preset.liquidEffects, false);
  assert.equal(preset.backgroundImage, 'data:image/png;base64,test');
  assert.equal(preset.background, DEFAULT_THEME.background);
});

test('unknown modes and malformed storage fall back safely', () => {
  storage({ cursorEffect: 'unknown', customPresets: [null, {}, ...Array.from({ length: 7 }, (_, i) => ({ id: String(i), name: 'Test', settings: {} }))] });
  assert.equal(loadThemeSettings().cursorEffect, 'glass');
  assert.equal(loadThemeSettings().customPresets.length, 5);
  storage(null);
  assert.deepEqual(loadThemeSettings(), DEFAULT_THEME);
});

test('failed persistence reports failure instead of applying an unsaved mode', () => {
  globalThis.window = { localStorage: { setItem: () => { throw new Error('Quota exceeded'); } } };
  assert.equal(saveThemeSettings({ ...DEFAULT_THEME, cursorEffect: 'glow' }), false);
});
