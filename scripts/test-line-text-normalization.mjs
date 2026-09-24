import test from 'node:test';
import assert from 'node:assert/strict';

function normalizeLineText(text) {
  if (!text) return "";
  return String(text)
    .replace(/\r\n/g, "\n")
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n");
}

test('normalizeLineText converts literal \\n into actual newline characters', () => {
  const rawEscaped = "Benmi 最新外送說明如下：\\n🛵 滿 2,000 元： 不限距離，土城全區皆享免運！\\n🛵 滿 800 元：\\n距離店址 2公里內 ➔ 免運";
  const normalized = normalizeLineText(rawEscaped);

  assert.equal(normalized.includes('\\n'), false, 'Should not contain literal \\n string');
  assert.equal(normalized.split('\n').length, 4, 'Should have 4 lines separated by \\n');
  assert.equal(JSON.stringify(normalized).includes('\\\\n'), false, 'JSON serialization should not double escape newlines');
});

test('normalizeLineText leaves real newlines untouched', () => {
  const realNewlines = "Dòng 1\nDòng 2\r\nDòng 3";
  const normalized = normalizeLineText(realNewlines);

  assert.equal(normalized, "Dòng 1\nDòng 2\nDòng 3");
});
