<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { englishKeyStandardCourse, englishNumpadCourse } from '@/content/courses'
import type { Lesson } from '@/content/types'

import HandGuide from '../components/HandGuide.vue'
import KeyboardGuide from '../components/KeyboardGuide.vue'
import LessonDrawer from '../components/LessonDrawer.vue'
import LineTypingText from '../components/LineTypingText.vue'
import NumpadGuide from '../components/NumpadGuide.vue'
import SessionResultDialog from '../components/SessionResultDialog.vue'
import TrainingSettingsDialog from '../components/TrainingSettingsDialog.vue'
import TrainingWorkspace from '../components/TrainingWorkspace.vue'
import TypingText from '../components/TypingText.vue'
import { useTypingEngine } from '../composables/useTypingEngine'
import { keyboardKeyToCharacter, type TypingEngineOptions } from '../engine/typingEngine'
import { resolveKeyFeedback } from '../keyboard/keyboardFeedback'
import {
  getNumpadFingerForCode,
  numpadCodeToCharacter,
  resolveNumpadTarget,
} from '../keyboard/numpadLayout'
import {
  fingerLabels,
  formatTrainingCharacter,
  getFingerForCode,
  resolveKeyboardTarget,
} from '../keyboard/qwertyLayout'
import type { KeyFeedback } from '../keyboard/types'

type TypingTextScale = 'small' | 'medium' | 'large'
type PauseReason = 'keyboard' | 'visibility'
type PracticeMode = 'key' | 'key-advanced' | 'numpad'
type LineAttempt = { received: string; correct: boolean }

const route = useRoute()
const router = useRouter()
const mode = computed<PracticeMode>(() => {
  if (route.name === 'english-numpad-practice') return 'numpad'
  if (route.name === 'english-key-advanced-practice') return 'key-advanced'
  return 'key'
})
const isNumpad = computed(() => mode.value === 'numpad')
const isAdvanced = computed(() => mode.value === 'key-advanced')
const activeCourse = computed(() =>
  isNumpad.value ? englishNumpadCourse : englishKeyStandardCourse,
)
const lessons = computed(() => activeCourse.value.lessons)
const lessonDrawerOpen = ref(false)
const settingsOpen = ref(false)
const resultOpen = ref(false)
const showKeyboard = ref(true)
const showHands = ref(true)
const textScale = ref<TypingTextScale>('medium')
const keyFeedback = ref<Record<string, KeyFeedback>>({})
const pauseReason = ref<PauseReason | null>(null)
const capsLockOn = ref(false)
const attemptLog = ref<Record<number, LineAttempt>>({})
const feedbackTimers = new Map<string, ReturnType<typeof setTimeout>>()

const activeLesson = computed<Lesson>(() => {
  const lessonId = Array.isArray(route.params.lessonId)
    ? route.params.lessonId[0]
    : route.params.lessonId

  return lessons.value.find((lesson) => lesson.id === lessonId) ?? lessons.value[0]!
})

const engineOptions = computed<Partial<TypingEngineOptions>>(() =>
  isAdvanced.value
    ? { caseSensitive: true, autoAdvanceWhitespace: false, autoAdvanceBlankLines: true }
    : { caseSensitive: false, autoAdvanceWhitespace: true },
)

const {
  session,
  stats,
  expectedCharacter,
  inputCharacter: feedEngine,
  handleKeydown,
  backspace,
  pause,
  resume,
  restart,
} = useTypingEngine(() => activeLesson.value.content, engineOptions)

function inputCharacter(character: string, timestamp = Date.now(), correctOverride?: boolean) {
  feedEngine(character, timestamp, correctOverride)
  recordAttempt()
}

function recordAttempt() {
  const attempt = session.value.lastAttempt
  if (!attempt) return

  attemptLog.value = {
    ...attemptLog.value,
    [attempt.position]: { received: attempt.received, correct: attempt.correct },
  }
}

const hasCurrentError = computed(
  () =>
    session.value.lastAttempt?.correct === false &&
    session.value.lastAttempt.position === session.value.position,
)

const keyboardTarget = computed(() => {
  if (session.value.status === 'completed') return null

  if (isNumpad.value) {
    return resolveNumpadTarget(expectedCharacter.value)
  }

  const targetCharacter =
    isAdvanced.value || expectedCharacter.value === null
      ? expectedCharacter.value
      : formatTrainingCharacter(expectedCharacter.value)

  return resolveKeyboardTarget(
    targetCharacter,
    isAdvanced.value
      ? { capsLockOn: capsLockOn.value, spaceForNewline: true }
      : { useShiftForUppercase: false },
  )
})

