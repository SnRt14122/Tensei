export function normalizePitchReading(reading: string): string {
  return reading.trim().normalize("NFKC").replace(/[ァ-ヶ]/g, kana => String.fromCharCode(kana.charCodeAt(0) - 0x60));
}

export function pitchMorae(reading: string, accent: number) {
  const morae: string[] = [];
  for (const kana of normalizePitchReading(reading)) {
    if (/[ゃゅょぁぃぅぇぉゎ]/.test(kana) && morae.length) morae[morae.length - 1] += kana;
    else morae.push(kana);
  }
  return morae.map((text, index) => ({ text, high: accent === 1 ? index === 0 : index > 0 && (accent === 0 || index < accent), drop: accent === index + 1 }));
}
