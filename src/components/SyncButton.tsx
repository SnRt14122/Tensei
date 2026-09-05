"use client";

// 导航栏的"手动同步"按钮：
// - 本地答题记录默认只存在浏览器 IndexedDB 里（见 src/lib/localStore.ts），不会自动上传，
//   这样每道题的判分和"下一题"操作都不需要等网络，交互速度不受服务器响应影响。
// - 点击这个按钮时，才把本地缓存的记录一次性批量同步到 Supabase。
// - 按钮上的数字徽标显示"还有多少条记录没同步"，来源是监听 localStore 广播的自定义事件，
//   不需要引入全局状态管理库。

import { useEffect, useState, useTransition } from "react";
import {
  QUIZ_ATTEMPT_ADDED_EVENT,
  clearLocalAttempts,
  getAllLocalAttempts,
  getLocalAttemptsCount,
} from "@/lib/localStore";
import { syncQuizAttempts } from "@/app/sync/actions";

export function SyncButton() {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, startTransition] = useTransition();
  // 同步完成后短暂显示一个"已同步"提示，几秒后自动消失
  const [justSynced, setJustSynced] = useState(false);

  // 刷新未同步数量：初次挂载时读一次，之后每次有新答题记录广播事件时也重新读一次
  useEffect(() => {
    let mounted = true;
    function refresh() {
      getLocalAttemptsCount().then((count) => {
        if (mounted) setPendingCount(count);
      });
    }
    refresh();
    window.addEventListener(QUIZ_ATTEMPT_ADDED_EVENT, refresh);
    return () => {
      mounted = false;
      window.removeEventListener(QUIZ_ATTEMPT_ADDED_EVENT, refresh);
    };
  }, []);

  function handleSync() {
    if (pendingCount === 0 || isSyncing) return;
    startTransition(async () => {
      const attempts = await getAllLocalAttempts();
      if (attempts.length === 0) return;
      await syncQuizAttempts(attempts);
      // 云端确认写入成功后，才清掉本地缓存，避免中途失败导致记录丢失。
      // 注意：这里不手动 setPendingCount(0)——clearLocalAttempts 内部会广播事件，
      // 由上面的 useEffect 监听并重新查询真实的未同步数量。这样如果同步进行期间
      // 用户又答了新题（这些新记录不在本次 attempts 里，不会被清掉），
      // 徽标会正确显示"还剩多少条"，而不是被错误地强制清零。
      await clearLocalAttempts(attempts.map((a) => a.id));
      setJustSynced(true);
      setTimeout(() => setJustSynced(false), 2500);
    });
  }

  return (
    <button
      onClick={handleSync}
      disabled={pendingCount === 0 || isSyncing}
      className="relative flex items-center gap-1.5 text-xs text-white/50 hover:text-white transition-colors disabled:opacity-40 disabled:hover:text-white/50"
      title="把本地做题记录上传到云端，恢复后可继续看到进度和错题"
    >
      <span>{isSyncing ? "同步中…" : justSynced ? "已同步" : "同步记录"}</span>
      {pendingCount > 0 && !isSyncing && (
        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-cyan-400/80 px-1 text-[10px] font-medium text-black">
          {pendingCount}
        </span>
      )}
    </button>
  );
}
