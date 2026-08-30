<script setup lang="ts">
import { computed } from 'vue'

import { resolveLineIndexAt, splitContentLines } from '../engine/lineSegments'
import TypingInputPanel from './TypingInputPanel.vue'
import TypingPromptCharacter from './TypingPromptCharacter.vue'

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
    <TypingInputPanel wrap>
      <template #prompt>
        <TypingPromptCharacter
          v-for="entry in promptCharacters"
          :key="entry.index"
          :character="entry.character"
          :complete="entry.index < position"
          :current="entry.index === position"
          :error="entry.index === position && hasCurrentError"
        />
        <TypingPromptCharacter
          class="newline-cell"
          character=" "
          :current="newlineIsCurrent"
          :error="newlineIsCurrent && hasCurrentError"
        />
      </template>

      <template #echo>
        <template v-for="entry in echoCharacters" :key="entry.index">
          <span
            class="echo-char"
            :class="{ incorrect: !entry.correct, 'caret-before': entry.index === position }"
            >{{ displayEchoCharacter(entry.received) }}</span
          >
        </template>
        <span v-if="newlineIsCurrent" class="input-caret" aria-hidden="true" />
      </template>
    </TypingInputPanel>
  </div>
</template>

<style scoped>
.line-typing-text {
  --line-font-size: 1.3rem;

  color: #64748b;
  font-family: 'Cascadia Mono', Consolas, monospace;
  font-size: var(--line-font-size);
  line-height: 1.65;
  letter-spacing: 0.035em;
  user-select: none;
  -webkit-user-select: none;
}

.line-typing-text[data-scale='small'] {
  --line-font-size: 1.05rem;
}

.line-typing-text[data-scale='large'] {
  --line-font-size: 1.55rem;
}

.echo-char {
  position: relative;
  display: inline-block;
  width: 1ch;
  white-space: pre;
  text-align: center;
}

.newline-cell {
  min-width: 1ch;
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

.echo-char.caret-before::before {
  position: absolute;
  top: 0.18em;
  bottom: 0.18em;
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
  .echo-char.caret-before::before,
  .input-caret {
    animation: none;
  }
}
</style>
