import type { FuriganaSegment } from "@/lib/types";

/**
 * 按分段数据渲染带振假名的日语文本。
 * 每个 segment 若有 kana 字段，则用 <ruby> 标注读音；否则直接输出原文（假名/符号）。
 */
export function Furigana({
  segments,
  className,
}: {
  segments: FuriganaSegment[];
  className?: string;
}) {
  return (
    <span className={className}>
      {segments.map((seg, i) =>
        seg.kana ? (
          <ruby key={i}>
            {seg.text}
            <rt className="text-[0.55em] text-cyan-300/80">{seg.kana}</rt>
          </ruby>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
    </span>
  );
}
