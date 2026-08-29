<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { englishKeyStandardCourse } from '@/content/courses'
import type { Lesson } from '@/content/types'

import HandGuide from '../components/HandGuide.vue'
import KeyboardGuide from '../components/KeyboardGuide.vue'
import LessonDrawer from '../components/LessonDrawer.vue'
import SessionResultDialog from '../components/SessionResultDialog.vue'
import TrainingSettingsDialog from '../components/TrainingSettingsDialog.vue'
import TrainingWorkspace from '../components/TrainingWorkspace.vue'
import TypingText from '../components/TypingText.vue'
import { useTypingEngine } from '../composables/useTypingEngine'
import { keyboardKeyToCharacter } from '../engine/typingEngine'
import { resolveKeyFeedback } from '../keyboard/keyboardFeedback'
import {
  fingerLabels,
  formatTrainingCharacter,
  getFingerForCode,
  resolveKeyboardTarget,
} from '../keyboard/qwertyLayout'
import type { KeyFeedback } from '../keyboard/types'

type TypingTextScale = 'small' | 'medium' | 'large'

const route = useRoute()
const router = useRouter()
const lessons = englishKeyStandardCourse.lessons
const lessonDrawerOpen = ref(false)
const settingsOpen = ref(false)
const resultOpen = ref(false)
const showKeyboard = ref(true)
const showHands = ref(true)
const textScale = ref<TypingTextScale>('medium')
const keyFeedback = ref<Record<string, KeyFeedback>>({})
const feedbackTimers = new Map<string, ReturnType<typeof setTimeout>>()

const activeLesson = computed<Lesson>(() => {
  const lessonId = Array.isArray(route.params.lessonId)
    ? route.params.lessonId[0]
    : route.params.lessonId

  return lessons.find((lesson) => lesson.id === lessonId) ?? lessons[0]!
})

const { session, stats, expectedCharacter, handleKeydown, pause, resume, restart } =
  useTypingEngine(() => activeLesson.value.content, {
    caseSensitive: false,
    autoAdvanceWhitespace: true,
  })

const hasCurrentError = computed(
  () =>
    session.value.lastAttempt?.correct === false &&
    session.value.lastAttempt.position === session.value.position,
)

const keyboardTarget = computed(() =>
  session.value.status === 'completed'
    ? null
    : resolveKeyboardTarget(
        expectedCharacter.value === null
          ? null
          : formatTrainingCharacter(expectedCharacter.value),
        { useShiftForUppercase: false },
      ),
)

const activeLessonIndex = computed(() =>
  lessons.findIndex((lesson) => lesson.id === activeLesson.value.id),
)
const hasNextLesson = computed(() => activeLessonIndex.value < lessons.length - 1)
const overlayOpen = computed(
  () => lessonDrawerOpen.value || settingsOpen.value || resultOpen.value,
)

const promptText = computed(() => {
  if (session.value.status === 'completed') return '本课已经完成，可以重新练习或选择下一课。'
  if (hasCurrentError.value) return '按键不正确，请看提示后重新输入当前字符。'
  if (!keyboardTarget.value) return '请按照训练文字继续输入。'

  const character =
    keyboardTarget.value.character === ' '
      ? '空格'
      : keyboardTarget.value.character === '\n'
        ? '回车'
        : keyboardTarget.value.character
  const shift = keyboardTarget.value.shiftFinger
    ? `，同时按住${fingerLabels[keyboardTarget.value.shiftFinger]} Shift`
    : ''

  return `请使用${fingerLabels[keyboardTarget.value.finger]}输入 ${character}${shift}`
})

function selectLesson(lessonId: string) {
  void router.push({ name: 'english-key-practice', params: { lessonId } })
}

function handlePageKeydown(event: KeyboardEvent) {
  if (overlayOpen.value) return

  const inputCharacter = keyboardKeyToCharacter(event.key)
  if (getFingerForCode(event.code) !== null) {
    const feedback = resolveKeyFeedback(
      event.code,
      inputCharacter,
      expectedCharacter.value,
      keyboardTarget.value,
      session.value.options.caseSensitive,
    )

    const timer = feedbackTimers.get(event.code)
    if (timer !== undefined) clearTimeout(timer)
    feedbackTimers.delete(event.code)
    keyFeedback.value = { ...keyFeedback.value, [event.code]: feedback }
  }

  handleKeydown(event)
}

