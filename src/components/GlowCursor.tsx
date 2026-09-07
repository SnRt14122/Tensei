"use client";

import { useEffect } from "react";
import "./GlowCursor.css";

export function GlowCursor() {
  useEffect(() => {
    const glow = document.createElement("div");
    glow.className = "glow-cursor";
    glow.setAttribute("aria-hidden", "true");
    // A manual popover keeps this non-interactive overlay above native dialogs too.
    if (typeof glow.showPopover === "function") glow.setAttribute("popover", "manual");
    document.body.append(glow);
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let x = 0;
    let y = 0;
    let activeDialog: Element | null = null;
    const isPopoverOpen = () => glow.hasAttribute("popover") && glow.matches(":popover-open");

    function hide() {
      cancelAnimationFrame(frame);
      frame = 0;
      glow.dataset.visible = "false";
      glow.dataset.pressed = "false";
      if (isPopoverOpen()) glow.hidePopover();
      activeDialog = null;
    }
    function move(event: PointerEvent) {
      if (event.pointerType === "touch" || reducedMotion.matches || document.hidden) { hide(); return; }
      x = event.clientX;
      y = event.clientY;
      const dialog = event.target instanceof Element ? event.target.closest("dialog[open]") : null;
      if (dialog !== activeDialog) {
        if (isPopoverOpen()) glow.hidePopover();
        activeDialog = dialog;
      }
      if (!frame) frame = requestAnimationFrame(() => {
        frame = 0;
        glow.style.transform = `translate3d(${x - 160}px, ${y - 160}px, 0)`;
        if (glow.hasAttribute("popover") && !isPopoverOpen()) glow.showPopover();
        glow.dataset.visible = "true";
      });
    }
    function press(event: PointerEvent) {
      move(event);
      if (event.pointerType !== "touch" && !reducedMotion.matches) glow.dataset.pressed = "true";
    }
    function release() { glow.dataset.pressed = "false"; }
    function visibility() { if (document.hidden) hide(); }
    function preferenceChanged() { if (reducedMotion.matches) hide(); }

    window.addEventListener("pointermove", move, { passive: true, capture: true });
    window.addEventListener("pointerdown", press, true);
    window.addEventListener("pointerup", release, true);
    window.addEventListener("pointercancel", hide, true);
    window.addEventListener("blur", hide);
    document.documentElement.addEventListener("pointerleave", hide);
    document.addEventListener("visibilitychange", visibility);
    reducedMotion.addEventListener("change", preferenceChanged);
    return () => {
      hide();
      glow.remove();
      window.removeEventListener("pointermove", move, true);
      window.removeEventListener("pointerdown", press, true);
      window.removeEventListener("pointerup", release, true);
      window.removeEventListener("pointercancel", hide, true);
      window.removeEventListener("blur", hide);
      document.documentElement.removeEventListener("pointerleave", hide);
      document.removeEventListener("visibilitychange", visibility);
      reducedMotion.removeEventListener("change", preferenceChanged);
    };
  }, []);

  return null;
}
