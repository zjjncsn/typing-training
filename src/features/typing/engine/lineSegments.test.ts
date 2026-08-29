import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveLineIndexAt, splitContentLines } from './lineSegments.ts'

test('splits content into lines with engine positions', () => {
  assert.deepEqual(splitContentLines('abc\nde\n'), [
    { start: 0, end: 3, text: 'abc' },
    { start: 4, end: 6, text: 'de' },
  ])
})

test('skips blank separator lines', () => {
  assert.deepEqual(splitContentLines('abc\n\n\nde'), [
    { start: 0, end: 3, text: 'abc' },
    { start: 6, end: 8, text: 'de' },
  ])
})

test('keeps whitespace-only lines out of the result but preserves later positions', () => {
  assert.deepEqual(splitContentLines('ab\n  \ncd'), [
    { start: 0, end: 2, text: 'ab' },
    { start: 6, end: 8, text: 'cd' },
  ])
})

test('resolves the line a cursor position belongs to', () => {
  const lines = splitContentLines('abc\nde')

  assert.equal(resolveLineIndexAt(lines, 0), 0)
  assert.equal(resolveLineIndexAt(lines, 2), 0)
  assert.equal(resolveLineIndexAt(lines, 3), 0)
  assert.equal(resolveLineIndexAt(lines, 4), 1)
  assert.equal(resolveLineIndexAt(lines, 5), 1)
  assert.equal(resolveLineIndexAt(lines, 99), 1)
})
