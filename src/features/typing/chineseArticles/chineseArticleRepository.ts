import type {
  ChineseArticleManifest,
  ChineseArticleSummary,
  ChineseTrainingArticle,
} from './types'

const manifestPath = 'data/chinese/articles/manifest.json'
let manifestRequest: Promise<ChineseArticleManifest> | null = null
const articleRequests = new Map<string, Promise<ChineseTrainingArticle>>()

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

export function loadChineseArticleManifest(): Promise<ChineseArticleManifest> {
  if (manifestRequest) return manifestRequest

  manifestRequest = fetchJson<ChineseArticleManifest>(manifestPath).catch((error: unknown) => {
    manifestRequest = null
    throw error
  })
  return manifestRequest
}

export function loadChineseArticle(
  summary: ChineseArticleSummary,
): Promise<ChineseTrainingArticle> {
  const cached = articleRequests.get(summary.id)
  if (cached) return cached

  const request = fetchJson<ChineseTrainingArticle>(
    `data/chinese/articles/${summary.file}`,
  ).catch((error: unknown) => {
    articleRequests.delete(summary.id)
    throw error
  })
  articleRequests.set(summary.id, request)
  return request
}
