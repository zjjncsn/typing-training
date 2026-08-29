<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'

import type { Lesson } from '@/content/types'

defineProps<{
  open: boolean
  lessons: Lesson[]
  activeLessonId: string
}>()

const emit = defineEmits<{
  'update:open': [open: boolean]
  select: [lessonId: string]
}>()

function close() {
  emit('update:open', false)
}

function selectLesson(lessonId: string) {
  emit('select', lessonId)
  close()
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
        <aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="lesson-drawer-title">
          <header>
            <div>
              <p>英文基础键位</p>
              <h2 id="lesson-drawer-title">选择课程</h2>
            </div>
            <button type="button" class="close-button" aria-label="关闭课程选择" @click="close">
              ×
            </button>
          </header>

          <ol>
            <li v-for="lesson in lessons" :key="lesson.id">
              <button
                type="button"
                class="lesson-item"
                :class="{ active: lesson.id === activeLessonId }"
                :aria-current="lesson.id === activeLessonId ? 'page' : undefined"
                @click="selectLesson(lesson.id)"
              >
                <span>{{ lesson.order }}</span>
                <strong>{{ lesson.title }}</strong>
                <small>{{ lesson.id === activeLessonId ? '当前课程' : '开始练习' }}</small>
              </button>
            </li>
          </ol>
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
  width: min(430px, calc(100% - 28px));
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
  margin-bottom: 22px;
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

ol {
  display: grid;
  gap: 9px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.lesson-item {
  display: grid;
  grid-template-columns: 36px 1fr auto;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 13px;
  color: #40566c;
  text-align: left;
  cursor: pointer;
  background: #fff;
  border: 1px solid #d8e3e9;
  border-radius: 12px;
}

.lesson-item > span {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  color: #168e80;
  background: #e5f4f1;
  border-radius: 9px;
  font-weight: 800;
}

.lesson-item strong {
  font-size: 0.9rem;
}

.lesson-item small {
  color: #8393a2;
  font-size: 0.68rem;
}

.lesson-item.active {
  border-color: #168e80;
  box-shadow: 0 0 0 2px rgb(22 142 128 / 12%);
}

.lesson-item.active small {
  color: #168e80;
  font-weight: 700;
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
