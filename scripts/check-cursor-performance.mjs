// Run against `npm run build && npm start`, with Playwright available locally.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3100';
const output = process.env.TEST_OUTPUT_DIR || '/tmp/tensei-performance';
const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

try {
  await mkdir(output, { recursive: true });
  const desktop = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  desktop.on('pageerror', error => errors.push(error.message));
  await desktop.addInitScript(() => {
    window.__cursorPerf = { draws: 0, clones: 0 };
    for (const type of [WebGLRenderingContext, WebGL2RenderingContext]) {
      for (const key of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced']) {
        const original = type.prototype[key];
        if (!original) continue;
        type.prototype[key] = function (...args) { window.__cursorPerf.draws++; return original.apply(this, args); };
      }
    }
    const clone = Node.prototype.cloneNode;
    Node.prototype.cloneNode = function (...args) { window.__cursorPerf.clones++; return clone.apply(this, args); };
  });
  await desktop.goto(`${base}/login`);
  await desktop.waitForTimeout(2500);
  assert.equal(await desktop.locator('canvas').count(), 0, '3D must not load before pointer use');
  const initialJsBytes = await desktop.evaluate(() => performance.getEntriesByType('resource').filter(entry => entry.name.includes('.js')).reduce((sum, entry) => sum + entry.encodedBodySize, 0));
  await desktop.mouse.move(640, 240);
  await desktop.waitForFunction(() => window.__cursorPerf.draws > 0 && window.__cursorPerf.clones > 0);
  await desktop.waitForTimeout(1500);
  const before = await desktop.evaluate(() => ({ ...window.__cursorPerf }));
  await desktop.waitForTimeout(3000);
  const after = await desktop.evaluate(() => ({ ...window.__cursorPerf }));
  assert.equal(after.draws - before.draws, 0, 'stationary cursor must not keep rendering');
  assert.equal(after.clones - before.clones, 0, 'unchanged page must not keep being captured');
  await desktop.mouse.move(700, 320);
  await desktop.waitForFunction(count => window.__cursorPerf.draws > count, after.draws);
  assert.equal(await desktop.locator('.fluid-glass-cursor').getAttribute('data-visible'), 'true');
  await desktop.screenshot({ path: `${output}/desktop.png` });

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await mobile.goto(`${base}/login`);
  await mobile.getByRole('textbox').first().tap();
  await mobile.waitForTimeout(1500);
  assert.equal(await mobile.locator('canvas').count(), 0, 'touch must not load the mouse lens');
  assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await mobile.screenshot({ path: `${output}/mobile.png` });

  const reduced = await browser.newPage({ reducedMotion: 'reduce' });
  await reduced.goto(`${base}/login`);
  await reduced.mouse.move(640, 240);
  await reduced.waitForTimeout(1000);
  assert.equal(await reduced.locator('canvas').count(), 0);

  const glow = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  glow.on('pageerror', error => errors.push(error.message));
  await glow.addInitScript(() => localStorage.setItem('tenseiing-theme-settings', JSON.stringify({ liquidEffects: true, cursorEffect: 'glow', backgroundEffect: 'none' })));
  await glow.goto(`${base}/login`);
  await glow.mouse.move(80, 240);
  await glow.waitForFunction(() => document.querySelector('.glow-cursor')?.dataset.visible === 'true');
  const glowBounds = await glow.locator('.glow-cursor').boundingBox();
  assert.equal(glowBounds.width, 160, 'classic glow diameter must remain compact');
  assert.equal(glowBounds.height, 160);
  assert.equal(glowBounds.x + glowBounds.width / 2, 80, 'glow center must track the pointer');
  assert.equal(glowBounds.y + glowBounds.height / 2, 240);
  assert.equal(await glow.locator('canvas').count(), 0, 'classic glow must not load WebGL');
  assert.equal(await glow.evaluate(() => document.elementFromPoint(80, 240)?.classList.contains('glow-cursor')), false, 'glow must not intercept input');
  await glow.getByRole('textbox').first().fill('test@example.com');
  await glow.mouse.move(80, 240);
  await glow.waitForTimeout(300);
  await glow.evaluate(() => {
    window.__glowChanges = 0;
    window.__glowObserver = new MutationObserver(() => window.__glowChanges++);
    window.__glowObserver.observe(document.querySelector('.glow-cursor'), { attributes: true });
  });
  await glow.waitForTimeout(1200);
  const glowIdleChanges = await glow.evaluate(() => window.__glowChanges);
  assert.equal(glowIdleChanges, 0, 'stationary glow must not keep updating');
  await glow.screenshot({ path: `${output}/classic-glow.png` });
  await glow.emulateMedia({ reducedMotion: 'reduce' });
  await glow.mouse.move(100, 260);
  assert.equal(await glow.locator('.glow-cursor').isVisible(), false);

  await desktop.goto(base);
  await desktop.getByRole('button', { name: '换一句' }).click();
  await desktop.waitForTimeout(300);
  assert.deepEqual(errors, []);
  const result = { initialJsBytes, idleDrawsIn3Seconds: after.draws - before.draws, idleClonesIn3Seconds: after.clones - before.clones, touchCanvas: 0, reducedMotionCanvas: 0, glowCanvas: 0, glowIdleChanges };
  await writeFile(`${output}/results.json`, JSON.stringify(result, null, 2));
  console.log(result);
} finally {
  await browser.close();
}
