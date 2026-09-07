<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import type {
  ChineseWordCategory,
  ChineseWordCategorySummary,
  ChineseWordLessonSummary,
} from '../chineseWords/types'

const props = defineProps<{
  open: boolean
  categories: ChineseWordCategorySummary[]
  lessons: ChineseWordLessonSummary[]
  activeLessonId: string | null
  loadingLessonId?: string | null
}>()

const emit = defineEmits<{
  'update:open': [open: boolean]
  select: [lesson: ChineseWordLessonSummary]
}>()

const expandedCategories = ref<ChineseWordCategory[]>([])
const groups = computed(() =>
  props.categories.map((category) => ({
    ...category,
    lessons: props.lessons.filter((lesson) => lesson.category === category.id),
  })),
)

function close() {
  emit('update:open', false)
}

function selectLesson(lesson: ChineseWordLessonSummary) {
  emit('select', lesson)
  close()
}

function toggleCategory(category: ChineseWordCategory) {
  expandedCategories.value = expandedCategories.value.includes(category)
    ? expandedCategories.value.filter((item) => item !== category)
    : [...expandedCategories.value, category]
}

function isExpanded(category: ChineseWordCategory): boolean {
  return expandedCategories.value.includes(category)
}

function handleEscape(event: KeyboardEvent) {
  if (event.key === 'Escape') close()
}

watch(
  () => props.open,
  (open) => {
    if (!open) return
    const activeCategory = props.lessons.find(
      (lesson) => lesson.id === props.activeLessonId,
    )?.category
    expandedCategories.value = activeCategory
      ? [activeCategory]
      : props.categories[0]
        ? [props.categories[0].id]
        : []
  },
)

onMounted(() => window.addEventListener('keydown', handleEscape))
onBeforeUnmount(() => window.removeEventListener('keydown', handleEscape))
</script>

<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="open" class="drawer-layer" role="presentation" @click.self="close">
        <aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="word-lesson-title">
          <header>
            <div>
              <p>拼音打字 · 词汇练习</p>
              <h2 id="word-lesson-title">选择课程</h2>
            </div>
            <button type="button" class="close-button" aria-label="关闭课程选择" @click="close">
              ×
            </button>
          </header>

          <section v-for="group in groups" :key="group.id" class="lesson-group">
            <button
              type="button"
              class="group-header"
              :aria-expanded="isExpanded(group.id)"
              @click="toggleCategory(group.id)"
            >
              <span
                class="pi"
                :class="isExpanded(group.id) ? 'pi-chevron-down' : 'pi-chevron-right'"
                aria-hidden="true"
              />
              <strong>{{ group.name }}</strong>
              <small>{{ group.lessons.length }} 课</small>
            </button>

            <ul v-if="isExpanded(group.id)">
              <li v-for="lesson in group.lessons" :key="lesson.id">
                <button
                  type="button"
                  class="lesson-item"
                  :class="{ active: lesson.id === activeLessonId }"
                  :aria-current="lesson.id === activeLessonId ? 'page' : undefined"
                  @click="selectLesson(lesson)"
                >
                  <span class="lesson-icon"><span class="pi pi-list-check" /></span>
                  <span>
                    <strong>{{ lesson.title }}</strong>
                    <small>{{ lesson.wordCount.toLocaleString('zh-CN') }} 词</small>
                  </span>
                  <small v-if="lesson.id === loadingLessonId">加载中</small>
                  <small v-else-if="lesson.id === activeLessonId" class="current">当前</small>
                  <small v-else>开始</small>
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
  width: min(500px, calc(100% - 28px));
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
  margin-bottom: 16px;
}

header p,
header h2 {
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

.lesson-group {
  margin-top: 10px;
}

.group-header {
  display: grid;
  grid-template-columns: 16px 1fr auto;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 11px 8px;
  color: #526a7d;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 9px;
}

.group-header:hover {
  background: #eaf2f5;
}

.group-header .pi {
  color: #168e80;
  font-size: 0.72rem;
}

.group-header small {
  color: #8495a2;
}

ul {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0 0 4px;
  list-style: none;
}

.lesson-item {
  display: grid;
  grid-template-columns: 38px 1fr auto;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 12px;
  color: #40566c;
  text-align: left;
  cursor: pointer;
  background: #fff;
  border: 1px solid #d8e3e9;
  border-radius: 12px;
}

.lesson-item.active {
  border-color: #168e80;
  box-shadow: 0 0 0 2px rgb(22 142 128 / 12%);
}

.lesson-item > span:nth-child(2) {
  display: grid;
  gap: 3px;
}

.lesson-item small {
  color: #8393a2;
  font-size: 0.7rem;
}

.lesson-item .current {
  color: #168e80;
  font-weight: 700;
}

.lesson-icon {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  color: #168e80;
  background: #e5f4f1;
  border-radius: 10px;
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