const activeLessonIndex = computed(() =>
  lessons.value.findIndex((lesson) => lesson.id === activeLesson.value.id),
)
const hasNextLesson = computed(() => activeLessonIndex.value < lessons.value.length - 1)
const overlayOpen = computed(
  () => lessonDrawerOpen.value || settingsOpen.value || resultOpen.value,
)
const pauseMessage = computed(() =>
  pauseReason.value === 'visibility'
    ? '离开页面，训练已自动暂停'
    : '训练已暂停',
)

const promptText = computed(() => {
  if (session.value.status === 'completed') return '本课已经完成，可以重新练习或选择下一课。'
  if (hasCurrentError.value) return '按键不正确，请看提示后重新输入当前字符。'
  if (!keyboardTarget.value) return '请按照训练文字继续输入。'

  const character =
    keyboardTarget.value.character === ' '
      ? '空格'
      : keyboardTarget.value.character === '\n'
        ? isAdvanced.value
          ? '空格 / 回车（换行）'
          : '回车'
        : keyboardTarget.value.character
  const shift = keyboardTarget.value.shiftFinger
    ? `，同时按住${fingerLabels[keyboardTarget.value.shiftFinger]} Shift`
    : ''

  return `请使用${fingerLabels[keyboardTarget.value.finger]}输入 ${character}${shift}`
})

function selectLesson(lessonId: string) {
  void router.push({ name: route.name ?? 'english-key-practice', params: { lessonId } })
}

function switchKeyboardMode() {
  const course = isNumpad.value ? englishKeyStandardCourse : englishNumpadCourse
  const routeName = isNumpad.value ? 'english-key-practice' : 'english-numpad-practice'
  const firstLesson = course.lessons[0]
  if (!firstLesson) return

  void router.push({ name: routeName, params: { lessonId: firstLesson.id } })
}

function switchKeyMode() {
  void router.push({
    name: isAdvanced.value ? 'english-key-practice' : 'english-key-advanced-practice',
    params: { lessonId: activeLesson.value.id },
  })
}

function setKeyFeedback(code: string, feedback: KeyFeedback) {
  const timer = feedbackTimers.get(code)
  if (timer !== undefined) clearTimeout(timer)
  feedbackTimers.delete(code)
  keyFeedback.value = { ...keyFeedback.value, [code]: feedback }
}

function handleNumpadKeydown(event: KeyboardEvent) {
  if (event.ctrlKey || event.metaKey || event.altKey) return

  const physicalCharacter = numpadCodeToCharacter(event.code)
  const received = physicalCharacter ?? keyboardKeyToCharacter(event.key)

  if (getNumpadFingerForCode(event.code) !== null) {
    const correct =
      physicalCharacter !== null &&
      keyboardTarget.value?.code === event.code &&
      physicalCharacter === expectedCharacter.value
    setKeyFeedback(event.code, correct ? 'correct' : 'incorrect')
  }

  if (received === null) return

  event.preventDefault()
  const correct =
    physicalCharacter !== null &&
    keyboardTarget.value?.code === event.code &&
    physicalCharacter === expectedCharacter.value
  inputCharacter(received, Date.now(), correct)
}

function handlePageKeydown(event: KeyboardEvent) {
  syncCapsLockState(event)

  if (overlayOpen.value) return

  if (event.key === 'Escape') {
    event.preventDefault()
    if (session.value.status === 'running') pauseTraining('keyboard')
    return
  }

  if (session.value.status === 'paused') {
    if (event.ctrlKey || event.metaKey || event.altKey) return

    event.preventDefault()
    resumeTraining()
    return
  }

  if (isNumpad.value) {
    handleNumpadKeydown(event)
    return
  }

  if (isAdvanced.value && event.key === 'Backspace') {
    event.preventDefault()
    backspace()
    pruneAttemptLog()
    return
  }

  if (isAdvanced.value && expectedCharacter.value === '\n' && event.key === ' ') {
    event.preventDefault()
    setKeyFeedback('Space', 'correct')
    inputCharacter('\n')
    return
  }

  const received = keyboardKeyToCharacter(event.key)
  if (event.code !== 'CapsLock' && getFingerForCode(event.code) !== null) {
    const feedback = resolveKeyFeedback(
      event.code,
      received,
      expectedCharacter.value,
      keyboardTarget.value,
      session.value.options.caseSensitive,
    )

    setKeyFeedback(event.code, feedback)
  }

  handleKeydown(event)
  recordAttempt()
}

