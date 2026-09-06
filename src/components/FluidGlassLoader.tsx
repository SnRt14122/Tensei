"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const FluidGlass = dynamic(() => import("./FluidGlass"), { ssr: false });

export function FluidGlassLoader() {
  const [enabled, setEnabled] = useState(false);
  const pointer = useRef({ x: 0, y: 0, active: false });

  useEffect(() => {
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
    function activate(event: PointerEvent) {
      if (event.pointerType === "touch" || reducedMotion.matches || document.hidden) return;
      pointer.current.x = event.clientX;
      pointer.current.y = event.clientY;
      pointer.current.active = true;
      setEnabled(true);
    }
    function preferenceChanged() {
      if (reducedMotion.matches) setEnabled(false);
    }
    if (!enabled) window.addEventListener("pointermove", activate, { passive: true });
    reducedMotion.addEventListener("change", preferenceChanged);
    return () => {
      window.removeEventListener("pointermove", activate);
      reducedMotion.removeEventListener("change", preferenceChanged);
    };
  }, [enabled]);

  return enabled ? <FluidGlass pointer={pointer} /> : null;
}
