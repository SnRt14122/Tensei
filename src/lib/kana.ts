/** 将片假名转换为平假名，便于宽松地比较用户输入 */
export function katakanaToHiragana(input: string): string {
  return input.replace(/[ァ-ヶ]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60)
  );
}

/** 规范化假名输入：转半角、片假名转平假名、去除首尾空格 */
export function normalizeKana(input: string): string {
  return katakanaToHiragana(input.trim());
}
