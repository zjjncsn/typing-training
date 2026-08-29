import englishKeyStandardData from './lessons/english-key-standard.json'
import englishNumpadData from './lessons/english-numpad.json'
import type { LessonCourse } from './types'

export const englishKeyStandardCourse = englishKeyStandardData as LessonCourse
export const englishNumpadCourse = englishNumpadData as LessonCourse

export const courses: LessonCourse[] = [englishKeyStandardCourse, englishNumpadCourse]
