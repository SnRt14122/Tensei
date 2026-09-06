import { Activity, BookOpen, CheckCircle2, CircleAlert, Languages } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { ActivityDashboard } from "@/components/ActivityDashboard";
import { getLearningActivity } from "@/lib/data/activity";

export default async function ProgressPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) redirect("/login");
  const { days, reviewQueue, todayKey } = await getLearningActivity(supabase, user.id);
  const totalWords = new Set(days.flatMap(day => day.learnedWords.map(word => word.id))).size;
  const totalPatterns = new Set(days.flatMap(day => day.learnedPatterns.map(pattern => pattern.id))).size;
  const totalAttempts = days.reduce((sum, day) => sum + day.attempts, 0);
  const totalCorrect = days.reduce((sum, day) => sum + day.correct, 0);
  return <main className="min-h-screen"><NavBar email={user.email} /><div className="mx-auto max-w-4xl px-4 py-8">
    <header className="activity-header"><div><p className="activity-kicker">LEARNING LOG</p><h1>学习记录</h1><p>回看轨迹、处理错题，并决定下一步复习什么</p></div><Activity size={28} /></header>
    <div className="activity-overview"><div><BookOpen size={17} /><strong>{totalWords}</strong><span>记住的单词</span></div><div><Languages size={17} /><strong>{totalPatterns}</strong><span>学会的语法点</span></div><div><CheckCircle2 size={17} /><strong>{totalAttempts}</strong><span>检测次数</span></div><div><CircleAlert size={17} /><strong>{totalAttempts ? `${Math.round(totalCorrect / totalAttempts * 100)}%` : "-"}</strong><span>整体正确率</span></div></div>
    <ActivityDashboard days={days} reviewQueue={reviewQueue} todayKey={todayKey} />
  </div></main>;
}
