<script setup lang="ts">
import { computed } from 'vue'

import { resolveLineIndexAt, splitContentLines } from '../engine/lineSegments'

interface LineAttempt {
  received: string
  correct: boolean
}

const props = defineProps<{
  content: string
  position: number
  hasCurrentError: boolean
  scale?: 'small' | 'medium' | 'large'
  attemptResults?: Readonly<Record<number, LineAttempt>>
}>()

const lines = computed(() => splitContentLines(props.content))

const currentLine = computed(() => {
  const contentLines = lines.value
  return (
    contentLines[resolveLineIndexAt(contentLines, props.position)] ?? {
      start: 0,
      end: 0,
      text: '',
    }
  )
})

const promptCharacters = computed(() =>
  Array.from(currentLine.value.text).map((character, offset) => ({
    character,
    index: currentLine.value.start + offset,
  })),
)

const newlineIsCurrent = computed(() => props.position >= currentLine.value.end)

const echoCharacters = computed(() =>
  promptCharacters.value.map((entry) => {
    const attempt = props.attemptResults?.[entry.index]
    return {
      index: entry.index,
      received: attempt?.received ?? ' ',
      correct: attempt?.correct ?? true,
    }
  }),
)

function displayEchoCharacter(character: string): string {
  return character === '\n' ? '↵' : character
}
</script>

<template>
  <div class="line-typing-text" :data-scale="scale ?? 'medium'" aria-label="训练文本">
    <p class="text-row">
      <span
        v-for="entry in promptCharacters"
        :key="entry.index"
        class="prompt-char"
        :class="{
          done: entry.index < position,
          current: entry.index === position,
          error: entry.index === position && hasCurrentError,
        }"
      >{{ entry.character }}</span>
      <span
        class="prompt-char newline-cell"
        :class="{ current: newlineIsCurrent, error: newlineIsCurrent && hasCurrentError }"
      > </span>
    </p>

    <p class="text-row input-echo" aria-label="输入回显">
      <template v-for="entry in echoCharacters" :key="entry.index">
        <span v-if="entry.index === position" class="input-caret" aria-hidden="true" />
        <span
          class="echo-char"
          :class="{ incorrect: !entry.correct }"
        >{{ displayEchoCharacter(entry.received) }}</span>
      </template>
      <span v-if="newlineIsCurrent" class="input-caret" aria-hidden="true" />
    </p>
  </div>
</template>

<style scoped>
.line-typing-text {
  --line-font-size: 1.3rem;

  padding: 16px 24px 18px;
  color: #64748b;
  background: #fff;
  border: 1px solid #d8e3eb;
  border-radius: 18px;
  box-shadow: 0 12px 35px rgb(49 78 102 / 8%);
  font-family: "Cascadia Mono", Consolas, monospace;
}

.line-typing-text[data-scale='small'] {
  --line-font-size: 1.05rem;
}

.line-typing-text[data-scale='large'] {
  --line-font-size: 1.55rem;
}

.text-row {
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  margin: 0;
  font-size: var(--line-font-size);
  line-height: 2;
  letter-spacing: 0.08em;
}

.prompt-char,
.echo-char {
  white-space: pre;
  text-align: center;
}

.prompt-char.done {
  color: #60758e;
}

.prompt-char.current {
  color: #17293e;
  border-bottom: 3px solid #17293e;
}

.prompt-char.newline-cell {
  min-width: 1ch;
}

.prompt-char.current.error {
  color: #a32c2c;
  border-bottom-color: #c0392b;
  animation: shake 100ms ease-out;
}

.input-echo {
  min-height: calc(var(--line-font-size) * 2);
  margin-top: 12px;
  padding-top: 12px;
  color: #26384d;
  border-top: 1px dashed #dbe5ec;
}

.echo-char.incorrect {
  color: #c0392b;
  text-decoration: underline wavy rgb(192 57 43 / 55%);
}

.input-caret {
  align-self: center;
  width: 2px;
  height: 1.2em;
  background: #0e7267;
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
  .prompt-char.current.error {
    animation: none;
  }

  .input-caret {
    animation: none;
  }
}
</style>
