import assert from 'node:assert/strict';
import test from 'node:test';
import { filterActivityDays } from '../src/lib/activityView.ts';

const day = {
  key: '2026-09-06', label: '2026年9月6日',
  learnedWords: [{ id: '1', surface: '部屋', reading: 'へや', meaning: '房间' }],
  learnedPatterns: [{ id: 'p1', pattern: 'てもいい', meaning: '许可' }],
  reviewedWords: [{ surface: '東京', reading: 'とうきょう' }],
  attempts: 2, correct: 1, quizTypes: ['词义检测'],
  mistakes: [{ label: '雨', reading: 'あめ', type: '词义检测', answer: '错误答案' }],
};

test('range keeps the boundary day and excludes older days', () => {
  assert.equal(filterActivityDays([day], day.key, 'all', '').length, 1);
  assert.equal(filterActivityDays([day], '2026-09-07', 'all', '').length, 0);
});

test('filters rows before rendering, so an unmatched query gives an empty state', () => {
  assert.deepEqual(filterActivityDays([day], '2026-01-01', 'all', 'not-found'), []);
  const [result] = filterActivityDays([day], '2026-01-01', 'all', '房间');
  assert.equal(result.learnedWords.length, 1);
  assert.equal(result.learnedPatterns.length, 0);
  assert.equal(result.attempts, 0);
  assert.equal(result.mistakes.length, 0);
});

test('quiz and mistake modes omit unrelated learning days', () => {
  const learnedOnly = { ...day, attempts: 0, correct: 0, mistakes: [] };
  assert.deepEqual(filterActivityDays([learnedOnly], day.key, 'quiz', ''), []);
  assert.deepEqual(filterActivityDays([learnedOnly], day.key, 'mistakes', ''), []);
  const [result] = filterActivityDays([day], day.key, 'mistakes', 'あめ');
  assert.equal(result.mistakes.length, 1);
  assert.equal(result.learnedWords.length, 0);
});

test('searches quiz words without mutating server data', () => {
  const original = structuredClone(day);
  const [result] = filterActivityDays([day], day.key, 'quiz', 'とうきょう');
  assert.equal(result.attempts, 2);
  assert.equal(result.learnedWords.length, 0);
  assert.deepEqual(day, original);
});
