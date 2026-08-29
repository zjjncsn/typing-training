<script setup lang="ts">
import { computed } from 'vue'

interface WordAttempt {
  received: string
  correct: boolean
}

const props = defineProps<{
  word: string
  position: number
  hasCurrentError: boolean
  scale?: 'small' | 'medium' | 'large'
  attemptResults?: Readonly<Record<number, WordAttempt>>
}>()

const characters = computed(() => Array.from(props.word))
const echoCharacters = computed(() =>
  characters.value.map((character, index) => {
    const attempt = props.attemptResults?.[index]
    return {
      expected: character,
      received: attempt?.received ?? '\u00a0',
      correct: attempt?.correct ?? true,
    }
  }),
)
</script>

<template>
  <div class="word-typing-text" :data-scale="scale ?? 'medium'" aria-label="单词训练文本">
    <p class="word-row prompt-row">
      <span
        v-for="(character, index) in characters"
        :key="`prompt-${index}`"
        class="word-character"
        :class="{
          complete: index < position,
          current: index === position,
          error: index === position && hasCurrentError,
        }"
        >{{ character }}</span
      >
    </p>

    <p class="word-row echo-row" aria-label="输入回显">
      <template v-for="(entry, index) in echoCharacters" :key="`echo-${index}`">
        <span v-if="index === position" class="input-caret" aria-hidden="true" />
        <span class="echo-character" :class="{ incorrect: !entry.correct }">
          {{ entry.received }}
        </span>
      </template>
    </p>
  </div>
</template>

<style scoped>
.word-typing-text {
  --word-font-size: 2rem;

  padding: 18px 28px 20px;
  background: #fff;
  border: 1px solid #d8e3eb;
  border-radius: 18px;
  box-shadow: 0 12px 35px rgb(49 78 102 / 8%);
  font-family: 'Cascadia Mono', Consolas, monospace;
}

.word-typing-text[data-scale='small'] {
  --word-font-size: 1.65rem;
}

.word-typing-text[data-scale='large'] {
  --word-font-size: 2.4rem;
}

.word-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  min-height: calc(var(--word-font-size) * 1.55);
  margin: 0;
  color: #26384d;
  font-size: var(--word-font-size);
  line-height: 1.55;
  letter-spacing: 0.08em;
}

.word-character,
.echo-character {
  min-width: 0.72em;
  white-space: pre;
  text-align: center;
}

.word-character.complete {
  color: #8293a5;
}

.word-character.current {
  color: #17324a;
  border-bottom: 3px solid #17324a;
}

.word-character.current.error {
  color: #a32c2c;
  border-bottom-color: #c0392b;
  animation: shake 100ms ease-out;
}

.echo-row {
  margin-top: 10px;
  padding-top: 10px;
  color: #168e80;
  border-top: 1px dashed #dbe5ec;
}

.echo-character.incorrect {
  color: #c0392b;
  text-decoration: underline wavy rgb(192 57 43 / 55%);
}

.input-caret {
  align-self: center;
  width: 2px;
  height: 1.15em;
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
  .word-character.current.error,
  .input-caret {
    animation: none;
  }
}
</style>