function handlePageKeyup(event: KeyboardEvent) {
  if (!(event.code in keyFeedback.value)) return

  const timer = setTimeout(() => {
    const nextFeedback = { ...keyFeedback.value }
    delete nextFeedback[event.code]
    keyFeedback.value = nextFeedback
    feedbackTimers.delete(event.code)
  }, 35)

  feedbackTimers.set(event.code, timer)
}

function clearKeyFeedback() {
  for (const timer of feedbackTimers.values()) clearTimeout(timer)
  feedbackTimers.clear()
  keyFeedback.value = {}
}

function restartFromResult() {
  resultOpen.value = false
  restart()
}

function openNextLesson() {
  const nextLesson = lessons[activeLessonIndex.value + 1]
  if (!nextLesson) return

  resultOpen.value = false
  selectLesson(nextLesson.id)
}

watch(
  () => session.value.status,
  (status) => {
    if (status === 'completed') resultOpen.value = true
  },
)

onMounted(() => {
  window.addEventListener('keydown', handlePageKeydown)
  window.addEventListener('keyup', handlePageKeyup)
  window.addEventListener('blur', clearKeyFeedback)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handlePageKeydown)
  window.removeEventListener('keyup', handlePageKeyup)
  window.removeEventListener('blur', clearKeyFeedback)
  clearKeyFeedback()
})
</script>

<template>
  <TrainingWorkspace
    eyebrow="英文打字 · 基础键位"
    :title="activeLesson.title"
    :status="session.status"
    :stats="stats"
    :show-guidance="showKeyboard || showHands"
  >
    <template #lesson-picker>
      <div class="header-actions">
        <button type="button" class="header-button" @click="lessonDrawerOpen = true">
          第 {{ activeLesson.order }} 课 · 选择课程
        </button>
        <button type="button" class="header-button icon-button" @click="settingsOpen = true">
          设置
        </button>
      </div>
    </template>

    <template #actions>
      <button v-if="session.status === 'running'" type="button" @click="pause()">暂停</button>
      <button v-else-if="session.status === 'paused'" type="button" @click="resume()">
        继续
      </button>
      <button type="button" class="secondary" @click="restart">重新练习</button>
    </template>

    <template #content>
      <TypingText
        :content="activeLesson.content"
        :position="session.position"
        :has-current-error="hasCurrentError"
        :scale="textScale"
      />
    </template>

    <template #prompt>{{ promptText }}</template>

    <template #guidance>
      <KeyboardGuide
        v-if="showKeyboard"
        :target="keyboardTarget"
        :key-feedback="keyFeedback"
      />
      <HandGuide v-if="showHands" :target="keyboardTarget" />
    </template>
  </TrainingWorkspace>

  <LessonDrawer
    v-model:open="lessonDrawerOpen"
    :lessons="lessons"
    :active-lesson-id="activeLesson.id"
    @select="selectLesson"
  />

  <TrainingSettingsDialog
    v-model:open="settingsOpen"
    v-model:show-keyboard="showKeyboard"
    v-model:show-hands="showHands"
    v-model:text-scale="textScale"
  />

  <SessionResultDialog
    v-model:open="resultOpen"
    :lesson-title="activeLesson.title"
    :stats="stats"
    :has-next-lesson="hasNextLesson"
    @restart="restartFromResult"
    @next="openNextLesson"
  />
</template>

<style scoped>
.header-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.header-button {
  padding: 10px 13px;
  color: #263b52;
  cursor: pointer;
  background: #fff;
  border: 1px solid #cbd9e3;
  border-radius: 10px;
}

.icon-button {
  color: #168e80;
}

button {
  padding: 8px 16px;
  color: #fff;
  cursor: pointer;
  background: #168e80;
  border: 1px solid #168e80;
  border-radius: 9px;
}

button.secondary {
  color: #40556b;
  background: transparent;
  border-color: #b9c9d5;
}

button:hover {
  filter: brightness(0.95);
}

@media (width <= 700px) {
  .header-actions {
    justify-content: stretch;
  }

  .header-button:first-child {
    flex: 1;
  }
}
</style>
