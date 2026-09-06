import { pitchMorae } from "@/lib/pitchAccent";
import type { Word } from "@/lib/types";

export function PitchAccent({ word }: { word: Pick<Word, "reading" | "pitch_accents"> }) {
  if (!word.pitch_accents?.length) return <span className="pitch-unknown">{word.reading}<small title="尚无与此词形和读音完全匹配的词典音调">音调待核对</small></span>;
  return <span className="pitch-accent" title="东京式音调 · UniDic 2.1.2"><span className="pitch-label">东京</span>
    {word.pitch_accents.map(accent => <span className="pitch-variant" key={accent} aria-label={`${word.reading}，东京式音调 ${accent} 型`}>
      <span aria-hidden="true" className="pitch-reading">{pitchMorae(word.reading, accent).map((mora, index) => <span key={index} className={`pitch-mora ${mora.high ? "high" : "low"}${mora.drop ? " drop" : ""}`}>{mora.text}</span>)}</span>
      <span className="pitch-number" aria-hidden="true">[{accent}]</span>
    </span>)}
  </span>;
}
