import assert from 'node:assert/strict';
import test from 'node:test';
import { activityWeek, buildRecallDeck } from '../src/lib/activityPractice.ts';

const day = {
  key: '2026-09-06', label: '2026年9月6日',
  learnedWords: [{ id: '1', surface: '部屋', reading: 'へや', meaning: '房间' }],
  learnedPatterns: [{ id: '1', pattern: 'てもいい', meaning: '许可' }],
  attempts: 4, correct: 3, mistakes: [], quizTypes: [], reviewedWords: [],
};

test('week starts on Monday and includes empty days and the month boundary', () => {
  const week = activityWeek([day], '2026-09-06');
  assert.equal(week.length, 7);
  assert.equal(week[0].key, '2026-08-31');
  assert.equal(week[0].total, 0);
  assert.equal(week[6].key, day.key);
  assert.deepEqual([week[6].words, week[6].patterns, week[6].attempts, week[6].total], [1, 1, 4, 6]);
});

test('future dates are disabled and previous week navigation crosses the year', () => {
  const week = activityWeek([], '2026-01-01');
  assert.equal(week[0].key, '2025-12-29');
  assert.deepEqual(week.map(value => value.future), [false, false, false, false, true, true, true]);
  assert.equal(activityWeek([], '2026-01-01', -1)[0].key, '2025-12-22');
});

test('recall deduplicates by id but keeps word and grammar namespaces separate', () => {
  const original = structuredClone(day);
  const deck = buildRecallDeck([day, day]);
  assert.equal(deck.length, 2);
  assert.deepEqual(deck.map(value => value.id), ['word:1', 'pattern:1']);
  assert.equal(deck[0].reading, 'へや');
  assert.equal(deck[1].meaning, '许可');
  assert.deepEqual(day, original);
});

test('does not build answerless or invented quiz cards', () => {
  assert.deepEqual(buildRecallDeck([{ ...day, learnedWords: [{ ...day.learnedWords[0], meaning: ' ' }], learnedPatterns: [] }]), []);
  assert.deepEqual(buildRecallDeck([]), []);
});
