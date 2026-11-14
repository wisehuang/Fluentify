// Run with: node --test
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  DEFAULT_TONE,
  DEFAULT_REASONING_EFFORT,
  TONES,
  resolveTone,
  resolveReasoningEffort,
  buildMessages,
  parseResult,
  diffWords
} = require('../shared.js');

test('resolveTone falls back to the default for unknown keys', () => {
  assert.equal(resolveTone('formal'), 'formal');
  assert.equal(resolveTone('nope'), DEFAULT_TONE);
  assert.equal(resolveTone(undefined), DEFAULT_TONE);
  assert.equal(resolveTone('toString'), DEFAULT_TONE);
});

test('resolveReasoningEffort falls back to the default for unknown values', () => {
  assert.equal(resolveReasoningEffort('high'), 'high');
  assert.equal(resolveReasoningEffort('extreme'), DEFAULT_REASONING_EFFORT);
  assert.equal(resolveReasoningEffort(undefined), DEFAULT_REASONING_EFFORT);
});

test('buildMessages puts the tone style in the system prompt and the raw text in the user turn', () => {
  const messages = buildMessages('i has a apple', 'casual');
  assert.equal(messages.length, 2);
  assert.equal(messages[0].role, 'system');
  assert.ok(messages[0].content.includes(TONES.casual.style));
  assert.ok(messages[0].content.includes('JSON'));
  assert.deepEqual(messages[1], { role: 'user', content: 'i has a apple' });
});

test('parseResult reads the rewrite and note from JSON', () => {
  const out = parseResult('{"rewrite":"I have an apple.","note":" Fixed verb and article. "}');
  assert.deepEqual(out, { text: 'I have an apple.', note: 'Fixed verb and article.' });
});

test('parseResult handles code fences and a quoted rewrite', () => {
  const out = parseResult('```json\n{"rewrite":"\\"I have an apple.\\""}\n```');
  assert.deepEqual(out, { text: 'I have an apple.', note: '' });
});

test('parseResult falls back to the plain reply when it is not JSON', () => {
  assert.deepEqual(parseResult('"I have an apple."'), { text: 'I have an apple.', note: '' });
  assert.deepEqual(parseResult("It's fine."), { text: "It's fine.", note: '' });
});

test('parseResult rejects JSON without a usable rewrite', () => {
  assert.throws(() => parseResult('{"rewrite":""}'), /no rewrite/);
  assert.throws(() => parseResult('{"note":"x"}'), /no rewrite/);
});

test('parseResult rejects an empty reply', () => {
  assert.throws(() => parseResult('   '), /empty reply/);
  assert.throws(() => parseResult(undefined), /empty reply/);
});

test('diffWords flags only words that changed and keeps the text intact', () => {
  const tokens = diffWords('i has a apple today', 'I have an apple today');
  assert.equal(tokens.map(t => t.text).join(''), 'I have an apple today');
  assert.deepEqual(
    tokens.filter(t => t.changed).map(t => t.text),
    ['I', 'have', 'an']
  );
});

test('diffWords never flags whitespace and handles empty input', () => {
  assert.deepEqual(diffWords('', 'Hello  there'), [
    { text: 'Hello', changed: false },
    { text: '  ', changed: false },
    { text: 'there', changed: false }
  ]);
  assert.deepEqual(diffWords('hello', ''), []);
  assert.ok(diffWords('a b', 'a\nc b').every(t => !/^\s+$/.test(t.text) || !t.changed));
});
