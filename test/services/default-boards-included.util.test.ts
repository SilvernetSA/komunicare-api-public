import test from 'node:test';
import assert from 'node:assert/strict';

import { sanitizeDefaultBoardsIncluded } from '../../src/nest/common/default-boards-included.util';

// ─── canonical / empty input ────────────────────────────────────────────────

test('sanitizeDefaultBoardsIncluded: empty input returns the official fixed entry', () => {
  const result = sanitizeDefaultBoardsIncluded([]);
  assert.deepEqual(result, [
    { nameOnJSON: 'komunicare', homeBoard: 'komunicare' },
  ]);
});

test('sanitizeDefaultBoardsIncluded: null/undefined input returns the official fixed entry', () => {
  assert.deepEqual(sanitizeDefaultBoardsIncluded(null), [
    { nameOnJSON: 'komunicare', homeBoard: 'komunicare' },
  ]);
  assert.deepEqual(sanitizeDefaultBoardsIncluded(undefined), [
    { nameOnJSON: 'komunicare', homeBoard: 'komunicare' },
  ]);
});

test('sanitizeDefaultBoardsIncluded: canonical homeBoard values are preserved as-is', () => {
  const result = sanitizeDefaultBoardsIncluded([
    { nameOnJSON: 'komunicare', homeBoard: 'komunicare' },
  ]);
  assert.deepEqual(result, [
    { nameOnJSON: 'komunicare', homeBoard: 'komunicare' },
  ]);
});

// ─── user-copy scenario ──────────────────────────────────────────────────────

test('sanitizeDefaultBoardsIncluded: user-provided non-canonical homeBoard is preserved', () => {
  const userBoardId = '6a15706e356fbc184437ad95';
  const result = sanitizeDefaultBoardsIncluded([
    { nameOnJSON: 'komunicare', homeBoard: userBoardId },
  ]);
  assert.deepEqual(result, [
    { nameOnJSON: 'komunicare', homeBoard: userBoardId },
  ]);
});

test('sanitizeDefaultBoardsIncluded: unknown fixed entries are ignored', () => {
  const customKomunicareBoard = '000000000000000000000001';
  const result = sanitizeDefaultBoardsIncluded([
    { nameOnJSON: 'advanced', homeBoard: 'root' },
    { nameOnJSON: 'picSeePal', homeBoard: 'jjmlUcQs19' },
    { nameOnJSON: 'komunicare', homeBoard: customKomunicareBoard },
  ]);
  assert.deepEqual(result, [
    { nameOnJSON: 'komunicare', homeBoard: customKomunicareBoard },
  ]);
});

// ─── custom entry ────────────────────────────────────────────────────────────

test('sanitizeDefaultBoardsIncluded: custom entry is appended after fixed entries', () => {
  const result = sanitizeDefaultBoardsIncluded([
    { nameOnJSON: 'komunicare', homeBoard: 'komunicare' },
    { nameOnJSON: 'custom', homeBoard: 'my-custom-board' },
  ]);
  assert.deepEqual(result, [
    { nameOnJSON: 'komunicare', homeBoard: 'komunicare' },
    { nameOnJSON: 'custom', homeBoard: 'my-custom-board' },
  ]);
});

test('sanitizeDefaultBoardsIncluded: only the last custom entry is kept', () => {
  const result = sanitizeDefaultBoardsIncluded([
    { nameOnJSON: 'custom', homeBoard: 'first-custom' },
    { nameOnJSON: 'custom', homeBoard: 'last-custom' },
  ]);
  assert.equal(result.length, 2);
  assert.deepEqual(result[1], { nameOnJSON: 'custom', homeBoard: 'last-custom' });
});

// ─── edge cases ──────────────────────────────────────────────────────────────

test('sanitizeDefaultBoardsIncluded: unknown nameOnJSON entries are ignored', () => {
  const result = sanitizeDefaultBoardsIncluded([
    { nameOnJSON: 'unknown', homeBoard: 'some-board' },
  ]);
  assert.deepEqual(result, [
    { nameOnJSON: 'komunicare', homeBoard: 'komunicare' },
  ]);
});

test('sanitizeDefaultBoardsIncluded: entries with missing homeBoard are ignored', () => {
  const result = sanitizeDefaultBoardsIncluded([
    { nameOnJSON: 'komunicare', homeBoard: '' },
  ]);
  assert.deepEqual(result[0], { nameOnJSON: 'komunicare', homeBoard: 'komunicare' });
});
