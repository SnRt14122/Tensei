"use client";

import { BookOpen, CheckCircle2, CircleAlert, Languages } from "lucide-react";
import CountUp from "./CountUp";

export function ActivityOverview({ totalWords, totalPatterns, totalAttempts, totalCorrect }: { totalWords: number; totalPatterns: number; totalAttempts: number; totalCorrect: number }) {
  const cards = [
    { icon: BookOpen, value: totalWords, label: "记住的单词" },
    { icon: Languages, value: totalPatterns, label: "学会的语法点" },
    { icon: CheckCircle2, value: totalAttempts, label: "检测次数" },
    { icon: CircleAlert, value: totalAttempts ? Math.round(totalCorrect / totalAttempts * 100) : null, suffix: "%", label: "整体正确率" },
  ];
  return <div className="activity-overview">{cards.map(({ icon: Icon, value, suffix = "", label }) => <div key={label}><Icon size={17} /><strong>{value === null ? "-" : <><CountUp to={value} duration={.7} />{suffix}</>}</strong><span>{label}</span></div>)}</div>;
}
