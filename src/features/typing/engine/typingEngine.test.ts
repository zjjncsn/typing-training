import assert from 'node:assert/strict'
import test from 'node:test'

import {
  backspaceCharacter,
  createTypingSession,
  getExpectedCharacter,
  getTypingStats,
  keyboardKeyToCharacter,
  pauseTypingSession,
  restartTypingSession,
  resumeTypingSession,
  typeCharacter,
  typeKeyboardKey,
} from './typingEngine.ts'

test('starts on first input and completes a lesson', () => {
  let session = createTypingSession('ab')

  session = typeCharacter(session, 'a', 1_000)
  assert.equal(session.status, 'running')
  assert.equal(session.startedAt, 1_000)
  assert.equal(session.position, 1)

  session = typeCharacter(session, 'b', 2_000)
  assert.equal(session.status, 'completed')
  assert.equal(session.position, 2)
  assert.equal(session.correctCount, 2)
  assert.equal(session.activeElapsedMs, 1_000)
})

test('records an error and waits for the correct character by default', () => {
  let session = createTypingSession('a')

  session = typeCharacter(session, 'x', 100)
  assert.equal(session.position, 0)
  assert.equal(session.errorCount, 1)
  assert.equal(session.lastAttempt?.correct, false)
  assert.equal(getExpectedCharacter(session), 'a')

  session = typeCharacter(session, 'a', 200)
  assert.equal(session.status, 'completed')
  assert.equal(session.correctCount, 1)
})

test('can reject a matching character when the physical key is wrong', () => {
  const session = typeCharacter(createTypingSession('1'), '1', 100, false)

  assert.equal(session.status, 'running')
  assert.equal(session.position, 0)
  assert.equal(session.correctCount, 0)
  assert.equal(session.errorCount, 1)
  assert.equal(session.lastAttempt?.received, '1')
  assert.equal(session.lastAttempt?.correct, false)
})

test('can advance after mistakes when configured', () => {
  const session = typeCharacter(
    createTypingSession('a', { mistakePolicy: 'advance' }),
    'x',
    100,
  )

  assert.equal(session.status, 'completed')
  assert.equal(session.position, 1)
  assert.equal(session.correctCount, 0)
  assert.equal(session.errorCount, 1)
})

test('excludes paused time from elapsed time', () => {
  let session = typeCharacter(createTypingSession('ab'), 'a', 1_000)
  session = pauseTypingSession(session, 2_000)

  assert.equal(getTypingStats(session, 10_000).elapsedMs, 1_000)

  session = resumeTypingSession(session, 20_000)
  session = typeCharacter(session, 'b', 21_000)

  assert.equal(session.activeElapsedMs, 2_000)
})

test('calculates accuracy, progress, CPM and WPM', () => {
  let session = createTypingSession('ab')
  session = typeCharacter(session, 'x', 0)
  session = typeCharacter(session, 'a', 30_000)
  session = typeCharacter(session, 'b', 60_000)

  const stats = getTypingStats(session, 60_000)
  assert.equal(stats.progress, 100)
  assert.equal(stats.accuracy, 2 / 3 * 100)
  assert.equal(stats.cpm, 2)
  assert.equal(stats.wpm, 0.4)
})

test('maps physical keyboard keys and ignores control keys', () => {
  assert.equal(keyboardKeyToCharacter('Enter'), '\n')
  assert.equal(keyboardKeyToCharacter('Tab'), '\t')
  assert.equal(keyboardKeyToCharacter('Shift'), null)

  const idle = createTypingSession('\n')
  assert.equal(typeKeyboardKey(idle, 'Shift', 100), idle)
  assert.equal(typeKeyboardKey(idle, 'Enter', 100).status, 'completed')
})

test('supports Unicode code points and restarting', () => {
  const completed = typeCharacter(createTypingSession('你'), '你', 100)
  const restarted = restartTypingSession(completed)

  assert.equal(completed.status, 'completed')
  assert.equal(restarted.status, 'idle')
  assert.equal(restarted.position, 0)
})

test('can ignore letter case and advance past whitespace automatically', () => {
  let session = createTypingSession('A  \n\tB', {
    caseSensitive: false,
    autoAdvanceWhitespace: true,
  })

  session = typeCharacter(session, 'a', 100)
  assert.equal(session.position, 5)
  assert.equal(getExpectedCharacter(session), 'B')

  session = typeCharacter(session, ' ', 150)
  assert.equal(session.position, 5)
  assert.equal(session.errorCount, 1)

  session = typeCharacter(session, 'b', 200)
  assert.equal(session.status, 'completed')
  assert.equal(session.correctCount, 2)
  assert.equal(session.errorCount, 1)
})

test('skips blank lines only after typing a newline when configured', () => {
  let session = createTypingSession('a\n\nb', { autoAdvanceBlankLines: true })

  session = typeCharacter(session, 'a', 100)
  assert.equal(session.position, 1)
  assert.equal(getExpectedCharacter(session), '\n')

  session = typeCharacter(session, '\n', 200)
  assert.equal(session.position, 3)
  assert.equal(getExpectedCharacter(session), 'b')
})

test('keeps blank lines when the option is off', () => {
  let session = createTypingSession('a\n\nb')

  session = typeCharacter(session, 'a', 100)
  session = typeCharacter(session, '\n', 200)

  assert.equal(session.position, 2)
  assert.equal(getExpectedCharacter(session), '\n')
})

test('backspace rewinds without updating accuracy counters', () => {
  let session = createTypingSession('ab')

  session = typeCharacter(session, 'a', 100)
  session = typeCharacter(session, 'x', 150)

  assert.equal(session.position, 1)
  assert.equal(session.errorCount, 1)

  session = backspaceCharacter(session)
  assert.equal(session.position, 1)
  assert.equal(session.correctCount, 1)
  assert.equal(session.errorCount, 1)
  assert.equal(session.lastAttempt, null)

  session = backspaceCharacter(session)
  assert.equal(session.position, 0)
  assert.equal(session.correctCount, 1)
  assert.equal(session.errorCount, 1)
  assert.equal(session.lastAttempt, null)

  session = typeCharacter(session, 'a', 200)
  assert.equal(session.position, 1)
  assert.equal(session.correctCount, 2)
  assert.equal(session.errorCount, 1)
  assert.equal(getTypingStats(session).accuracy, (2 / 3) * 100)
})

test('ignores backspace outside a running session and at the start', () => {
  const idle = createTypingSession('ab')
  assert.equal(backspaceCharacter(idle), idle)

  const atStart = { ...typeCharacter(createTypingSession('ab'), 'a', 100), position: 0 }
  const rewound = backspaceCharacter(atStart)
  assert.equal(rewound.status, 'running')
  assert.equal(rewound.position, 0)

  const completed = typeCharacter(createTypingSession('a'), 'a', 100)
  assert.equal(backspaceCharacter(completed).position, 1)
  assert.equal(backspaceCharacter(completed).status, 'completed')
})
