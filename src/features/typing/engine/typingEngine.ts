import type {
  TypingEngineOptions,
  TypingSession,
  TypingStats,
} from './types'

const defaultOptions: TypingEngineOptions = {
  mistakePolicy: 'retry',
  caseSensitive: true,
  autoAdvanceWhitespace: false,
  autoAdvanceBlankLines: false,
}

function characterCount(value: string): number {
  return Array.from(value).length
}

function characterAt(value: string, position: number): string | undefined {
  return Array.from(value)[position]
}

function normalizeTimestamp(timestamp: number): number {
  if (!Number.isFinite(timestamp) || timestamp < 0) {
    throw new RangeError('timestamp must be a non-negative finite number')
  }

  return timestamp
}

function activeDuration(session: TypingSession, timestamp: number): number {
  if (session.status !== 'running' || session.activeStartedAt === null) {
    return session.activeElapsedMs
  }

  return session.activeElapsedMs + Math.max(0, timestamp - session.activeStartedAt)
}

function charactersMatch(
  expected: string,
  received: string,
  options: TypingEngineOptions,
): boolean {
  if (options.caseSensitive) {
    return expected === received
  }

  return expected.toLocaleLowerCase() === received.toLocaleLowerCase()
}

function advancePastWhitespace(
  content: string,
  position: number,
  options: TypingEngineOptions,
): number {
  if (!options.autoAdvanceWhitespace) return position

  let nextPosition = position
  while (/\s/u.test(characterAt(content, nextPosition) ?? '')) nextPosition += 1
  return nextPosition
}

function advancePastBlankLines(
  content: string,
  position: number,
  options: TypingEngineOptions,
): number {
  if (!options.autoAdvanceBlankLines) return position

  let nextPosition = position
  while (characterAt(content, nextPosition) === '\n') nextPosition += 1
  return nextPosition
}

export function createTypingSession(
  content: string,
  options: Partial<TypingEngineOptions> = {},
): TypingSession {
  if (content.length === 0) {
    throw new Error('Typing content cannot be empty')
  }

  return {
    content,
    status: 'idle',
    position: 0,
    correctCount: 0,
    errorCount: 0,
    startedAt: null,
    activeStartedAt: null,
    activeElapsedMs: 0,
    completedAt: null,
    lastAttempt: null,
    options: { ...defaultOptions, ...options },
  }
}

/**
 * Converts KeyboardEvent.key values into characters understood by the engine.
 * Modifier and navigation keys return null and should be ignored by the caller.
 */
export function keyboardKeyToCharacter(key: string): string | null {
  if (key === 'Enter') return '\n'
  if (key === 'Tab') return '\t'
  if (key === 'Spacebar') return ' '

  return characterCount(key) === 1 ? key : null
}

/**
 * Applies one input character. An idle session starts on its first valid input.
 * Paused and completed sessions intentionally ignore input.
 */
export function typeCharacter(
  session: TypingSession,
  received: string,
  timestamp = Date.now(),
  correctOverride?: boolean,
): TypingSession {
  const now = normalizeTimestamp(timestamp)

  if (session.status === 'paused' || session.status === 'completed') {
    return session
  }

  if (characterCount(received) !== 1) {
    return session
  }

  const expected = characterAt(session.content, session.position)
  if (expected === undefined) {
    return session
  }

  const runningSession: TypingSession =
    session.status === 'idle'
      ? {
          ...session,
          status: 'running',
          startedAt: now,
          activeStartedAt: now,
        }
      : session

  const correct =
    correctOverride ?? charactersMatch(expected, received, runningSession.options)
  const shouldAdvance = correct || runningSession.options.mistakePolicy === 'advance'
  let nextPosition = advancePastWhitespace(
    runningSession.content,
    runningSession.position + (shouldAdvance ? 1 : 0),
    runningSession.options,
  )

  if (correct && expected === '\n') {
    nextPosition = advancePastBlankLines(runningSession.content, nextPosition, runningSession.options)
  }

  const completed = nextPosition >= characterCount(runningSession.content)

  const nextSession: TypingSession = {
    ...runningSession,
    position: nextPosition,
    correctCount: runningSession.correctCount + (correct ? 1 : 0),
    errorCount: runningSession.errorCount + (correct ? 0 : 1),
    lastAttempt: {
      position: runningSession.position,
      expected,
      received,
      correct,
      timestamp: now,
    },
  }

  if (!completed) {
    return nextSession
  }

  return {
    ...nextSession,
    status: 'completed',
    activeElapsedMs: activeDuration(nextSession, now),
    activeStartedAt: null,
    completedAt: now,
  }
}

export function typeKeyboardKey(
  session: TypingSession,
  key: string,
  timestamp = Date.now(),
): TypingSession {
  const character = keyboardKeyToCharacter(key)
  return character === null ? session : typeCharacter(session, character, timestamp)
}

/**
 * Moves the cursor back one position without touching the accuracy counters:
 * mistakes made before a backspace stay counted, and retyping the character
 * afterwards counts as a fresh correct keystroke.
 */
export function backspaceCharacter(session: TypingSession): TypingSession {
  if (session.status !== 'running' || session.position === 0) {
    return session
  }

  if (
    session.lastAttempt?.correct === false &&
    session.lastAttempt.position === session.position
  ) {
    return {
      ...session,
      lastAttempt: null,
    }
  }

  return {
    ...session,
    position: session.position - 1,
    lastAttempt: null,
  }
}

export function pauseTypingSession(
  session: TypingSession,
  timestamp = Date.now(),
): TypingSession {
  if (session.status !== 'running') {
    return session
  }

  const now = normalizeTimestamp(timestamp)

  return {
    ...session,
    status: 'paused',
    activeElapsedMs: activeDuration(session, now),
    activeStartedAt: null,
  }
}

export function resumeTypingSession(
  session: TypingSession,
  timestamp = Date.now(),
): TypingSession {
  if (session.status !== 'paused') {
    return session
  }

  const now = normalizeTimestamp(timestamp)

  return {
    ...session,
    status: 'running',
    activeStartedAt: now,
  }
}

export function restartTypingSession(session: TypingSession): TypingSession {
  return createTypingSession(session.content, session.options)
}

export function getExpectedCharacter(session: TypingSession): string | null {
  return characterAt(session.content, session.position) ?? null
}

export function getTypingStats(
  session: TypingSession,
  timestamp = Date.now(),
): TypingStats {
  const now = normalizeTimestamp(timestamp)
  const contentLength = characterCount(session.content)
  const elapsedMs = activeDuration(session, now)
  const totalKeystrokes = session.correctCount + session.errorCount
  const elapsedMinutes = elapsedMs / 60_000

  return {
    elapsedMs,
    progress: contentLength === 0 ? 0 : (session.position / contentLength) * 100,
    accuracy: totalKeystrokes === 0 ? 100 : (session.correctCount / totalKeystrokes) * 100,
    cpm: elapsedMinutes === 0 ? 0 : session.correctCount / elapsedMinutes,
    wpm: elapsedMinutes === 0 ? 0 : session.correctCount / 5 / elapsedMinutes,
    correctCount: session.correctCount,
    errorCount: session.errorCount,
    totalKeystrokes,
    remainingCharacters: Math.max(0, contentLength - session.position),
  }
}

export type {
  MistakePolicy,
  TypingAttempt,
  TypingEngineOptions,
  TypingSession,
  TypingSessionStatus,
  TypingStats,
} from './types'
export type { ContentLine } from './lineSegments'
export { resolveLineIndexAt, splitContentLines } from './lineSegments.ts'
