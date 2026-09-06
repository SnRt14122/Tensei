import { Activity } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { ActivityDashboard } from "@/components/ActivityDashboard";
import { ActivityOverview } from "@/components/ActivityOverview";
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
    <ActivityOverview totalWords={totalWords} totalPatterns={totalPatterns} totalAttempts={totalAttempts} totalCorrect={totalCorrect} />
    <ActivityDashboard days={days} reviewQueue={reviewQueue} todayKey={todayKey} />
  </div></main>;
}
