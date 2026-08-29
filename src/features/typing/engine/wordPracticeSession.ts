import {
  backspaceCharacter,
  createTypingSession,
  getExpectedCharacter,
  getTypingStats,
  pauseTypingSession,
  restartTypingSession,
  resumeTypingSession,
  typeCharacter,
  type TypingEngineOptions,
  type TypingSession,
  type TypingStats,
} from './typingEngine.ts'

export interface WordPracticeSession {
  words: string[]
  wordIndex: number
  completedCharacterCount: number
  totalCharacterCount: number
  typing: TypingSession
}

const wordOptions: Partial<TypingEngineOptions> = {
  caseSensitive: true,
  autoAdvanceWhitespace: false,
}

function characterCount(value: string): number {
  return Array.from(value).length
}

function wordContent(words: readonly string[], wordIndex: number): string {
  return `${words[wordIndex]!}${wordIndex < words.length - 1 ? ' ' : ''}`
}

export function createWordPracticeSession(
  words: readonly string[],
  initialWordIndex = 0,
): WordPracticeSession {
  const safeWords = words.filter((word) => word.length > 0)
  if (safeWords.length === 0) throw new Error('Word practice requires at least one word')

  const normalizedIndex = Number.isFinite(initialWordIndex) ? Math.trunc(initialWordIndex) : 0
  const wordIndex = Math.min(Math.max(0, normalizedIndex), safeWords.length - 1)

  return {
    words: [...safeWords],
    wordIndex,
    completedCharacterCount: safeWords
      .slice(0, wordIndex)
      .reduce((sum, word) => sum + characterCount(word) + 1, 0),
    totalCharacterCount:
      safeWords.reduce((sum, word) => sum + characterCount(word), 0) + safeWords.length - 1,
    typing: createTypingSession(wordContent(safeWords, wordIndex), wordOptions),
  }
}

export function typeWordPracticeCharacter(
  session: WordPracticeSession,
  received: string,
  timestamp = Date.now(),
  correctOverride?: boolean,
): WordPracticeSession {
  const typing = typeCharacter(session.typing, received, timestamp, correctOverride)
  if (typing.status !== 'completed' || session.wordIndex >= session.words.length - 1) {
    return { ...session, typing }
  }

  const nextWordIndex = session.wordIndex + 1

  return {
    ...session,
    wordIndex: nextWordIndex,
    completedCharacterCount:
      session.completedCharacterCount + characterCount(session.typing.content),
    typing: {
      ...typing,
      content: wordContent(session.words, nextWordIndex),
      status: 'running',
      position: 0,
      activeStartedAt: timestamp,
      completedAt: null,
      lastAttempt: null,
    },
  }
}

export function backspaceWordPractice(session: WordPracticeSession): WordPracticeSession {
  return { ...session, typing: backspaceCharacter(session.typing) }
}

export function pauseWordPractice(
  session: WordPracticeSession,
  timestamp = Date.now(),
): WordPracticeSession {
  return { ...session, typing: pauseTypingSession(session.typing, timestamp) }
}

export function resumeWordPractice(
  session: WordPracticeSession,
  timestamp = Date.now(),
): WordPracticeSession {
  return { ...session, typing: resumeTypingSession(session.typing, timestamp) }
}

export function restartWordPractice(session: WordPracticeSession): WordPracticeSession {
  return {
    ...session,
    wordIndex: 0,
    completedCharacterCount: 0,
    typing: restartTypingSession({
      ...session.typing,
      content: wordContent(session.words, 0),
    }),
  }
}

export function getWordPracticeExpectedCharacter(session: WordPracticeSession): string | null {
  return getExpectedCharacter(session.typing)
}

export function getWordPracticeStats(
  session: WordPracticeSession,
  timestamp = Date.now(),
): TypingStats {
  const stats = getTypingStats(session.typing, timestamp)
  const completedCharacters = session.completedCharacterCount + session.typing.position

  return {
    ...stats,
    progress:
      session.totalCharacterCount === 0
        ? 0
        : (completedCharacters / session.totalCharacterCount) * 100,
    remainingCharacters: Math.max(0, session.totalCharacterCount - completedCharacters),
  }
}
