<script setup lang="ts">
import { computed } from 'vue'

import type { DictionaryEntry, DictionaryExplanationLine } from '../dictionaries/types'

const props = defineProps<{
  entry: DictionaryEntry
}>()

const primaryLines = computed(() =>
  (props.entry.explanation ?? []).filter((line) =>
    ['part-of-speech', 'definition', 'sense', 'text'].includes(line.kind),
  ),
)
const exampleLines = computed(() =>
  (props.entry.explanation ?? []).filter((line) => ['example', 'translation'].includes(line.kind)),
)

function lineLabel(line: DictionaryExplanationLine): string {
  if (line.kind === 'example') return '例'
  if (line.kind === 'translation') return '译'
  return ''
}
</script>

<template>
  <aside class="explanation-panel" aria-label="单词释义">
    <div class="entry-heading">
      <strong>{{ entry.word }}</strong>
      <span v-if="entry.phonetic">{{ entry.phonetic }}</span>
    </div>

    <div v-if="primaryLines.length" class="meaning-lines">
      <p v-for="(line, index) in primaryLines" :key="index" :data-kind="line.kind">
        {{ line.text }}
      </p>
    </div>
    <p v-else class="empty-explanation">当前词典没有提供可用释义。</p>

    <div v-if="exampleLines.length" class="example-lines">
      <p v-for="(line, index) in exampleLines" :key="index">
        <span>{{ lineLabel(line) }}</span
        >{{ line.text }}
      </p>
    </div>
  </aside>
</template>

<style scoped>
.explanation-panel {
  max-height: min(570px, calc(100vh - 180px));
  margin: 0;
  padding: 14px 18px;
  overflow-y: auto;
  color: #40566c;
  background: rgb(250 253 252 / 96%);
  border: 1px solid #cfe3de;
  border-left: 4px solid #32aa94;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgb(49 78 102 / 8%);
}

.entry-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 7px;
}

.entry-heading strong {
  color: #173d50;
  font-size: 1rem;
}

.entry-heading span {
  color: #168e80;
  font-family: 'Cascadia Mono', Consolas, monospace;
  font-size: 0.85rem;
}

p {
  margin: 3px 0;
  line-height: 1.55;
}

.meaning-lines p {
  font-size: 0.88rem;
}

.meaning-lines p[data-kind='part-of-speech'] {
  color: #168e80;
  font-weight: 700;
}

.example-lines {
  margin-top: 9px;
  padding-top: 8px;
  color: #66798a;
  border-top: 1px dashed #d6e4e2;
  font-size: 0.78rem;
}

.example-lines span {
  display: inline-grid;
  width: 20px;
  height: 20px;
  margin-right: 6px;
  place-items: center;
  color: #168e80;
  background: #e5f5f1;
  border-radius: 5px;
  font-size: 0.66rem;
  font-weight: 800;
}

.empty-explanation {
  color: #8a98a5;
  font-size: 0.82rem;
}
</style>
