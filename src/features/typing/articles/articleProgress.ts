export interface ArticleProgressEntry {
  position: number
  completed: boolean
  updatedAt: number
}

export interface ArticleProgressState {
  schemaVersion: 1
  lastArticleId: string | null
  articles: Record<string, ArticleProgressEntry>
}

interface LegacyArticlePosition {
  articleId: string
  position: number
}

interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export const articleProgressStorageKey = 'typing-practice.article-progress.v1'
export const legacyArticlePositionStorageKey = 'typing-practice.article-position.v1'

export function createEmptyArticleProgress(): ArticleProgressState {
  return { schemaVersion: 1, lastArticleId: null, articles: {} }
}

function parseJson(raw: string | null): unknown {
  if (!raw) return null
  try {
    return JSON.parse(raw) as unknown
  } catch {
    return null
  }
}

function parseProgressEntry(value: unknown): ArticleProgressEntry | null {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('position' in value) ||
    !('completed' in value) ||
    !('updatedAt' in value) ||
    typeof value.position !== 'number' ||
    !Number.isFinite(value.position) ||
    typeof value.completed !== 'boolean' ||
    typeof value.updatedAt !== 'number' ||
    !Number.isFinite(value.updatedAt)
  ) {
    return null
  }

  return {
    position: Math.max(0, Math.trunc(value.position)),
    completed: value.completed,
    updatedAt: Math.max(0, value.updatedAt),
  }
}

export function parseArticleProgress(raw: string | null): ArticleProgressState | null {
  const value = parseJson(raw)
  if (
    typeof value !== 'object' ||
    value === null ||
    !('schemaVersion' in value) ||
    value.schemaVersion !== 1 ||
    !('lastArticleId' in value) ||
    (value.lastArticleId !== null && typeof value.lastArticleId !== 'string') ||
    !('articles' in value) ||
    typeof value.articles !== 'object' ||
    value.articles === null ||
    Array.isArray(value.articles)
  ) {
    return null
  }

  const articles: Record<string, ArticleProgressEntry> = {}
  for (const [articleId, entry] of Object.entries(value.articles)) {
    const parsedEntry = parseProgressEntry(entry)
    if (parsedEntry) articles[articleId] = parsedEntry
  }

  return {
    schemaVersion: 1,
    lastArticleId: value.lastArticleId,
    articles,
  }
}

function parseLegacyPosition(raw: string | null): LegacyArticlePosition | null {
  const value = parseJson(raw)
  if (
    typeof value !== 'object' ||
    value === null ||
    !('articleId' in value) ||
    !('position' in value) ||
    typeof value.articleId !== 'string' ||
    typeof value.position !== 'number' ||
    !Number.isFinite(value.position)
  ) {
    return null
  }

  return { articleId: value.articleId, position: Math.max(0, Math.trunc(value.position)) }
}

export function migrateArticleProgress(
  currentRaw: string | null,
  legacyRaw: string | null,
  timestamp = Date.now(),
): ArticleProgressState {
  const current = parseArticleProgress(currentRaw)
  if (current) return current

  const legacy = parseLegacyPosition(legacyRaw)
  if (!legacy) return createEmptyArticleProgress()

  return {
    schemaVersion: 1,
    lastArticleId: legacy.articleId,
    articles: {
      [legacy.articleId]: {
        position: legacy.position,
        completed: false,
        updatedAt: timestamp,
      },
    },
  }
}

export function loadArticleProgress(
  storage: StorageLike = localStorage,
  timestamp = Date.now(),
): ArticleProgressState {
  const currentRaw = storage.getItem(articleProgressStorageKey)
  const state = migrateArticleProgress(
    currentRaw,
    storage.getItem(legacyArticlePositionStorageKey),
    timestamp,
  )

  if (!parseArticleProgress(currentRaw)) saveArticleProgress(storage, state)
  return state
}

export function saveArticleProgress(storage: StorageLike, state: ArticleProgressState) {
  storage.setItem(articleProgressStorageKey, JSON.stringify(state))
}

function clampPosition(position: number, characterCount: number): number {
  return Math.min(Math.max(0, Math.trunc(position)), Math.max(0, characterCount))
}

export function recordArticlePosition(
  state: ArticleProgressState,
  articleId: string,
  position: number,
  characterCount: number,
  timestamp = Date.now(),
): ArticleProgressState {
  const previous = state.articles[articleId]
  const nextPosition = clampPosition(position, characterCount)
  const completed = previous?.completed === true || nextPosition >= characterCount

  if (
    state.lastArticleId === articleId &&
    previous?.position === nextPosition &&
    previous.completed === completed
  ) {
    return state
  }

  return {
    ...state,
    lastArticleId: articleId,
    articles: {
      ...state.articles,
      [articleId]: { position: nextPosition, completed, updatedAt: timestamp },
    },
  }
}

export function markArticleCompleted(
  state: ArticleProgressState,
  articleId: string,
  characterCount: number,
  timestamp = Date.now(),
): ArticleProgressState {
  return {
    ...state,
    lastArticleId: articleId,
    articles: {
      ...state.articles,
      [articleId]: {
        position: Math.max(0, characterCount),
        completed: true,
        updatedAt: timestamp,
      },
    },
  }
}

export function restartArticleProgress(
  state: ArticleProgressState,
  articleId: string,
  timestamp = Date.now(),
): ArticleProgressState {
  return {
    ...state,
    lastArticleId: articleId,
    articles: {
      ...state.articles,
      [articleId]: {
        position: 0,
        completed: state.articles[articleId]?.completed === true,
        updatedAt: timestamp,
      },
    },
  }
}

export function articleResumePosition(
  state: ArticleProgressState,
  articleId: string,
  characterCount: number,
): number {
  const entry = state.articles[articleId]
  if (!entry || entry.completed) return 0
  return Math.min(entry.position, Math.max(0, characterCount - 1))
}

export function articleProgressPercentage(
  entry: ArticleProgressEntry | undefined,
  characterCount: number,
): number {
  if (!entry || characterCount <= 0) return 0
  if (entry.completed) return 100
  return Math.min(100, Math.max(0, (entry.position / characterCount) * 100))
}
