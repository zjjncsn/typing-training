export type DictionaryCategory = 'dictionary' | 'general' | 'professional'

export type DictionaryExplanationKind =
  'part-of-speech' | 'definition' | 'sense' | 'example' | 'translation' | 'text'

export interface DictionaryExplanationLine {
  kind: DictionaryExplanationKind
  text: string
}

export interface DictionaryEntry {
  word: string
  phonetic?: string
  explanation?: DictionaryExplanationLine[]
}

export interface DictionarySummary {
  id: string
  name: string
  category: DictionaryCategory
  entryCount: number
  file: string
  byteSize: number
}

export interface DictionaryManifest {
  schemaVersion: 1
  defaultDictionaryId: string
  dictionaries: DictionarySummary[]
}

export interface WordDictionary {
  schemaVersion: 1
  id: string
  name: string
  category: DictionaryCategory
  entries: DictionaryEntry[]
}
