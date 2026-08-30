<script setup lang="ts">
import { computed } from 'vue'

import TypingInputPanel from './TypingInputPanel.vue'
import TypingPromptCharacter from './TypingPromptCharacter.vue'

interface WordAttempt {
  received: string
  correct: boolean
}

interface WordLine {
  start: number
  words: string[]
}

const props = defineProps<{
  words: readonly string[]
  wordIndex: number
  position: number
  hasCurrentError: boolean
  scale?: 'small' | 'medium' | 'large'
  attemptResults?: Readonly<Record<number, WordAttempt>>
}>()

const characterLimit = computed(() => {
  if (props.scale === 'small') return 66
  if (props.scale === 'large') return 46
  return 56
})

const lines = computed<WordLine[]>(() => {
  const result: WordLine[] = []
  let start = 0
  let words: string[] = []
  let length = 0

  props.words.forEach((word, index) => {
    const nextLength = length + (words.length > 0 ? 1 : 0) + Array.from(word).length
    if (words.length > 0 && nextLength > characterLimit.value) {
      result.push({ start, words })
      start = index
      words = []
      length = 0
    }

    words.push(word)
    length += (words.length > 1 ? 1 : 0) + Array.from(word).length
  })

  if (words.length > 0) result.push({ start, words })
  return result
})

const currentLine = computed(
  () =>
    lines.value.find(
      (line) => props.wordIndex >= line.start && props.wordIndex < line.start + line.words.length,
    ) ?? { start: 0, words: [] },
)

function absoluteWordIndex(offset: number): number {
  return currentLine.value.start + offset
}

function echoCharacter(word: string, wordOffset: number, characterIndex: number) {
  const index = absoluteWordIndex(wordOffset)
  if (index < props.wordIndex) {
    return { received: Array.from(word)[characterIndex] ?? '\u00a0', correct: true }
  }
  if (index > props.wordIndex) return { received: '\u00a0', correct: true }

  const attempt = props.attemptResults?.[characterIndex]
  return {
    received: attempt?.received ?? '\u00a0',
    correct: attempt?.correct ?? true,
  }
}
</script>

<template>
  <div class="word-typing-text" :data-scale="scale ?? 'medium'" aria-label="单词训练文本">
    <TypingInputPanel>
      <template #prompt>
        <div class="word-row">
          <span
            v-for="(word, wordOffset) in currentLine.words"
            :key="absoluteWordIndex(wordOffset)"
            class="word-block prompt-word"
            :class="{
              'current-word': absoluteWordIndex(wordOffset) === wordIndex,
              'awaiting-separator':
                absoluteWordIndex(wordOffset) === wordIndex && position >= Array.from(word).length,
              'separator-error':
                absoluteWordIndex(wordOffset) === wordIndex &&
                position >= Array.from(word).length &&
                hasCurrentError,
            }"
          >
            <TypingPromptCharacter
              v-for="(character, characterIndex) in Array.from(word)"
              :key="characterIndex"
              :character="character"
              :complete="
                absoluteWordIndex(wordOffset) < wordIndex ||
                (absoluteWordIndex(wordOffset) === wordIndex && characterIndex < position)
              "
              :current="absoluteWordIndex(wordOffset) === wordIndex && characterIndex === position"
              :error="
                absoluteWordIndex(wordOffset) === wordIndex &&
                characterIndex === position &&
                hasCurrentError
              "
            />
          </span>
        </div>
      </template>

      <template #echo>
        <div class="word-row" aria-label="输入回显">
          <span
            v-for="(word, wordOffset) in currentLine.words"
            :key="absoluteWordIndex(wordOffset)"
            class="word-block echo-word"
            :class="{
              'awaiting-separator':
                absoluteWordIndex(wordOffset) === wordIndex && position >= Array.from(word).length,
            }"
          >
            <span
              v-for="(_, characterIndex) in Array.from(word)"
              :key="characterIndex"
              class="echo-character"
              :class="{
                incorrect: !echoCharacter(word, wordOffset, characterIndex).correct,
                'caret-before':
                  absoluteWordIndex(wordOffset) === wordIndex && characterIndex === position,
              }"
              >{{ echoCharacter(word, wordOffset, characterIndex).received }}</span
            >
          </span>
        </div>
      </template>
    </TypingInputPanel>
  </div>
</template>

<style scoped>
.word-typing-text {
  --word-font-size: 1.28rem;

  overflow: hidden;
  color: #607083;
  font-family: 'Cascadia Mono', Consolas, monospace;
  font-size: var(--word-font-size);
  line-height: 1.65;
  letter-spacing: 0.035em;
  user-select: none;
  -webkit-user-select: none;
}

.word-typing-text[data-scale='small'] {
  --word-font-size: 1.05rem;
}

.word-typing-text[data-scale='large'] {
  --word-font-size: 1.52rem;
}

.word-row {
  display: flex;
  min-width: max-content;
  gap: 1ch;
  white-space: nowrap;
}

.word-block {
  display: inline-flex;
  flex: 0 0 auto;
}

.prompt-word.current-word {
  color: #21394f;
}

.prompt-word.current-word.separator-error {
  color: #a32c2c;
}

.prompt-word.awaiting-separator {
  position: relative;
}

.prompt-word.awaiting-separator::after {
  position: absolute;
  bottom: -0.12em;
  left: calc(100% + 0.14ch);
  width: 0.72ch;
  height: 3px;
  background: #168e80;
  border-radius: 999px;
  content: '';
}

.prompt-word.awaiting-separator.separator-error::after {
  background: #c0392b;
}

.echo-word {
  position: relative;
  color: #36556c;
}

.echo-word.awaiting-separator::after {
  position: absolute;
  top: 0.3em;
  bottom: 0.3em;
  left: calc(100% + 0.1ch);
  width: 2px;
  background: #0e7267;
  content: '';
  animation: caret-blink 1.1s step-end infinite;
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

.echo-character.caret-before::before {
  position: absolute;
  top: 0.12em;
  bottom: 0.12em;
  left: -1px;
  width: 2px;
  background: #0e7267;
  content: '';
  animation: caret-blink 1.1s step-end infinite;
}

@keyframes caret-blink {
  50% {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .echo-character.caret-before::before,
  .echo-word.awaiting-separator::after {
    animation: none;
  }
}
</style>
