"use client";

// 通用 hook：在检测题"已经显示答案/结果"的状态下，监听键盘 Enter 键，
// 触发"下一题"，不用每个 Runner 组件都重复写一遍 keydown 监听逻辑。
//
// 使用方式：useEnterToAdvance(canAdvance, handleNext)
//   canAdvance 为 true 时（比如已经选择了答案、正在显示对错结果）才会响应 Enter，
//   避免用户在还没作答时按 Enter 意外跳过题目。

import { useEffect, useRef } from "react";

export function useEnterToAdvance(canAdvance: boolean, onAdvance: () => void) {
  // 用 ref 保存最新的 onAdvance，避免它作为 effect 依赖项导致监听器被频繁重新绑定
  // （每个 Runner 组件里 handleNext 是内联函数，每次渲染都是新的引用，
  //  如果直接把 onAdvance 放进依赖数组，会造成下面 firedRef 的"本轮是否已经推进过"
  //  状态被意外重置，反而更容易触发重复推进的 bug）。
  // 注意：ref 的读写必须放在 effect 里，不能在渲染阶段直接赋值
  // （React 规则：渲染期间是纯函数，ref.current 只能在事件回调/effect 里读写）。
  const onAdvanceRef = useRef(onAdvance);
  useEffect(() => {
    onAdvanceRef.current = onAdvance;
  }, [onAdvance]);

  // 记录"本次 canAdvance=true 期间是否已经推进到下一题过"。
  //
  // 之前的 bug 根因（对应用户反馈的"按 Enter 直接跳到下一题造成空判"）：
  // 每道题切题时，外层容器用 key={index} 重新挂载，新的 <input autoFocus> 要等
  // 挂载完成才能真正拿到焦点，这中间有一个很短的"焦点丢失"空窗（这时 document.activeElement
  // 不是 <input>）。如果用户按 Enter 提交答案后手指没立刻松开（或者操作系统/浏览器针对
  // 按住不放的按键有自动重复 keydown），这些"重复的 Enter keydown"有可能恰好落在这个
  // 空窗期触发：因为目标不是 INPUT 标签，会被当成"下一题"指令直接调用 onAdvance()，
  // 于是连续推进了两次——第二次推进跳过的那道题用户根本没来得及看到/回答，
  // 相当于直接把"未作答"当成本题的判定结果交了上去，也就是"空判"。
  //
  // 用 firedRef 保证同一次"canAdvance 变为 true"最多真正触发一次推进，
  // 从根源上避免重复调用，而不是依赖猜测事件时序。
  const firedRef = useRef(false);

  useEffect(() => {
    if (!canAdvance) {
      firedRef.current = false; // 进入下一题（canAdvance 重新变 false）时重置，为下一轮做准备
      return;
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "Enter") return;

      // 忽略键盘"按住不放"产生的系统自动重复 keydown，只处理真正的第一次按下。
      if (e.repeat) return;

      // 如果用户此时正在某个输入框里按 Enter（比如提交答案的那一下），
      // 那次按键会被表单的 onSubmit 处理，不应该在这里重复触发"下一题"。
      const target = e.target as HTMLElement | null;
      if (target && target.tagName === "INPUT") return;

      if (firedRef.current) return; // 本轮已经推进过一次了，忽略后续多余的 Enter
      firedRef.current = true;
      onAdvanceRef.current();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canAdvance]);
}