function syncCapsLockState(event: KeyboardEvent) {
  capsLockOn.value =
    event.code === 'CapsLock' ? !capsLockOn.value : event.getModifierState('CapsLock')
}

function pruneAttemptLog() {
  const position = session.value.position
  const next: Record<number, LineAttempt> = {}

  for (const [key, value] of Object.entries(attemptLog.value)) {
    const entryPosition = Number(key)
    if (entryPosition < position) next[entryPosition] = value
  }

  attemptLog.value = next
}

function clearAttemptLog() {
  attemptLog.value = {}
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

function pauseTraining(reason: PauseReason = 'keyboard') {
  if (session.value.status !== 'running') return

  pauseReason.value = reason
  clearKeyFeedback()
  pause()
}

function resumeTraining() {
  if (session.value.status !== 'paused') return

  resume()
  pauseReason.value = null
}

function handleVisibilityChange() {
  if (document.visibilityState === 'hidden') pauseTraining('visibility')
}

function restartFromResult() {
  resultOpen.value = false
  restartTraining()
}

function restartTraining() {
  restart()
  clearAttemptLog()
}

function openNextLesson() {
  const nextLesson = lessons.value[activeLessonIndex.value + 1]
  if (!nextLesson) return

  resultOpen.value = false
  selectLesson(nextLesson.id)
}

watch([activeLesson, mode], clearAttemptLog)

watch(
  () => session.value.status,
  (status) => {
    if (status === 'completed') resultOpen.value = true
    if (status !== 'paused') pauseReason.value = null
  },
)

onMounted(() => {
  window.addEventListener('keydown', handlePageKeydown)
  window.addEventListener('keyup', handlePageKeyup)
  window.addEventListener('blur', clearKeyFeedback)
  document.addEventListener('visibilitychange', handleVisibilityChange)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handlePageKeydown)
  window.removeEventListener('keyup', handlePageKeyup)
  window.removeEventListener('blur', clearKeyFeedback)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  clearKeyFeedback()
})
</script>

<template>
  <TrainingWorkspace
    :eyebrow="isNumpad ? '英文打字 · 数字键盘' : isAdvanced ? '英文打字 · 键位练习（高级）' : '英文打字 · 基础键位'"
    :title="activeLesson.title"
    :status="session.status"
    :stats="stats"
    :show-guidance="isAdvanced ? showKeyboard : showKeyboard || showHands"
    :pause-message="pauseMessage"
  >
    <template #lesson-picker>
      <div class="header-actions">
        <button
          v-if="!isNumpad"
          type="button"
          class="header-button mode-button"
          @click="switchKeyMode"
        >
          {{ isAdvanced ? '基础键位' : '键位练习（高级）' }}
        </button>
        <button type="button" class="header-button mode-button" @click="switchKeyboardMode">
          {{ isNumpad ? '标准键盘' : '数字键盘' }}
        </button>
        <button type="button" class="header-button" @click="lessonDrawerOpen = true">
          第 {{ activeLesson.order }} 课 · 选择课程
        </button>
        <button type="button" class="header-button icon-button" @click="settingsOpen = true">
          设置
        </button>
      </div>
    </template>

    <template #actions>
      <button v-if="session.status === 'running'" type="button" @click="pauseTraining()">
        暂停
      </button>
      <button v-else-if="session.status === 'paused'" type="button" @click="resumeTraining()">
        继续
      </button>
      <button type="button" class="secondary" @click="restartTraining">重新练习</button>
    </template>

    <template #content>
      <LineTypingText
        v-if="isAdvanced"
        :content="activeLesson.content"
        :position="session.position"
        :has-current-error="hasCurrentError"
        :scale="textScale"
        :attempt-results="attemptLog"
      />
      <TypingText
        v-else
        :content="activeLesson.content"
        :position="session.position"
        :has-current-error="hasCurrentError"
        :scale="textScale"
      />
    </template>

    <template #prompt>{{ promptText }}</template>

    <template #guidance>
      <KeyboardGuide
        v-if="showKeyboard && !isNumpad"
        :target="keyboardTarget"
        :key-feedback="keyFeedback"
        :caps-lock-on="capsLockOn"
      />
      <NumpadGuide
        v-if="showKeyboard && isNumpad"
        :target="keyboardTarget"
        :key-feedback="keyFeedback"
      />
      <HandGuide v-if="showHands && !isAdvanced" :target="keyboardTarget" />
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

.mode-button {
  color: #08796c;
  background: #effbf8;
  border-color: #a8d9d1;
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
