import accents from "./pitch-accents.json";
import { normalizePitchReading } from "../pitchAccent";

const index: Record<string, number[]> = accents;
export function lookupPitchAccent(surface: string, reading: string): number[] | null {
  return index[`${surface}|${normalizePitchReading(reading)}`] ?? null;
}
