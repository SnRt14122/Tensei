"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

// DOM is outside WebGL. Capture locally on content changes, then crop a small
// texture at the pointer each frame. No screenshots leave the browser.
export function usePageTexture(pointer) {
  const invalidate = useThree(state => state.invalidate);
  const snapshot = useRef(null);
  const lastCrop = useRef(null);
  const [texture] = useState(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 192;
    const result = new THREE.CanvasTexture(canvas);
    result.colorSpace = THREE.SRGBColorSpace;
    result.generateMipmaps = false;
    result.minFilter = THREE.LinearFilter;
    return result;
  });

  useEffect(() => {
    let disposed = false;
    let busy = false;
    let timer;
    let idle;
    let lastCapture = -Infinity;
    let dirty = true;
    const isActive = () => pointer.current.active && !document.hidden && !document.querySelector(".japan-scene");
    async function capture() {
      if (disposed || busy || !dirty || !isActive()) return;
      busy = true;
      dirty = false;
      lastCapture = performance.now();
      try {
        const { default: html2canvas } = await import("html2canvas-pro");
        if (disposed || !isActive()) { dirty = true; return; }
        const x = window.scrollX;
        const y = window.scrollY;
        // A viewport snapshot is sampled into a tiny lens; full device resolution is unnecessary.
        const scale = Math.min(1, 1280 / window.innerWidth);
        const canvas = await html2canvas(document.body, {
          x, y, width: window.innerWidth, height: window.innerHeight,
          scrollX: x, scrollY: y, scale, logging: false,
          backgroundColor: getComputedStyle(document.body).backgroundColor,
          allowTaint: false, useCORS: false,
          ignoreElements: element => element.matches(".fluid-glass-cursor, nextjs-portal, iframe, canvas"),
        });
        if (!disposed) {
          snapshot.current = { canvas, x, y, scale };
          if (isActive()) invalidate();
        }
      } catch {
        // Keep the last frame and the CSS glass fallback if a page cannot be captured.
      } finally {
        busy = false;
        if (dirty && !disposed) schedule();
      }
    }
    function schedule() {
      dirty = true;
      if (disposed || busy || !isActive()) return;
      clearTimeout(timer);
      if (idle !== undefined) window.cancelIdleCallback?.(idle);
      timer = setTimeout(() => {
        timer = undefined;
        if (window.requestIdleCallback) idle = window.requestIdleCallback(capture, { timeout: 1000 });
        else void capture();
      }, Math.max(250, 1000 - (performance.now() - lastCapture)));
    }
    function redraw() {
      if (!isActive()) return;
      invalidate();
      if (dirty && timer === undefined && !busy) schedule();
    }
    window.addEventListener("fluid-glass-move", redraw);
    const observer = new MutationObserver(records => {
      if (records.some(record => {
        const element = record.target instanceof Element ? record.target : record.target.parentElement;
        if (element?.closest(".fluid-glass-cursor, nextjs-portal, iframe")) return false;
        if (record.type === "childList" && [...record.addedNodes, ...record.removedNodes].every(node => node instanceof Element && node.matches("iframe, .fluid-glass-cursor, nextjs-portal"))) return false;
        return true;
      })) schedule();
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["class", "style", "open"] });
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    window.addEventListener("pointerdown", schedule);
    window.addEventListener("input", schedule, true);
    document.addEventListener("visibilitychange", schedule);
    document.fonts.ready.then(() => { if (!disposed) schedule(); });
    schedule();
    return () => {
      disposed = true;
      clearTimeout(timer);
      if (idle !== undefined) window.cancelIdleCallback?.(idle);
      window.removeEventListener("fluid-glass-move", redraw);
      snapshot.current = null;
      observer.disconnect();
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("pointerdown", schedule);
      window.removeEventListener("input", schedule, true);
      document.removeEventListener("visibilitychange", schedule);
    };
  }, [invalidate, pointer]);

  // Three.js textures are intentionally mutable frame buffers.
  // eslint-disable-next-line react-hooks/immutability
  useFrame(() => {
    const frame = snapshot.current;
    if (!frame) return;
    const x = pointer.current.x + window.scrollX - frame.x;
    const y = pointer.current.y + window.scrollY - frame.y;
    if (lastCrop.current?.frame === frame && lastCrop.current.x === x && lastCrop.current.y === y) return;
    lastCrop.current = { frame, x, y };
    const ctx = texture.image.getContext("2d");
    ctx.clearRect(0, 0, 192, 192);
    // Keep the page at 1:1 scale. The old 112 -> 192 copy made the lens a magnifier.
    ctx.drawImage(frame.canvas,
      (x - 96) * frame.scale,
      (y - 96) * frame.scale,
      192 * frame.scale, 192 * frame.scale, 0, 0, 192, 192);
    // eslint-disable-next-line react-hooks/immutability
    texture.needsUpdate = true;
  });
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}
