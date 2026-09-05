import { redirect } from "next/navigation";

// 访问 /learn 本身（一级 tab 的默认入口）时，重定向到第一个二级标签"变位教程"，
// 写法和 /quiz/page.tsx（重定向到 /quiz/kanji）完全对照。
export default function LearnIndexPage() {
  redirect("/learn/conjugation");
}
