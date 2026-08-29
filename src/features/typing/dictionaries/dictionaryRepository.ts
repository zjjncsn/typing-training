import type { DictionaryManifest, DictionarySummary, WordDictionary } from './types'

const manifestPath = 'data/dictionaries/manifest.json'
let manifestRequest: Promise<DictionaryManifest> | null = null
const dictionaryRequests = new Map<string, Promise<WordDictionary>>()

function publicUrl(path: string): string {
  const base = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`
  return `${base}${path.replace(/^\//u, '')}`
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(publicUrl(path))
  if (!response.ok) {
    throw new Error(`资源加载失败（HTTP ${response.status}）`)
  }

  return response.json() as Promise<T>
}

export function loadDictionaryManifest(): Promise<DictionaryManifest> {
  if (manifestRequest) return manifestRequest

  manifestRequest = fetchJson<DictionaryManifest>(manifestPath).catch((error: unknown) => {
    manifestRequest = null
    throw error
  })
  return manifestRequest
}

export function loadDictionary(summary: DictionarySummary): Promise<WordDictionary> {
  const cached = dictionaryRequests.get(summary.id)
  if (cached) return cached

  const request = fetchJson<WordDictionary>(`data/dictionaries/${summary.file}`).catch(
    (error: unknown) => {
      dictionaryRequests.delete(summary.id)
      throw error
    },
  )
  dictionaryRequests.set(summary.id, request)
  return request
}
