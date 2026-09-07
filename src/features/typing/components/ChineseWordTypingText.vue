<script setup lang="ts">
import { computed } from 'vue'

import TypingInputPanel from './TypingInputPanel.vue'
import TypingPromptCharacter from './TypingPromptCharacter.vue'

interface CharacterAttempt {
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
  attemptResults?: Readonly<Record<number, CharacterAttempt>>
}>()

const characterLimit = computed(() => {
  if (props.scale === 'small') return 34
  if (props.scale === 'large') return 23
  return 28
})

const lines = computed<WordLine[]>(() => {
  const result: WordLine[] = []
  let start = 0
  let words: string[] = []
  let length = 0

  props.words.forEach((word, index) => {
    const wordLength = Array.from(word).length
    const nextLength = length + (words.length > 0 ? 1.2 : 0) + wordLength
    if (words.length > 0 && nextLength > characterLimit.value) {
      result.push({ start, words })
      start = index
      words = []
      length = 0
    }

    words.push(word)
    length += (words.length > 1 ? 1.2 : 0) + wordLength
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

function wordStyle(word: string) {
  return { width: `${Array.from(word).length}em` }
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
  <div class="chinese-word-text" :data-scale="scale ?? 'medium'">
    <TypingInputPanel emphasized>
      <template #prompt>
        <div class="word-strip" aria-label="中文词汇提示">
          <span
            v-for="(word, wordOffset) in currentLine.words"
            :key="absoluteWordIndex(wordOffset)"
            class="word-block prompt-word"
            :class="{ current: absoluteWordIndex(wordOffset) === wordIndex }"
            :style="wordStyle(word)"
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
        <div class="word-strip echo-strip" aria-label="输入回显">
          <span
            v-for="(word, wordOffset) in currentLine.words"
            :key="absoluteWordIndex(wordOffset)"
            class="word-block echo-word"
            :style="wordStyle(word)"
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
            >
              <slot
                v-if="
                  absoluteWordIndex(wordOffset) === wordIndex && characterIndex === position
                "
                name="ime-anchor"
              />
              {{ echoCharacter(word, wordOffset, characterIndex).received }}
            </span>
          </span>
        </div>
      </template>
    </TypingInputPanel>
  </div>
</template>

<style scoped>
.chinese-word-text {
  --word-font-size: 1.42rem;

  color: #607083;
  font-family: 'Microsoft YaHei', sans-serif;
  font-size: var(--word-font-size);
  line-height: 1.65;
  user-select: none;
  -webkit-user-select: none;
}

.chinese-word-text[data-scale='small'] {
  --word-font-size: 1.18rem;
}

.chinese-word-text[data-scale='large'] {
  --word-font-size: 1.68rem;
}

.word-strip {
  display: flex;
  min-width: max-content;
  gap: 1.2em;
  white-space: nowrap;
}

.word-block {
  display: inline-flex;
  flex: 0 0 auto;
}

.prompt-word :deep(.typing-prompt-character) {
  width: 1em;
}

.prompt-word {
  opacity: 0.66;
}

.prompt-word.current {
  color: #203b52;
  opacity: 1;
}

.echo-strip {
  color: #304f66;
}

.echo-character {
  position: relative;
  display: inline-block;
  width: 1em;
  white-space: pre;
  text-align: center;
}

.echo-character.incorrect {
  color: #c0392b;
  text-decoration: underline wavy rgb(192 57 43 / 55%);
}

.echo-character.caret-before::before {
  position: absolute;
  top: 0.15em;
  bottom: 0.15em;
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
  .echo-character.caret-before::before {
    animation: none;
  }
}
</style>
