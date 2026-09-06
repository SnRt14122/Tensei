"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// DOM is outside WebGL. Capture locally on content changes, then crop a small
// texture at the pointer each frame. No screenshots leave the browser.
export function usePageTexture(pointer) {
  const snapshot = useRef(null);
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
    let dirty = true;
    async function capture() {
      if (disposed || busy || document.hidden) return;
      busy = true;
      dirty = false;
      try {
        const { default: html2canvas } = await import("html2canvas-pro");
        const x = window.scrollX;
        const y = window.scrollY;
        const canvas = await html2canvas(document.body, {
          x, y, width: window.innerWidth, height: window.innerHeight,
          scrollX: x, scrollY: y, scale: 1, logging: false,
          backgroundColor: getComputedStyle(document.body).backgroundColor,
          allowTaint: false, useCORS: false,
          ignoreElements: element => element.matches(".fluid-glass-cursor, nextjs-portal, iframe, canvas"),
        });
        if (!disposed) snapshot.current = { canvas, x, y };
      } catch {
        // Keep the last frame and the CSS glass fallback if a page cannot be captured.
      } finally {
        busy = false;
        if (dirty && !disposed) schedule();
      }
    }
    function schedule() {
      dirty = true;
      clearTimeout(timer);
      timer = setTimeout(capture, 180);
    }
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
    document.fonts.ready.then(() => { if (!disposed) schedule(); });
    schedule();
    return () => {
      disposed = true;
      clearTimeout(timer);
      observer.disconnect();
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("pointerdown", schedule);
    };
  }, []);

  // Three.js textures are intentionally mutable frame buffers.
  // eslint-disable-next-line react-hooks/immutability
  useFrame(() => {
    const frame = snapshot.current;
    if (!frame) return;
    const ctx = texture.image.getContext("2d");
    ctx.clearRect(0, 0, 192, 192);
    ctx.drawImage(frame.canvas,
      pointer.current.x - 56 + window.scrollX - frame.x,
      pointer.current.y - 56 + window.scrollY - frame.y,
      112, 112, 0, 0, 192, 192);
    // eslint-disable-next-line react-hooks/immutability
    texture.needsUpdate = true;
  });
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}
