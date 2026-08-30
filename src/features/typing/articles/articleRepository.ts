import type { ArticleManifest, ArticleSummary, TrainingArticle } from './types'

const manifestPath = 'data/articles/manifest.json'
let manifestRequest: Promise<ArticleManifest> | null = null
const articleRequests = new Map<string, Promise<TrainingArticle>>()

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

export function loadArticleManifest(): Promise<ArticleManifest> {
  if (manifestRequest) return manifestRequest

  manifestRequest = fetchJson<ArticleManifest>(manifestPath).catch((error: unknown) => {
    manifestRequest = null
    throw error
  })
  return manifestRequest
}

export function loadArticle(summary: ArticleSummary): Promise<TrainingArticle> {
  const cached = articleRequests.get(summary.id)
  if (cached) return cached

  const request = fetchJson<TrainingArticle>(`data/articles/${summary.file}`).catch(
    (error: unknown) => {
      articleRequests.delete(summary.id)
      throw error
    },
  )
  articleRequests.set(summary.id, request)
  return request
}
