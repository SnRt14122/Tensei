import { VerbConjugationTutorial } from "@/components/VerbConjugationTutorial";

// "学习"二级标签之一：动词/形容词变位教程。
// 内容是固定的6个词类卡片（静态动画组件，不读数据库），从原来的 /learn 页拆分出来。
export default function LearnConjugationPage() {
  return (
    <section>
      <h1 className="text-xl font-semibold text-white mb-1">动词/形容词变位教程</h1>
      <p className="text-sm text-white/50 mb-6">
        按词类分类讲解变形规则，配动画和记忆口诀
      </p>
      <VerbConjugationTutorial />
    </section>
  );
}
