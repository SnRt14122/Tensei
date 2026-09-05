// 本地答题记录缓存层（基于浏览器 IndexedDB，用 idb 库简化操作）
//
// 背景：之前"词义检测"每答一题都要 await 一次 server action（内部还做了两次串行的
// Supabase 网络往返），导致点完选项要等很久才能点"下一题"，这是用户反馈"检测很慢"的根因。
//
// 优化思路：检测时的判分逻辑本身已经是纯前端计算（不需要网络），那么答题记录也不必
// 每次都立刻写数据库——先把这次答题结果存进本地的 IndexedDB，界面立刻响应、可以马上进入
// 下一题；等用户点击导航栏里的"同步"按钮时，再一次性把所有本地缓存的记录批量上传到云端。
//
// 为什么用 IndexedDB 而不是 localStorage：localStorage 是同步 API 会阻塞主线程，
// 且容量小（一般5MB），做题积累多了可能出问题；IndexedDB 是异步的、容量大得多，
// 更适合做"结构化记录队列"。

import { openDB, type IDBPDatabase } from "idb";
import type { QuizAttempt } from "@/lib/types";

const DB_NAME = "tenseiing-quiz-cache";
const DB_VERSION = 1;
const STORE_NAME = "pending_attempts"; // 存放"尚未同步到云端"的答题记录

/**
 * 自定义浏览器事件名：每次本地新增一条答题记录后广播一下，
 * 让导航栏的同步按钮组件能实时更新"未同步数量"徽标，不需要引入状态管理库。
 */
export const QUIZ_ATTEMPT_ADDED_EVENT = "tenseiing:quiz-attempt-added";

let dbPromise: Promise<IDBPDatabase> | null = null;

/** 惰性初始化数据库连接，整个应用共用一个连接（避免重复打开） */
function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          // 用记录自身的 id（本地生成的 uuid）作为主键，方便同步成功后按 id 批量删除
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}

/** 新增一条本地答题记录（检测组件判分后立即调用，不等待网络） */
export async function addLocalAttempt(attempt: QuizAttempt): Promise<void> {
  const db = await getDb();
  await db.put(STORE_NAME, attempt);
  // 广播事件，通知同步按钮刷新未同步计数
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(QUIZ_ATTEMPT_ADDED_EVENT));
  }
}

/** 读取所有尚未同步的本地答题记录 */
export async function getAllLocalAttempts(): Promise<QuizAttempt[]> {
  const db = await getDb();
  return db.getAll(STORE_NAME);
}

/** 读取未同步记录的数量（用于导航栏徽标，比取全部记录再数组长度更轻量） */
export async function getLocalAttemptsCount(): Promise<number> {
  const db = await getDb();
  return db.count(STORE_NAME);
}

/** 同步成功后，把已经上传的记录从本地队列中清除 */
export async function clearLocalAttempts(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await getDb();
  const tx = db.transaction(STORE_NAME, "readwrite");
  await Promise.all(ids.map((id) => tx.store.delete(id)));
  await tx.done;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(QUIZ_ATTEMPT_ADDED_EVENT));
  }
}
