export type ChineseWordCategory = 'general' | 'hsk' | 'professional'

export interface ChineseWordCategorySummary {
  id: ChineseWordCategory
  name: string
}

export interface ChineseWordLessonSummary {
  id: string
  title: string
  category: ChineseWordCategory
  sourceName: string
  file: string
  wordCount: number
  characterCount: number
  byteSize: number
}

export interface ChineseWordManifest {
  schemaVersion: 1
  defaultLessonId: string
  categories: ChineseWordCategorySummary[]
  lessons: ChineseWordLessonSummary[]
}

export interface ChineseWordLesson {
  schemaVersion: 1
  id: string
  title: string
  category: ChineseWordCategory
  sourceName: string
  words: string[]
}
