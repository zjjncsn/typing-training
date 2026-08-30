import type { SyllableLesson, SyllableLessonSummary, SyllableManifest } from './types'

const manifestPath = 'data/chinese/syllables/manifest.json'
let manifestRequest: Promise<SyllableManifest> | null = null
const lessonRequests = new Map<string, Promise<SyllableLesson>>()

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

export function loadSyllableManifest(): Promise<SyllableManifest> {
  if (manifestRequest) return manifestRequest
  manifestRequest = fetchJson<SyllableManifest>(manifestPath).catch((error: unknown) => {
    manifestRequest = null
    throw error
  })
  return manifestRequest
}

export function loadSyllableLesson(summary: SyllableLessonSummary): Promise<SyllableLesson> {
  const cached = lessonRequests.get(summary.id)
  if (cached) return cached

  const request = fetchJson<SyllableLesson>(`data/chinese/syllables/${summary.file}`).catch(
    (error: unknown) => {
      lessonRequests.delete(summary.id)
      throw error
    },
  )
  lessonRequests.set(summary.id, request)
  return request
}
