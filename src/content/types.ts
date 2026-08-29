export type LessonLanguage = 'en' | 'zh-CN'

export type LessonInputMode = 'physical-keyboard' | 'text-input'

export interface Lesson {
  id: string
  order: number
  title: string
  content: string
  source: string
}

export interface LessonCourse {
  schemaVersion: 1
  id: string
  title: string
  language: LessonLanguage
  inputMode: LessonInputMode
  layout: string
  lessons: Lesson[]
}
