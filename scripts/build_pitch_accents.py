"""Build exact-form accents: pip install fugashi==1.5.2 unidic-lite==1.0.8."""
import json
import re
import shutil
import unicodedata
from pathlib import Path

import fugashi
import unidic_lite

ROOT = Path(__file__).resolve().parents[1]


def normalize(value):
    return ''.join(chr(ord(c) - 0x60) if '\u30a1' <= c <= '\u30f6' else c
                   for c in unicodedata.normalize('NFKC', value.strip()))


def build():
    tagger = fugashi.Tagger()
    entries = {}
    sources = sorted((ROOT / 'supabase/content').glob('words_*.json'))
    sources.append(ROOT / 'supabase/seed/jlpt_n5.json')
    for source in sources:
        data = json.loads(source.read_text())
        for word in data.get('words', []) if isinstance(data, dict) else data:
            entries[(word['surface'], normalize(word['reading']))] = word
    accents = {}
    missing = []
    for surface, reading in sorted(entries):
        matches = set()
        mora_count = len(re.sub('[ゃゅょぁぃぅぇぉゎ]', '', reading))
        # Split compounds and inflected forms do not establish a dictionary accent.
        for analysis in tagger.nbestToNodeList(surface, 16):
            if len(analysis) != 1 or analysis[0].is_unk:
                continue
            node = analysis[0]
            feature = node.feature
            if node.surface != surface or feature.orthBase != surface:
                continue
            if normalize(feature.kana) != reading or normalize(feature.kanaBase) != reading:
                continue
            for accent in feature.aType.split(','):
                if accent.isdigit() and 0 <= int(accent) <= mora_count:
                    matches.add(int(accent))
        if matches:
            accents[f'{surface}|{reading}'] = sorted(matches)
        else:
            missing.append({'surface': surface, 'reading': reading})
    output = ROOT / 'src/lib/data/pitch-accents.json'
    output.write_text(json.dumps(accents, ensure_ascii=False, separators=(',', ':')) + '\n')
    report = ROOT / 'docs/data/pitch-accent-coverage.json'
    report.parent.mkdir(parents=True, exist_ok=True)
    report.write_text(json.dumps({'source': 'UniDic 2.1.2 (unidic-lite 1.0.8)', 'total': len(entries),
                                 'matched': len(accents), 'unmatched': missing}, ensure_ascii=False, indent=2) + '\n')
    license_dir = ROOT / 'public/licenses/unidic'
    license_dir.mkdir(parents=True, exist_ok=True)
    for name in ['BSD', 'AUTHORS']:
        shutil.copyfile(Path(unidic_lite.DICDIR) / name, license_dir / f'{name}.txt')
    print(f'Exact dictionary matches: {len(accents)}/{len(entries)}; unmatched: {len(missing)}')


if __name__ == '__main__':
    build()
