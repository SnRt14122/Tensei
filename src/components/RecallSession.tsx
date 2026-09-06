"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Eye, RotateCcw, X } from "lucide-react";
import type { RecallItem } from "@/lib/activityPractice";

export default function RecallSession({ items, onClose }: { items: RecallItem[]; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const [deck, setDeck] = useState(items);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [retry, setRetry] = useState<RecallItem[]>([]);
  const current = deck[index];

  useEffect(() => {
    const node = dialog.current!;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    node.showModal();
    document.body.style.overflow = "hidden";
    return () => { node.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  useEffect(() => { heading.current?.focus(); }, [index, deck]);

  function answer(remembered: boolean) {
    if (!revealed || !current) return;
    if (!remembered) setRetry(values => [...values, current]);
    setIndex(value => value + 1);
    setRevealed(false);
  }
  function restart(next: RecallItem[]) { setDeck(next); setRetry([]); setIndex(0); setRevealed(false); }

  return createPortal(<dialog ref={dialog} className="recall-dialog" aria-labelledby="recall-title" onCancel={event => { event.preventDefault(); onClose(); }}>
    <header className="recall-header"><div><h2 id="recall-title">回想自测</h2><p>本次练习 · 不写入学习记录</p></div><button className="recall-icon" title="关闭自测" aria-label="关闭自测" onClick={onClose}><X size={18} /></button></header>
    <div className="recall-body">
      {current ? <>
        <div className="recall-meta"><span>{current.kind === "word" ? "单词" : "语法"}</span><span>{index + 1} / {deck.length}</span></div>
        <progress value={index} max={deck.length} aria-label="自测进度" />
        <h3 ref={heading} tabIndex={-1} className="recall-prompt" lang="ja">{current.prompt}</h3>
        <div className="recall-answer" aria-live="polite">{revealed && <>{current.reading && <p lang="ja">{current.reading}</p>}<p>{current.meaning}</p></>}</div>
        {!revealed ? <button className="recall-primary" onClick={() => setRevealed(true)}><Eye size={17} />显示答案</button> : <div className="recall-actions"><button onClick={() => answer(false)}><RotateCcw size={16} />还没记牢</button><button className="recall-primary" onClick={() => answer(true)}><Check size={17} />想起来了</button></div>}
      </> : <>
        <h3 ref={heading} tabIndex={-1} className="recall-result-title">本轮完成</h3>
        <dl className="recall-results"><div><dt>想起来了</dt><dd>{deck.length - retry.length}</dd></div><div><dt>待巩固</dt><dd>{retry.length}</dd></div></dl>
        {retry.length > 0 && <ul className="recall-retry-list">{retry.map(item => <li key={item.id}><span lang="ja">{item.prompt}</span><span>{item.meaning}</span></li>)}</ul>}
        <div className="recall-actions"><button onClick={onClose}>结束练习</button><button className="recall-primary" onClick={() => restart(retry.length ? retry : items)}><RotateCcw size={16} />{retry.length ? "重练待巩固" : "再练一轮"}</button></div>
      </>}
    </div>
  </dialog>, document.body);
}
