/**
 * 首页随机展示的日语歌词 + 中文翻译。
 * 当前为占位示例数据，真实歌词来源待补充。
 * 后续可将本文件替换为从数据库表（例如 lyrics）读取，
 * 只需保持 LyricLine 接口不变即可无缝切换。
 */
export interface LyricLine {
  jp: string;
  cn: string;
  source: string;
}

export const placeholderLyrics: LyricLine[] = [
  {
    jp: "見たことのない朝が来る",
    cn: "从未见过的早晨将要到来",
    source: "占位示例 · 来源待补充",
  },
  {
    jp: "夜に駆ける、それだけでいい",
    cn: "在夜里奔跑，仅此而已",
    source: "占位示例 · 来源待补充",
  },
  {
    jp: "君の声が、遠くまで届くように",
    cn: "愿你的声音，能传到很远的地方",
    source: "占位示例 · 来源待补充",
  },
  {
    jp: "光の中で、また会おう",
    cn: "在光里，我们再见",
    source: "占位示例 · 来源待补充",
  },
];

export function pickRandomLyric(): LyricLine {
  const i = Math.floor(Math.random() * placeholderLyrics.length);
  return placeholderLyrics[i];
}
