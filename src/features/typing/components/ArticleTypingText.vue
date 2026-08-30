<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { resolveArticleLineIndex, wrapArticleContent } from '../engine/articleLines'
import TypingInputPanel from './TypingInputPanel.vue'
import TypingPromptCharacter from './TypingPromptCharacter.vue'

interface ArticleAttempt {
  received: string
  correct: boolean
}

const props = defineProps<{
  content: string
  position: number
  hasCurrentError: boolean
  scale?: 'small' | 'medium' | 'large'
  attemptResults?: Readonly<Record<number, ArticleAttempt>>
}>()

const root = ref<HTMLElement | null>(null)
const characterMeasure = ref<HTMLElement | null>(null)
const availableWidth = ref(860)
const characterWidth = ref(13)
let resizeObserver: ResizeObserver | null = null

const columnLimit = computed(() =>
  Math.max(24, Math.floor(availableWidth.value / characterWidth.value)),
)
const lines = computed(() => wrapArticleContent(props.content, columnLimit.value))
const currentLineIndex = computed(() => resolveArticleLineIndex(lines.value, props.position))
const currentLine = computed(() => lines.value[currentLineIndex.value])
const previewLines = computed(() =>
  lines.value.slice(currentLineIndex.value + 1, currentLineIndex.value + 5),
)

const currentCharacters = computed(() => {
  const line = currentLine.value
  if (!line) return []
  return Array.from(line.text).map((character, offset) => ({
    character,
    index: line.start + offset,
  }))
})

const newlineIsCurrent = computed(
  () =>
    currentLine.value?.breakKind === 'newline' && props.position === currentLine.value.displayEnd,
)

function echoCharacter(character: string, index: number): ArticleAttempt {
  const attempt = props.attemptResults?.[index]
  if (attempt) return attempt
  if (index < props.position) return { received: character, correct: true }
  return { received: '\u00a0', correct: true }
}

function displayPreview(line: string): string {
  return line || '\u00a0'
}

function measureLayout() {
  if (root.value) availableWidth.value = root.value.clientWidth - 40
  if (characterMeasure.value) {
    const measured = characterMeasure.value.getBoundingClientRect().width
    if (measured > 0) characterWidth.value = measured
  }
}

watch(
  () => props.scale,
  () => void nextTick(measureLayout),
)

onMounted(() => {
  measureLayout()
  if (!root.value) return
  resizeObserver = new ResizeObserver(measureLayout)
  resizeObserver.observe(root.value)
})

onBeforeUnmount(() => resizeObserver?.disconnect())
</script>

<template>
  <div
    ref="root"
    class="article-typing-text"
    :data-scale="scale ?? 'medium'"
    aria-label="文章训练文本"
  >
    <span ref="characterMeasure" class="character-measure" aria-hidden="true">M</span>

    <TypingInputPanel v-if="currentLine" emphasized>
      <template #prompt>
        <TypingPromptCharacter
          v-for="entry in currentCharacters"
          :key="entry.index"
          :character="entry.character"
          :complete="entry.index < position"
          :current="entry.index === position"
          :error="entry.index === position && hasCurrentError"
        />
        <TypingPromptCharacter
          v-if="currentLine.breakKind === 'newline'"
          class="newline-character"
          character="↵"
          :current="newlineIsCurrent"
          :error="newlineIsCurrent && hasCurrentError"
        />
      </template>

      <template #echo>
        <span
          v-for="entry in currentCharacters"
          :key="entry.index"
          class="echo-character"
          :class="{
            incorrect: !echoCharacter(entry.character, entry.index).correct,
            'caret-before': entry.index === position,
          }"
          >{{ echoCharacter(entry.character, entry.index).received }}</span
        >
        <span v-if="newlineIsCurrent" class="echo-newline-caret" aria-hidden="true" />
      </template>
    </TypingInputPanel>

    <section
      v-for="line in previewLines"
      :key="line.start"
      class="preview-line-card"
      aria-hidden="true"
    >
      {{ displayPreview(line.text) }}
    </section>
  </div>
</template>

<style scoped>
.article-typing-text {
  --article-font-size: 1.24rem;

  position: relative;
  display: grid;
  gap: 10px;
  color: #657689;
  font-family: 'Cascadia Mono', Consolas, monospace;
  font-size: var(--article-font-size);
  line-height: 1.65;
  user-select: none;
  -webkit-user-select: none;
}

.article-typing-text[data-scale='small'] {
  --article-font-size: 1.02rem;
}

.article-typing-text[data-scale='large'] {
  --article-font-size: 1.5rem;
}

.character-measure {
  position: absolute;
  visibility: hidden;
  white-space: pre;
}

.preview-line-card {
  overflow: hidden;
  background: #fff;
  border: 1px solid #d8e3eb;
  border-radius: 16px;
  box-shadow: 0 7px 20px rgb(49 78 102 / 6%);
}

.preview-line-card {
  min-height: 2.45em;
  padding: 10px 20px;
  white-space: pre;
}

.preview-line-card {
  display: flex;
  align-items: center;
}

.echo-character {
  position: relative;
  display: inline-block;
  flex: 0 0 auto;
  width: 1ch;
  white-space: pre;
  text-align: center;
}

.newline-character {
  color: #8a99a6;
}

.echo-character.incorrect {
  color: #c0392b;
  text-decoration: underline wavy rgb(192 57 43 / 55%);
}

.echo-character.caret-before::before,
.echo-newline-caret {
  width: 2px;
  background: #0e7267;
  animation: caret-blink 1.1s step-end infinite;
}

.echo-character.caret-before::before {
  position: absolute;
  top: 0.18em;
  bottom: 0.18em;
  left: -1px;
  content: '';
}

.echo-newline-caret {
  align-self: center;
  height: 1.2em;
}

@keyframes caret-blink {
  50% {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .echo-character.caret-before::before,
  .echo-newline-caret {
    animation: none;
  }
}
</style>
