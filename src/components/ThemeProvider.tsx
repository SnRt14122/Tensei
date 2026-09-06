"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { FluidGlassLoader } from "./FluidGlassLoader";
import {
  DEFAULT_THEME,
  hexToRgbString,
  loadThemeSettings,
  saveThemeSettings,
  type ThemeSettings,
} from "@/lib/theme";

interface ThemeContextValue {
  theme: ThemeSettings;
  setTheme: (next: ThemeSettings) => boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  setTheme: () => false,
});

export function useTheme() {
  return useContext(ThemeContext);
}

function applyThemeToDocument(theme: ThemeSettings) {
  const root = document.documentElement;
  root.style.setProperty("--accent", theme.accent);
  root.style.setProperty("--accent-rgb", hexToRgbString(theme.accent));
  root.style.setProperty("--background", theme.background);
  root.style.setProperty(
    "--background-image",
    theme.backgroundImage ? `url(${theme.backgroundImage})` : "none",
  );
  root.setAttribute("data-bg-effect", theme.backgroundEffect);
  root.setAttribute("data-liquid-effects", theme.liquidEffects ? "on" : "off");
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeSettings>(() => loadThemeSettings());

  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  useEffect(() => {
    const update = () => { document.documentElement.dataset.pageHidden = String(document.hidden); };
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  const setTheme = useCallback((next: ThemeSettings) => {
    if (!saveThemeSettings(next)) return false;
    setThemeState(next);
    return true;
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
      {theme.liquidEffects && <FluidGlassLoader />}
    </ThemeContext.Provider>
  );
}
