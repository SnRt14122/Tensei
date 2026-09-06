"use client";

import { useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import "./JapanScene.css";

const JapanScene = dynamic(() => import("./JapanScene"), { ssr: false });

export function MemoryExperience({ selector, children }: { selector: ReactNode; children: ReactNode }) {
  const [title, setTitle] = useState("记忆");
  const [sceneOpen, setSceneOpen] = useState(false);
  const composing = useRef(false);
  const input = useRef<HTMLInputElement>(null);

  function update(value: string, isComposing: boolean) {
    setTitle(value);
    if (!isComposing && value.trim() === "轰炸") setSceneOpen(true);
  }

  function closeScene() {
    setSceneOpen(false);
    setTitle("记忆");
    requestAnimationFrame(() => input.current?.focus());
  }

  return (
    <>
      <div hidden={sceneOpen}>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="memory-heading">
            <span>今日</span>
            <input ref={input} aria-label="今日标题" value={title} maxLength={12}
              onChange={event => update(event.target.value, composing.current)}
              onCompositionStart={() => { composing.current = true; }}
              onCompositionEnd={event => { composing.current = false; update(event.currentTarget.value, false); }} />
          </h1>
          {selector}
        </div>
        {children}
      </div>
      {sceneOpen && <JapanScene onReturn={closeScene} />}
    </>
  );
}
