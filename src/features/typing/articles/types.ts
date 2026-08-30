export type ArticleCategory = 'adage' | 'essay' | 'joke' | 'novel' | 'other' | 'poesy' | 'program'

export interface ArticleCategorySummary {
  id: ArticleCategory
  name: string
}

export interface ArticleSummary {
  id: string
  title: string
  category: ArticleCategory
  sourceName: string
  excerpt: string
  file: string
  characterCount: number
  byteSize: number
}

export interface ArticleManifest {
  schemaVersion: 1
  defaultArticleId: string
  categories: ArticleCategorySummary[]
  articles: ArticleSummary[]
}

export interface TrainingArticle {
  schemaVersion: 1
  id: string
  title: string
  category: ArticleCategory
  sourceName: string
  content: string
}
