"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ActivityDay } from "@/lib/data/activity";
import { activityWeek } from "@/lib/activityPractice";

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];

export function ActivityWeek({ days, todayKey, selected, onSelect }: { days: ActivityDay[]; todayKey: string; selected: string | null; onSelect: (key: string) => void }) {
  const [offset, setOffset] = useState(0);
  const week = useMemo(() => activityWeek(days, todayKey, offset), [days, todayKey, offset]);
  const max = Math.max(1, ...week.map(day => day.total));
  const earliest = days.reduce((key, day) => day.key < key ? day.key : key, todayKey);
  const totals = week.reduce((sum, day) => ({ words: sum.words + day.words, patterns: sum.patterns + day.patterns, attempts: sum.attempts + day.attempts }), { words: 0, patterns: 0, attempts: 0 });
  const range = `${week[0].key} ~ ${week[6].key}`;
  return <section className="activity-week" aria-labelledby="activity-week-title">
    <header className="activity-week-header"><div><h2 id="activity-week-title">{offset === 0 ? "本周学习热度" : "每周学习热度"}</h2><p>{range}</p></div>
      <div className="activity-week-nav"><button title="上一周" aria-label="上一周" disabled={week[0].key <= earliest} onClick={() => setOffset(value => value - 1)}><ChevronLeft size={18} /></button><button disabled={offset === 0} onClick={() => setOffset(0)}>本周</button><button title="下一周" aria-label="下一周" disabled={offset === 0} onClick={() => setOffset(value => value + 1)}><ChevronRight size={18} /></button></div>
    </header>
    <div className="activity-week-chart" role="group" aria-label="按日学习记录">
      {week.map((day, index) => <button key={day.key} className="activity-week-day" disabled={day.future} aria-pressed={selected === day.key} aria-label={`${day.key}：${day.words} 个单词，${day.patterns} 个语法点，${day.attempts} 次检测`} title={`${day.key}：${day.words} 个单词 / ${day.patterns} 个语法点 / ${day.attempts} 次检测`} onClick={() => onSelect(day.key)}>
        <span className="activity-week-count">{day.future ? "-" : day.total}</span>
        <span className="activity-week-bar" aria-hidden="true"><span className="activity-week-word" style={{ height: `${day.words / max * 100}%` }} /><span className="activity-week-pattern" style={{ height: `${day.patterns / max * 100}%` }} /><span className="activity-week-quiz" style={{ height: `${day.attempts / max * 100}%` }} /></span>
        <span className="activity-week-label">周{WEEKDAYS[index]}</span><small>{Number(day.key.slice(5, 7))}/{Number(day.key.slice(8))}</small>
      </button>)}
    </div>
    <ul className="activity-week-legend"><li><i className="activity-week-word" />单词 {totals.words}</li><li><i className="activity-week-pattern" />语法 {totals.patterns}</li><li><i className="activity-week-quiz" />检测 {totals.attempts}</li></ul>
  </section>;
}
