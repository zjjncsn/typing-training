import type {
  ChineseWordLesson,
  ChineseWordLessonSummary,
  ChineseWordManifest,
} from './types'

const manifestPath = 'data/chinese/words/manifest.json'
let manifestRequest: Promise<ChineseWordManifest> | null = null
const lessonRequests = new Map<string, Promise<ChineseWordLesson>>()

function publicUrl(path: string): string {
  const base = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`
  return `${base}${path.replace(/^\//u, '')}`
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(publicUrl(path))
  if (!response.ok) throw new Error(`资源加载失败（HTTP ${response.status}）`)
  return response.json() as Promise<T>
}

export function loadChineseWordManifest(): Promise<ChineseWordManifest> {
  if (manifestRequest) return manifestRequest
  manifestRequest = fetchJson<ChineseWordManifest>(manifestPath).catch((error: unknown) => {
    manifestRequest = null
    throw error
  })
  return manifestRequest
}

export function loadChineseWordLesson(
  summary: ChineseWordLessonSummary,
): Promise<ChineseWordLesson> {
  const cached = lessonRequests.get(summary.id)
  if (cached) return cached

  const request = fetchJson<ChineseWordLesson>(`data/chinese/words/${summary.file}`).catch(
    (error: unknown) => {
      lessonRequests.delete(summary.id)
      throw error
    },
  )
  lessonRequests.set(summary.id, request)
  return request
}
