"use client";

import { Star } from "lucide-react";
import SpecularButton from "./SpecularButton";

export function StarButton({ starred, onClick, disabled = false, className = "" }: { starred: boolean; onClick: () => void; disabled?: boolean; className?: string }) {
  const label = starred ? "取消星标" : "标记星标";
  return <SpecularButton className={`star-button ${className}`} size="lg" radius={18} tint="#ffffff" tintOpacity={0} blur={0} textColor="#f5f5f5" lineColor="#ffffff" baseColor="#525252" intensity={1} shineSize={10} shineFade={40} thickness={1} speed={0.35} followMouse proximity={250} autoAnimate={false} disabled={disabled} onClick={onClick} aria-pressed={starred} aria-label={label} title={label}>
    <Star size={21} fill={starred ? "currentColor" : "none"} aria-hidden="true" />
  </SpecularButton>;
}
