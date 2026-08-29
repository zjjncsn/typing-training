import assert from 'node:assert/strict'
import test from 'node:test'

import {
  backspaceWordPractice,
  createWordPracticeSession,
  getWordPracticeExpectedCharacter,
  getWordPracticeStats,
  restartWordPractice,
  typeWordPracticeCharacter,
} from './wordPracticeSession.ts'

test('advances to the next word and keeps cumulative statistics', () => {
  let session = createWordPracticeSession(['a', 'bc'])

  session = typeWordPracticeCharacter(session, 'a', 100)
  assert.equal(session.wordIndex, 0)
  assert.equal(getWordPracticeExpectedCharacter(session), ' ')

  session = typeWordPracticeCharacter(session, 'x', 150)
  assert.equal(session.wordIndex, 0)
  assert.equal(getWordPracticeExpectedCharacter(session), ' ')

  session = typeWordPracticeCharacter(session, ' ', 200)
  assert.equal(session.wordIndex, 1)
  assert.equal(session.typing.status, 'running')
  assert.equal(getWordPracticeExpectedCharacter(session), 'b')

  session = typeWordPracticeCharacter(session, 'b', 250)

  const stats = getWordPracticeStats(session, 250)
  assert.equal(stats.correctCount, 3)
  assert.equal(stats.errorCount, 1)
  assert.equal(stats.progress, (3 / 4) * 100)
})

test('requires spaces inside dictionary entries and completes the final word', () => {
  let session = createWordPracticeSession(['a b'])

  session = typeWordPracticeCharacter(session, 'a', 100)
  assert.equal(getWordPracticeExpectedCharacter(session), ' ')
  session = typeWordPracticeCharacter(session, ' ', 150)
  session = typeWordPracticeCharacter(session, 'b', 200)

  assert.equal(session.typing.status, 'completed')
  assert.equal(getWordPracticeStats(session, 200).progress, 100)
})

test('backspace stays within the current word and restart returns to the first word', () => {
  let session = createWordPracticeSession(['ab', 'cd'])

  session = typeWordPracticeCharacter(session, 'a', 100)
  session = backspaceWordPractice(session)
  assert.equal(session.typing.position, 0)

  session = typeWordPracticeCharacter(session, 'a', 150)
  session = typeWordPracticeCharacter(session, 'b', 200)
  assert.equal(session.wordIndex, 0)
  assert.equal(getWordPracticeExpectedCharacter(session), ' ')
  session = typeWordPracticeCharacter(session, ' ', 250)
  assert.equal(session.wordIndex, 1)

  session = restartWordPractice(session)
  assert.equal(session.wordIndex, 0)
  assert.equal(session.typing.content, 'ab ')
  assert.equal(session.typing.status, 'idle')
  assert.equal(session.typing.correctCount, 0)
})

test('can resume at a saved word while preserving whole-dictionary progress', () => {
  const session = createWordPracticeSession(['one', 'two', 'three'], 1)

  assert.equal(session.wordIndex, 1)
  assert.equal(session.typing.content, 'two ')
  assert.equal(session.completedCharacterCount, 4)
  assert.equal(getWordPracticeStats(session, 0).progress, (4 / 13) * 100)
})
