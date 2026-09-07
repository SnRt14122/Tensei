"use client";

import type { ReactNode } from "react";
import BorderGlow from "./BorderGlow";
import { useTheme } from "./ThemeProvider";

export function StudyCard({ children, className = "", contentClassName = "" }: { children: ReactNode; className?: string; contentClassName?: string }) {
  const { theme } = useTheme();
  return <BorderGlow
    className={`study-card ${className}`}
    contentClassName={contentClassName}
    disabled={!theme.borderGlow}
    edgeSensitivity={30}
    glowColor="40 80 80"
    backgroundColor="#120F17"
    borderRadius={28}
    glowRadius={40}
    glowIntensity={1.0}
    coneSpread={25}
    animated={false}
    colors={['#c084fc', '#f472b6', '#38bdf8']}
  >{children}</BorderGlow>;
}
