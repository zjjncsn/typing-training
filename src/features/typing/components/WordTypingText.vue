<script setup lang="ts">
import { computed } from 'vue'

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
    <div class="word-stream">
      <span
        v-for="(word, wordOffset) in currentLine.words"
        :key="absoluteWordIndex(wordOffset)"
        class="word-column"
      >
        <span
          class="word-block prompt-word"
          :class="{
            'completed-word': absoluteWordIndex(wordOffset) < wordIndex,
            'current-word': absoluteWordIndex(wordOffset) === wordIndex,
            'separator-error':
              absoluteWordIndex(wordOffset) === wordIndex &&
              position >= Array.from(word).length &&
              hasCurrentError,
          }"
        >
          <span
            v-for="(character, characterIndex) in Array.from(word)"
            :key="characterIndex"
            class="word-character"
            :class="{
              complete:
                absoluteWordIndex(wordOffset) < wordIndex ||
                (absoluteWordIndex(wordOffset) === wordIndex && characterIndex < position),
              current: absoluteWordIndex(wordOffset) === wordIndex && characterIndex === position,
              error:
                absoluteWordIndex(wordOffset) === wordIndex &&
                characterIndex === position &&
                hasCurrentError,
            }"
            >{{ character }}</span
          >
        </span>

        <span
          class="word-block echo-word"
          :class="{
            'awaiting-separator':
              absoluteWordIndex(wordOffset) === wordIndex && position >= Array.from(word).length,
          }"
          aria-label="输入回显"
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
      </span>
    </div>
  </div>
</template>

<style scoped>
.word-typing-text {
  --word-font-size: 1.28rem;

  padding: 14px 20px 16px;
  overflow: hidden;
  background: #fff;
  border: 1px solid #d8e3eb;
  border-radius: 18px;
  box-shadow: 0 12px 35px rgb(49 78 102 / 8%);
  font-family: 'Cascadia Mono', Consolas, monospace;
  user-select: none;
  -webkit-user-select: none;
}

.word-typing-text[data-scale='small'] {
  --word-font-size: 1.05rem;
}

.word-typing-text[data-scale='large'] {
  --word-font-size: 1.52rem;
}

.word-stream {
  position: relative;
  display: flex;
  gap: 1ch;
  align-items: stretch;
  overflow: hidden;
  color: #607083;
  font-size: var(--word-font-size);
  line-height: 1.55;
  letter-spacing: 0.035em;
  white-space: nowrap;
}

.word-stream::after {
  position: absolute;
  top: 50%;
  right: 0;
  left: 0;
  border-top: 1px solid #e0e8ed;
  content: '';
}

.word-column {
  z-index: 1;
  display: grid;
  flex: 0 0 auto;
  grid-template-rows: repeat(2, minmax(calc(var(--word-font-size) * 1.8), auto));
  align-items: center;
}

.word-block {
  display: inline-flex;
  flex: 0 0 auto;
}

.prompt-word,
.echo-word {
  align-self: stretch;
  align-items: center;
}

.prompt-word.current-word {
  color: #21394f;
  border-bottom: 2px solid #263d52;
}

.prompt-word.current-word.separator-error {
  color: #a32c2c;
  border-bottom-color: #c0392b;
}

.prompt-word.completed-word,
.word-character.complete {
  color: #7c8ea0;
}

.word-character.current.error {
  color: #c0392b;
  background: #ffebe8;
  animation: shake 100ms ease-out;
}

.echo-word {
  position: relative;
  color: #36556c;
}

.echo-word.awaiting-separator::after {
  position: absolute;
  top: 0.38em;
  bottom: 0.38em;
  left: 100%;
  width: 2px;
  background: #0e7267;
  content: '';
  animation: caret-blink 1.1s step-end infinite;
}

.word-character,
.echo-character {
  position: relative;
  display: inline-block;
  width: 0.64em;
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

@keyframes shake {
  25% {
    transform: translateX(-2px);
  }
  75% {
    transform: translateX(2px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .word-character.current.error,
  .echo-character.caret-before::before,
  .echo-word.awaiting-separator::after {
    animation: none;
  }
}
</style>
