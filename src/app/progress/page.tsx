import { Activity, BookOpen, Brain, CheckCircle2, CircleAlert, Languages } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { getLearningActivity, type ActivityDay } from "@/lib/data/activity";

function DaySection({ day }: { day: ActivityDay }) {
  const accuracy = day.attempts ? Math.round(day.correct / day.attempts * 100) : 0;
  return <article className="activity-day">
    <div className="activity-day-heading"><div><p className="activity-date">{day.label}</p><p className="activity-summary">{day.learnedWords.length} 个单词 · {day.learnedPatterns.length} 个语法点 · {day.attempts} 次检测</p></div><Activity size={18} /></div>
    <div className="activity-grid">
      <section className="activity-item"><div className="activity-item-heading"><BookOpen size={16} /><h3>记住的单词</h3><span>{day.learnedWords.length}</span></div>{day.learnedWords.length ? <ul>{day.learnedWords.map(word => <li key={word.id}><strong>{word.surface}</strong><span>{word.reading}</span><small>{word.meaning}</small></li>)}</ul> : <p className="activity-empty">当天没有新增单词</p>}</section>
      <section className="activity-item"><div className="activity-item-heading"><Languages size={16} /><h3>学会的内容</h3><span>{day.learnedPatterns.length}</span></div>{day.learnedPatterns.length ? <ul>{day.learnedPatterns.map(pattern => <li key={pattern.id}><strong>{pattern.pattern}</strong><small>{pattern.meaning}</small></li>)}</ul> : <p className="activity-empty">当天没有新增语法点</p>}</section>
      <section className="activity-item"><div className="activity-item-heading"><Brain size={16} /><h3>检测情况</h3><span>{day.attempts}</span></div>{day.attempts ? <div className="activity-stats"><strong>{accuracy}%</strong><span>正确率</span><p>{day.correct} / {day.attempts} 题答对</p><small>{day.quizTypes.join(" · ")}</small>{day.reviewedWords.length > 0 && <p className="activity-reviewed">涉及：{day.reviewedWords.slice(0, 8).map(word => word.surface).join("、")}{day.reviewedWords.length > 8 ? "等" : ""}</p>}</div> : <p className="activity-empty">当天没有同步检测记录</p>}</section>
    </div>
  </article>;
}

export default async function ProgressPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) redirect("/login");
  const days = await getLearningActivity(supabase, user.id);
  const totalWords = new Set(days.flatMap(day => day.learnedWords.map(word => word.id))).size;
  const totalPatterns = new Set(days.flatMap(day => day.learnedPatterns.map(pattern => pattern.id))).size;
  const totalAttempts = days.reduce((sum, day) => sum + day.attempts, 0);
  const totalCorrect = days.reduce((sum, day) => sum + day.correct, 0);
  return <main className="min-h-screen"><NavBar email={user.email} /><div className="mx-auto max-w-4xl px-4 py-8">
    <header className="activity-header"><div><p className="activity-kicker">LEARNING LOG</p><h1>学习记录</h1><p>按天回看记住的单词、学过的语法和检测表现</p></div><Activity size={28} /></header>
    <div className="activity-overview"><div><BookOpen size={17} /><strong>{totalWords}</strong><span>记住的单词</span></div><div><Languages size={17} /><strong>{totalPatterns}</strong><span>学会的语法点</span></div><div><CheckCircle2 size={17} /><strong>{totalAttempts}</strong><span>检测次数</span></div><div><CircleAlert size={17} /><strong>{totalAttempts ? `${Math.round(totalCorrect / totalAttempts * 100)}%` : "-"}</strong><span>整体正确率</span></div></div>
    {days.length ? <div className="activity-list">{days.map(day => <DaySection day={day} key={day.key} />)}</div> : <section className="activity-empty-state"><Activity size={28} /><h2>还没有学习记录</h2><p>记住单词或同步检测记录后，这里会按日期整理你的学习轨迹。</p></section>}
  </div></main>;
}
