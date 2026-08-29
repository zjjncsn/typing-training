import englishKeyStandardData from './lessons/english-key-standard.json'
import type { LessonCourse } from './types'

export const englishKeyStandardCourse = englishKeyStandardData as LessonCourse

export const courses: LessonCourse[] = [englishKeyStandardCourse]
