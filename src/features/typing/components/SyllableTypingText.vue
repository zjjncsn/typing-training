<script setup lang="ts">
import { computed } from 'vue'

import type { SyllableEntry } from '../syllables/types'
import TypingInputPanel from './TypingInputPanel.vue'

interface CharacterAttempt {
  received: string
  correct: boolean
}

interface EntryLine {
  start: number
  entries: SyllableEntry[]
}

const props = defineProps<{
  entries: readonly SyllableEntry[]
  entryIndex: number
  position: number
  hasCurrentError: boolean
  scale?: 'small' | 'medium' | 'large'
  attemptResults?: Readonly<Record<number, CharacterAttempt>>
}>()

const characterLimit = computed(() => {
  if (props.scale === 'small') return 64
  if (props.scale === 'large') return 44
  return 54
})

const lines = computed<EntryLine[]>(() => {
  const result: EntryLine[] = []
  let start = 0
  let entries: SyllableEntry[] = []
  let length = 0

  props.entries.forEach((entry, index) => {
    const entryLength = Math.max(
      Array.from(entry.displayPinyin).length,
      Array.from(entry.characters).length * 2,
    )
    const nextLength = length + (entries.length > 0 ? 4 : 0) + entryLength
    if (entries.length > 0 && nextLength > characterLimit.value) {
      result.push({ start, entries })
      start = index
      entries = []
      length = 0
    }

    entries.push(entry)
    length += (entries.length > 1 ? 4 : 0) + entryLength
  })

  if (entries.length > 0) result.push({ start, entries })
  return result
})

const currentLine = computed(
  () =>
    lines.value.find(
      (line) => props.entryIndex >= line.start && props.entryIndex < line.start + line.entries.length,
    ) ?? { start: 0, entries: [] },
)

function absoluteEntryIndex(offset: number): number {
  return currentLine.value.start + offset
}

function entryColumnStyle(entry: SyllableEntry) {
  const width = Math.max(
    Array.from(entry.displayPinyin).length,
    Array.from(entry.characters).length * 2,
    Array.from(entry.input).length,
  )
  return { width: `${width}ch` }
}

function displayInputIndex(displayPinyin: string, displayIndex: number): number | null {
  return displayIndex < Array.from(displayPinyin).length ? displayIndex : null
}

function promptCharacterState(entry: SyllableEntry, entryOffset: number, displayIndex: number) {
  const index = absoluteEntryIndex(entryOffset)
  const inputIndex = displayInputIndex(entry.displayPinyin, displayIndex)
  const current = index === props.entryIndex && inputIndex === props.position

  return {
    complete: index < props.entryIndex || (index === props.entryIndex && (inputIndex ?? Infinity) < props.position),
    current,
    error: current && props.hasCurrentError,
  }
}

function echoCharacter(entry: SyllableEntry, entryOffset: number, characterIndex: number) {
  const index = absoluteEntryIndex(entryOffset)
  if (index < props.entryIndex) {
    return { received: Array.from(entry.input)[characterIndex] ?? '\u00a0', correct: true }
  }
  if (index > props.entryIndex) return { received: '\u00a0', correct: true }

  const attempt = props.attemptResults?.[characterIndex]
  return {
    received: attempt?.received ?? '\u00a0',
    correct: attempt?.correct ?? true,
  }
}
</script>

