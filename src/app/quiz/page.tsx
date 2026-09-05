import { redirect } from "next/navigation";

// 访问 /quiz 本身（一级 tab 的默认入口）时，重定向到第一个二级标签"汉字检测"
export default function QuizIndexPage() {
  redirect("/quiz/kanji");
}
