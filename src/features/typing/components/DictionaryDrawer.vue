<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'

import type { DictionaryCategory, DictionarySummary } from '../dictionaries/types'

const props = defineProps<{
  open: boolean
  dictionaries: DictionarySummary[]
  activeDictionaryId: string | null
  loadingDictionaryId?: string | null
}>()

const emit = defineEmits<{
  'update:open': [open: boolean]
  select: [dictionary: DictionarySummary]
}>()

const categoryOrder: DictionaryCategory[] = ['general', 'dictionary', 'professional']
const categoryLabels: Record<DictionaryCategory, string> = {
  general: '常用词表',
  dictionary: '分级与考试词汇',
  professional: '专业英语',
}

const groups = computed(() =>
  categoryOrder
    .map((category) => ({
      category,
      label: categoryLabels[category],
      dictionaries: props.dictionaries.filter((dictionary) => dictionary.category === category),
    }))
    .filter((group) => group.dictionaries.length > 0),
)

function close() {
  emit('update:open', false)
}

function selectDictionary(dictionary: DictionarySummary) {
  emit('select', dictionary)
  close()
}

function formatCount(count: number): string {
  return `${count.toLocaleString('zh-CN')} 词`
}

function handleEscape(event: KeyboardEvent) {
  if (event.key === 'Escape') close()
}

onMounted(() => window.addEventListener('keydown', handleEscape))
onBeforeUnmount(() => window.removeEventListener('keydown', handleEscape))
</script>

<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="open" class="drawer-layer" role="presentation" @click.self="close">
        <aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="dictionary-title">
          <header>
            <div>
              <p>单词练习</p>
              <h2 id="dictionary-title">选择词典</h2>
            </div>
            <button type="button" class="close-button" aria-label="关闭词典选择" @click="close">
              ×
            </button>
          </header>

          <section v-for="group in groups" :key="group.category">
            <h3>{{ group.label }}</h3>
            <ul>
              <li v-for="dictionary in group.dictionaries" :key="dictionary.id">
                <button
                  type="button"
                  class="dictionary-item"
                  :class="{ active: dictionary.id === activeDictionaryId }"
                  :aria-current="dictionary.id === activeDictionaryId ? 'page' : undefined"
                  @click="selectDictionary(dictionary)"
                >
                  <span class="dictionary-icon">Aa</span>
                  <span class="dictionary-copy">
                    <strong>{{ dictionary.name }}</strong>
                    <small>{{ formatCount(dictionary.entryCount) }}</small>
                  </span>
                  <span v-if="dictionary.id === loadingDictionaryId" class="loading">加载中</span>
                  <span v-else-if="dictionary.id === activeDictionaryId" class="current">当前</span>
                </button>
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.drawer-layer {
  position: fixed;
  z-index: 100;
  inset: 0;
  display: flex;
  justify-content: flex-end;
  background: rgb(18 37 55 / 38%);
  backdrop-filter: blur(2px);
}

.drawer {
  width: min(460px, calc(100% - 28px));
  height: 100%;
  padding: 24px;
  overflow-y: auto;
  background: #f5f9fb;
  box-shadow: -18px 0 50px rgb(24 50 70 / 20%);
}

header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 20px;
}

header p,
header h2,
h3 {
  margin: 0;
}

header p {
  color: #168e80;
  font-size: 0.75rem;
  font-weight: 800;
}

header h2 {
  margin-top: 4px;
  color: #1b334b;
}

.close-button {
  width: 36px;
  height: 36px;
  color: #52687c;
  cursor: pointer;
  background: #fff;
  border: 1px solid #d1dee5;
  border-radius: 10px;
  font-size: 1.4rem;
}

section + section {
  margin-top: 20px;
}

h3 {
  margin-bottom: 8px;
  color: #748695;
  font-size: 0.76rem;
  letter-spacing: 0.06em;
}

ul {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.dictionary-item {
  display: grid;
  grid-template-columns: 40px 1fr auto;
  align-items: center;
  gap: 11px;
  width: 100%;
  padding: 12px 13px;
  color: #40566c;
  text-align: left;
  cursor: pointer;
  background: #fff;
  border: 1px solid #d8e3e9;
  border-radius: 12px;
}

.dictionary-icon {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  color: #168e80;
  background: #e5f4f1;
  border-radius: 9px;
  font-family: Georgia, serif;
  font-weight: 800;
}

.dictionary-copy {
  display: grid;
  gap: 2px;
}

.dictionary-copy strong {
  font-size: 0.9rem;
}

.dictionary-copy small,
.loading,
.current {
  color: #8393a2;
  font-size: 0.68rem;
}

.dictionary-item.active {
  border-color: #168e80;
  box-shadow: 0 0 0 2px rgb(22 142 128 / 12%);
}

.dictionary-item.active .current {
  color: #168e80;
  font-weight: 700;
}

.loading {
  color: #a16700;
}

.drawer-enter-active,
.drawer-leave-active {
  transition: background 180ms ease;
}

.drawer-enter-active .drawer,
.drawer-leave-active .drawer {
  transition: transform 180ms ease;
}

.drawer-enter-from,
.drawer-leave-to {
  background: transparent;
}

.drawer-enter-from .drawer,
.drawer-leave-to .drawer {
  transform: translateX(100%);
}
</style>