<template>
  <div class="syllable-typing-text" :data-scale="scale ?? 'medium'">
    <TypingInputPanel emphasized>
      <template #prompt>
        <div class="syllable-strip" aria-label="拼音提示">
          <div
            v-for="(entry, entryOffset) in currentLine.entries"
            :key="absoluteEntryIndex(entryOffset)"
            class="syllable-block"
            :class="{
              current: absoluteEntryIndex(entryOffset) === entryIndex,
              'awaiting-separator':
                absoluteEntryIndex(entryOffset) === entryIndex &&
                position >= Array.from(entry.input).length,
              'separator-error':
                absoluteEntryIndex(entryOffset) === entryIndex &&
                position >= Array.from(entry.input).length &&
                hasCurrentError,
            }"
            :style="entryColumnStyle(entry)"
          >
            <strong>{{ entry.characters }}</strong>
            <span class="display-pinyin">
              <span
                v-for="(character, displayIndex) in Array.from(entry.displayPinyin)"
                :key="displayIndex"
                class="prompt-character"
                :class="promptCharacterState(entry, entryOffset, displayIndex)"
                >{{ character }}</span
              >
            </span>
          </div>
        </div>
      </template>

      <template #echo>
        <div class="syllable-strip echo-input" aria-label="输入回显">
          <span
            v-for="(entry, entryOffset) in currentLine.entries"
            :key="absoluteEntryIndex(entryOffset)"
            class="echo-block"
            :style="entryColumnStyle(entry)"
          >
            <span
              v-for="(_, characterIndex) in Array.from(entry.input)"
              :key="characterIndex"
              class="echo-character"
              :class="{
                incorrect: !echoCharacter(entry, entryOffset, characterIndex).correct,
                'caret-before':
                  absoluteEntryIndex(entryOffset) === entryIndex && characterIndex === position,
              }"
              >{{ echoCharacter(entry, entryOffset, characterIndex).received }}</span
            >
            <span
              v-if="
                absoluteEntryIndex(entryOffset) === entryIndex &&
                position >= Array.from(entry.input).length
              "
              class="end-caret"
            />
          </span>
        </div>
      </template>
    </TypingInputPanel>
  </div>
</template>

<style scoped>
.syllable-typing-text {
  --syllable-font-size: 1.15rem;

  color: #5b6d7e;
  font-size: var(--syllable-font-size);
  user-select: none;
  -webkit-user-select: none;
}

.syllable-typing-text[data-scale='small'] {
  --syllable-font-size: 0.98rem;
}

.syllable-typing-text[data-scale='large'] {
  --syllable-font-size: 1.36rem;
}

.syllable-strip {
  display: flex;
  align-items: flex-start;
  min-width: max-content;
  gap: 4ch;
  font-family: 'Cascadia Mono', Consolas, monospace;
  white-space: nowrap;
}

.syllable-block {
  display: grid;
  flex: 0 0 auto;
  gap: 1px;
  opacity: 0.62;
}

.syllable-block.current {
  color: #203b52;
  opacity: 1;
}

.syllable-block strong {
  color: #435b70;
  font-family: 'Microsoft YaHei', sans-serif;
  font-size: 1.06em;
  font-weight: 500;
  letter-spacing: 0.12em;
}

.display-pinyin,
.echo-input {
  font-family: 'Cascadia Mono', Consolas, monospace;
  letter-spacing: 0.035em;
}

.prompt-character {
  position: relative;
  display: inline-block;
}

.prompt-character.complete {
  color: #7c96a6;
}

.prompt-character.current::after {
  position: absolute;
  right: 0.04em;
  bottom: -0.19em;
  left: 0.04em;
  height: 3px;
  background: #168e80;
  border-radius: 999px;
  content: '';
}

.prompt-character.current.error {
  color: #b23b31;
}

.prompt-character.current.error::after {
  background: #c0392b;
}

.display-pinyin {
  position: relative;
}

.syllable-block.awaiting-separator .display-pinyin::after {
  position: absolute;
  bottom: -0.19em;
  left: calc(100% + 0.12ch);
  width: 0.72ch;
  height: 3px;
  background: #168e80;
  border-radius: 999px;
  content: '';
}

.syllable-block.awaiting-separator.separator-error .display-pinyin::after {
  background: #c0392b;
}

.echo-input {
  min-height: 1.7em;
  color: #304f66;
  font-size: 1em;
}

.echo-block {
  position: relative;
  display: flex;
  flex: 0 0 auto;
}

.echo-character {
  position: relative;
  display: inline-block;
  width: 1ch;
  white-space: pre;
  text-align: center;
}

.echo-character.incorrect {
  color: #c0392b;
  text-decoration: underline wavy rgb(192 57 43 / 55%);
}

.echo-character.caret-before::before,
.end-caret::before {
  position: absolute;
  top: 0.15em;
  bottom: 0.15em;
  left: -1px;
  width: 2px;
  background: #0e7267;
  content: '';
  animation: caret-blink 1.1s step-end infinite;
}

.end-caret {
  position: relative;
}

@keyframes caret-blink {
  50% {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .echo-character.caret-before::before,
  .end-caret::before {
    animation: none;
  }
}
</style>
