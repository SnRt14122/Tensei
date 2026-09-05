"use client";

// 通用 hook：在检测题"已经显示答案/结果"的状态下，监听键盘 Enter 键，
// 触发"下一题"，不用每个 Runner 组件都重复写一遍 keydown 监听逻辑。
//
// 使用方式：useEnterToAdvance(canAdvance, handleNext)
//   canAdvance 为 true 时（比如已经选择了答案、正在显示对错结果）才会响应 Enter，
//   避免用户在还没作答时按 Enter 意外跳过题目。

import { useEffect } from "react";

export function useEnterToAdvance(canAdvance: boolean, onAdvance: () => void) {
  useEffect(() => {
    if (!canAdvance) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "Enter") return;
      // 如果用户此时正在某个输入框里按 Enter（比如提交答案的那一下），
      // 那次按键会被表单的 onSubmit 处理，不应该在这里重复触发"下一题"。
      // 用一个宏任务延迟没法可靠区分，所以简单地检查：如果焦点在 input 上，
      // 说明这次 Enter 更可能是"提交当前输入"而不是"跳到下一题"，交给表单自己处理。
      const target = e.target as HTMLElement | null;
      if (target && target.tagName === "INPUT") return;
      onAdvance();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canAdvance, onAdvance]);
}
