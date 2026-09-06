"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BookOpen, Brain, CheckCircle2, Download, Languages, Search, Target } from "lucide-react";
import type { ActivityDay, ReviewItem } from "@/lib/data/activity";

type Mode = "all" | "learning" | "quiz" | "mistakes";

function DaySection({ day, mode, search }: { day: ActivityDay; mode: Mode; search: string }) {
  const query = search.trim().toLowerCase();
  const matches = (value: string) => !query || value.toLowerCase().includes(query);
  const words = day.learnedWords.filter(word => matches(`${word.surface} ${word.reading} ${word.meaning}`));
  const patterns = day.learnedPatterns.filter(pattern => matches(`${pattern.pattern} ${pattern.meaning}`));
  const mistakes = day.mistakes.filter(mistake => matches(`${mistake.label} ${mistake.reading} ${mistake.type} ${mistake.answer}`));
  const showLearning = mode === "all" || mode === "learning";
  const showQuiz = mode === "all" || mode === "quiz";
  const showMistakes = mode === "all" || mode === "mistakes";
  if ((showLearning && words.length === 0 && patterns.length === 0) && (!showQuiz || day.attempts === 0) && (!showMistakes || mistakes.length === 0)) return null;
  const accuracy = day.attempts ? Math.round(day.correct / day.attempts * 100) : 0;
  return <article className="activity-day">
    <div className="activity-day-heading"><div><p className="activity-date">{day.label}</p><p className="activity-summary">{day.learnedWords.length} 个单词 · {day.learnedPatterns.length} 个语法点 · {day.attempts} 次检测</p></div><span className="activity-day-score">{day.attempts ? `${accuracy}%` : "学习日"}</span></div>
    <div className="activity-grid">
      {showLearning && <section className="activity-item"><div className="activity-item-heading"><BookOpen size={16} /><h3>记住的单词</h3><span>{words.length}</span></div>{words.length ? <ul>{words.map(word => <li key={word.id}><strong>{word.surface}</strong><span>{word.reading}</span><small>{word.meaning}</small></li>)}</ul> : <p className="activity-empty">没有匹配的单词</p>}</section>}
      {showLearning && <section className="activity-item"><div className="activity-item-heading"><Languages size={16} /><h3>学会的内容</h3><span>{patterns.length}</span></div>{patterns.length ? <ul>{patterns.map(pattern => <li key={pattern.id}><strong>{pattern.pattern}</strong><small>{pattern.meaning}</small></li>)}</ul> : <p className="activity-empty">没有匹配的语法点</p>}</section>}
      {showQuiz && <section className="activity-item"><div className="activity-item-heading"><Brain size={16} /><h3>检测表现</h3><span>{day.attempts}</span></div>{day.attempts ? <div className="activity-stats"><strong>{accuracy}%</strong><span>正确率</span><p>{day.correct} / {day.attempts} 题答对</p><small>{day.quizTypes.join(" · ")}</small></div> : <p className="activity-empty">当天没有检测</p>}</section>}
      {showMistakes && mistakes.length > 0 && <section className="activity-item activity-mistakes"><div className="activity-item-heading"><Target size={16} /><h3>错题回顾</h3><span>{mistakes.length}</span></div><ul>{mistakes.slice(0, 12).map((mistake, index) => <li key={`${mistake.label}-${index}`}><strong>{mistake.label}</strong><span>{mistake.type}</span><small>你的答案：{mistake.answer}</small></li>)}</ul></section>}
    </div>
  </article>;
}

function csvEscape(value: string) { return `"${value.replaceAll('"', '""')}"`; }

export function ActivityDashboard({ days, reviewQueue, todayKey }: { days: ActivityDay[]; reviewQueue: ReviewItem[]; todayKey: string }) {
  const [range, setRange] = useState<7 | 30 | "all">(30);
  const [mode, setMode] = useState<Mode>("all");
  const [search, setSearch] = useState("");
  const visibleDays = useMemo(() => {
    const today = new Date(`${todayKey}T00:00:00Z`);
    const cutoff = range === "all" ? "0000-00-00" : new Date(today.getTime() - (range - 1) * 86400000).toISOString().slice(0, 10);
    return days.filter(day => day.key >= cutoff);
  }, [days, range, todayKey]);
  const visibleNodes = visibleDays.map(day => <DaySection key={day.key} day={day} mode={mode} search={search} />).filter(Boolean);
  const streak = useMemo(() => {
    const keys = new Set(days.map(day => day.key));
    let count = 0;
    const today = new Date(`${todayKey}T00:00:00Z`);
    for (let i = 0; i < 365; i++) { const key = new Date(today.getTime() - i * 86400000).toISOString().slice(0, 10); if (!keys.has(key)) break; count++; }
    return count;
  }, [days, todayKey]);
  function exportVisible() {
    const rows = [["日期", "类型", "内容", "读音/说明", "结果"]];
    for (const day of visibleDays) {
      for (const word of day.learnedWords) rows.push([day.label, "记住单词", word.surface, word.reading, word.meaning]);
      for (const pattern of day.learnedPatterns) rows.push([day.label, "学会语法", pattern.pattern, "", pattern.meaning]);
      for (const mistake of day.mistakes) rows.push([day.label, `错题·${mistake.type}`, mistake.label, mistake.reading, `答案：${mistake.answer}`]);
    }
    const blob = new Blob(["\ufeff" + rows.map(row => row.map(csvEscape).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "tensei-learning-records.csv"; link.click(); URL.revokeObjectURL(url);
  }
  return <>
    <div className="activity-tools"><div className="activity-segmented" role="group" aria-label="时间范围"><button className={range === 7 ? "active" : ""} onClick={() => setRange(7)}>近 7 天</button><button className={range === 30 ? "active" : ""} onClick={() => setRange(30)}>近 30 天</button><button className={range === "all" ? "active" : ""} onClick={() => setRange("all")}>全部</button></div><label className="activity-search"><Search size={15} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="查找单词或语法" aria-label="查找单词或语法" /></label><button className="activity-export" onClick={exportVisible}><Download size={15} />导出当前记录</button></div>
    <div className="activity-toolbar-row"><div className="activity-filters" role="group" aria-label="记录类型"><button className={mode === "all" ? "active" : ""} onClick={() => setMode("all")}>全部</button><button className={mode === "learning" ? "active" : ""} onClick={() => setMode("learning")}>学习内容</button><button className={mode === "quiz" ? "active" : ""} onClick={() => setMode("quiz")}>检测表现</button><button className={mode === "mistakes" ? "active" : ""} onClick={() => setMode("mistakes")}>错题回顾</button></div><span className="activity-result-count">{visibleDays.length} 个学习日</span></div>
    <section className="activity-next"><div className="activity-next-icon"><Target size={18} /></div><div><h2>下一步复习</h2><p>{reviewQueue.length ? `有 ${reviewQueue.length} 个词需要优先回看，按错误权重排列。` : "目前没有高权重待复习词，继续保持。"}</p></div>{reviewQueue.length > 0 && <Link href="/memorize">开始复习</Link>}<span className="activity-streak"><CheckCircle2 size={15} />连续学习 {streak} 天</span></section>
    {visibleNodes.length ? <div className="activity-list">{visibleNodes}</div> : <section className="activity-empty-state"><Search size={28} /><h2>没有匹配的记录</h2><p>换一个时间范围或搜索关键词。</p></section>}
  </>;
}
