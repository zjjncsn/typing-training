export type ChineseArticleCategory = 'adage' | 'essay' | 'poetry' | 'novel' | 'joke' | 'other'

export interface ChineseArticleCategorySummary {
  id: ChineseArticleCategory
  name: string
}

export interface ChineseArticleSummary {
  id: string
  title: string
  category: ChineseArticleCategory
  sourceName: string
  excerpt: string
  file: string
  characterCount: number
  byteSize: number
}

export interface ChineseArticleManifest {
  schemaVersion: 1
  defaultArticleId: string
  categories: ChineseArticleCategorySummary[]
  articles: ChineseArticleSummary[]
}

export interface ChineseTrainingArticle {
  schemaVersion: 1
  id: string
  title: string
  category: ChineseArticleCategory
  sourceName: string
  content: string
}
