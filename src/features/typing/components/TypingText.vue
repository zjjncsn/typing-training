<script setup lang="ts">
import { computed } from 'vue'

import { formatTrainingCharacter } from '../keyboard/qwertyLayout'

const props = defineProps<{
  content: string
  position: number
  hasCurrentError: boolean
  scale?: 'small' | 'medium' | 'large'
}>()

const contentCharacters = computed(() => Array.from(props.content))

const visibleSegment = computed(() => {
  const characters = contentCharacters.value
  const safePosition = Math.min(props.position, characters.length)
  const segments: Array<{ start: number; end: number }> = []

  let cursor = 0
  while (cursor < characters.length) {
    while (cursor < characters.length && /\s/u.test(characters[cursor]!)) cursor++
    if (cursor >= characters.length) break

    const start = cursor
    while (cursor < characters.length && !/\s/u.test(characters[cursor]!)) cursor++
    segments.push({ start, end: cursor })
  }

  const matchingSegmentIndex = segments.findIndex(
    ({ start, end }) => safePosition >= start && safePosition < end,
  )
  const segmentIndex =
    matchingSegmentIndex >= 0 ? matchingSegmentIndex : Math.max(0, segments.length - 1)
  const segment = segments[segmentIndex] ?? segments.at(-1) ?? { start: 0, end: 0 }

  return {
    characters: characters.slice(segment.start, segment.end),
    start: segment.start,
    number: segmentIndex + 1,
    count: segments.length,
  }
})
</script>

<template>
  <div class="typing-text" :data-scale="scale ?? 'medium'" aria-label="训练文本">
    <div class="segment-meta">
      第 {{ visibleSegment.number }} / {{ visibleSegment.count }} 组
    </div>
    <div class="segment-content">
      <span
        v-for="(character, index) in visibleSegment.characters"
        :key="visibleSegment.start + index"
        class="training-keycap"
        :class="{
          complete: visibleSegment.start + index < position,
          current: visibleSegment.start + index === position,
          error: visibleSegment.start + index === position && hasCurrentError,
        }"
      >{{ formatTrainingCharacter(character) }}</span>
    </div>
  </div>
</template>

<style scoped>
.typing-text {
  --training-key-size: 58px;

  min-height: 142px;
  padding: 18px 28px 28px;
  color: #64748b;
  background: #fff;
  border: 1px solid #d8e3eb;
  border-radius: 18px;
  box-shadow: 0 12px 35px rgb(49 78 102 / 8%);
  font-family: "Cascadia Mono", Consolas, monospace;
}

.segment-meta {
  margin-bottom: 13px;
  color: #91a1af;
  font-family:
    Inter, "Microsoft YaHei", system-ui, sans-serif;
  font-size: 0.7rem;
  line-height: 1.4;
}

.segment-content {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  justify-content: center;
  min-height: 58px;
}

.typing-text[data-scale='small'] {
  --training-key-size: 48px;
}

.typing-text[data-scale='large'] {
  --training-key-size: 68px;
}

.training-keycap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--training-key-size);
  height: var(--training-key-size);
  color: #26364d;
  background: linear-gradient(180deg, #eaf3ff, #bdd6f3);
  border: 1px solid #78a2d0;
  border-bottom-width: 4px;
  border-radius: 8px;
  box-shadow:
    inset 0 2px 0 rgb(255 255 255 / 78%),
    inset 0 -5px 12px rgb(70 115 178 / 10%),
    0 3px 6px rgb(51 78 112 / 15%);
  font-size: calc(var(--training-key-size) * 0.48);
  font-weight: 600;
  line-height: 1;
}

.current {
  color: #174c28;
  background: linear-gradient(180deg, #e9ffe6, #9be69b);
  border-color: #3f9f54;
  box-shadow:
    inset 0 2px 0 rgb(255 255 255 / 82%),
    inset 0 -5px 12px rgb(48 142 68 / 12%),
    0 0 0 3px rgb(63 159 84 / 16%);
}

.complete {
  color: #60758e;
  background: linear-gradient(180deg, #edf3fa, #d4e0ed);
  border-color: #a4b8ce;
}

.current.error {
  color: #7a2020;
  background: linear-gradient(180deg, #ffe9e6, #f3a49e);
  border-color: #cb4c47;
  box-shadow:
    inset 0 2px 0 rgb(255 255 255 / 78%),
    0 0 0 3px rgb(203 76 71 / 18%);
  animation: shake 100ms ease-out;
}

@keyframes shake {
  25% {
    transform: translateX(-2px);
  }

  75% {
    transform: translateX(2px);
  }
}
</style>
