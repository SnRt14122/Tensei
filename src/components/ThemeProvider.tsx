"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  DEFAULT_THEME,
  hexToRgbString,
  loadThemeSettings,
  saveThemeSettings,
  type ThemeSettings,
} from "@/lib/theme";

const FluidGlass = dynamic(() => import("./FluidGlass"), { ssr: false });

interface ThemeContextValue {
  theme: ThemeSettings;
  setTheme: (next: ThemeSettings) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function applyThemeToDocument(theme: ThemeSettings) {
  const root = document.documentElement;
  root.style.setProperty("--accent", theme.accent);
  root.style.setProperty("--accent-rgb", hexToRgbString(theme.accent));
  root.style.setProperty("--background", theme.background);
  root.setAttribute("data-bg-effect", theme.backgroundEffect);
  root.setAttribute("data-liquid-effects", theme.liquidEffects ? "on" : "off");
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeSettings>(() => loadThemeSettings());

  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  const setTheme = useCallback((next: ThemeSettings) => {
    setThemeState(next);
    saveThemeSettings(next);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
      {theme.liquidEffects && <FluidGlass />}
    </ThemeContext.Provider>
  );
}
