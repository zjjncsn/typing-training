import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveArticleLineIndex, wrapArticleContent } from './articleLines.ts'

test('wraps articles at word boundaries without dropping the separating space', () => {
  const lines = wrapArticleContent('one two three', 8)

  assert.deepEqual(
    lines.map((line) => ({ text: line.text, start: line.start, inputEnd: line.inputEnd })),
    [
      { text: 'one two ', start: 0, inputEnd: 8 },
      { text: 'three', start: 8, inputEnd: 13 },
    ],
  )
})

test('preserves semantic newlines separately from visual wrapping', () => {
  const lines = wrapArticleContent('first\n\nsecond', 20)

  assert.deepEqual(
    lines.map((line) => [line.text, line.breakKind, line.inputEnd]),
    [
      ['first', 'newline', 6],
      ['', 'newline', 7],
      ['second', 'end', 13],
    ],
  )
})

test('splits a word that is longer than the available columns', () => {
  assert.deepEqual(
    wrapArticleContent('abcdefgh', 3).map((line) => line.text),
    ['abc', 'def', 'gh'],
  )
})

test('resolves the line containing the current engine position', () => {
  const lines = wrapArticleContent('one two three', 8)
  assert.equal(resolveArticleLineIndex(lines, 7), 0)
  assert.equal(resolveArticleLineIndex(lines, 8), 1)
  assert.equal(resolveArticleLineIndex(lines, 99), 1)
})
