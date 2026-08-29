export type TypingSessionStatus = 'idle' | 'running' | 'paused' | 'completed'

export type MistakePolicy = 'retry' | 'advance'

export interface TypingEngineOptions {
  mistakePolicy: MistakePolicy
  caseSensitive: boolean
  autoAdvanceWhitespace: boolean
  autoAdvanceBlankLines: boolean
}

export interface TypingAttempt {
  position: number
  expected: string
  received: string
  correct: boolean
  timestamp: number
}

export interface TypingSession {
  content: string
  status: TypingSessionStatus
  position: number
  correctCount: number
  errorCount: number
  startedAt: number | null
  activeStartedAt: number | null
  activeElapsedMs: number
  completedAt: number | null
  lastAttempt: TypingAttempt | null
  options: TypingEngineOptions
}

export interface TypingStats {
  elapsedMs: number
  progress: number
  accuracy: number
  cpm: number
  wpm: number
  correctCount: number
  errorCount: number
  totalKeystrokes: number
  remainingCharacters: number
}
