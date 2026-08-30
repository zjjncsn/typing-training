export type SyllableCategory = 'liaison' | 'regional' | 'hsk'

export interface SyllableCategorySummary {
  id: SyllableCategory
  name: string
}

export interface SyllableEntry {
  displayPinyin: string
  characters: string
  input: string
}

export interface SyllableLessonSummary {
  id: string
  title: string
  category: SyllableCategory
  sourceName: string
  file: string
  entryCount: number
  characterCount: number
  byteSize: number
}

export interface SyllableManifest {
  schemaVersion: 1
  defaultLessonId: string
  categories: SyllableCategorySummary[]
  lessons: SyllableLessonSummary[]
}

export interface SyllableLesson {
  schemaVersion: 1
  id: string
  title: string
  category: SyllableCategory
  sourceName: string
  entries: SyllableEntry[]
}
