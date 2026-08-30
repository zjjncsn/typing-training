<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import KeyboardGuide from '../components/KeyboardGuide.vue'
import SessionResultDialog from '../components/SessionResultDialog.vue'
import SyllableLessonDrawer from '../components/SyllableLessonDrawer.vue'
import SyllableTypingText from '../components/SyllableTypingText.vue'
import TrainingSettingsDialog from '../components/TrainingSettingsDialog.vue'
import TrainingWorkspace from '../components/TrainingWorkspace.vue'
import { useWordPracticeEngine } from '../composables/useWordPracticeEngine'
import { keyboardKeyToCharacter } from '../engine/typingEngine'
import { resolveKeyFeedback } from '../keyboard/keyboardFeedback'
import { fingerLabels, getFingerForCode, resolveKeyboardTarget } from '../keyboard/qwertyLayout'
import type { KeyFeedback } from '../keyboard/types'
import { loadSyllableLesson, loadSyllableManifest } from '../syllables/syllableRepository'
import type {
  SyllableEntry,
  SyllableLesson,
  SyllableLessonSummary,
  SyllableManifest,
} from '../syllables/types'

type TypingTextScale = 'small' | 'medium' | 'large'
type PauseReason = 'keyboard' | 'visibility'
type CharacterAttempt = { received: string; correct: boolean }
type StoredSyllablePosition = { lessonId: string; entryIndex: number }

const positionStorageKey = 'typing-practice.syllable-position.v1'
const route = useRoute()
const router = useRouter()

const manifest = ref<SyllableManifest | null>(null)
const selectedSummary = ref<SyllableLessonSummary | null>(null)
const lesson = ref<SyllableLesson | null>(null)
const loadingLessonId = ref<string | null>(null)
const loadError = ref<string | null>(null)
const initialEntryIndex = ref(0)
const lessonDrawerOpen = ref(false)
const settingsOpen = ref(false)
const resultOpen = ref(false)
const showKeyboard = ref(true)
const textScale = ref<TypingTextScale>('medium')
const keyFeedback = ref<Record<string, KeyFeedback>>({})
const attemptLog = ref<Record<number, CharacterAttempt>>({})
const pauseReason = ref<PauseReason | null>(null)
const capsLockOn = ref(false)
const feedbackTimers = new Map<string, ReturnType<typeof setTimeout>>()
let loadGeneration = 0

const entries = computed<SyllableEntry[]>(() => lesson.value?.entries ?? [])
const inputItems = computed(() => entries.value.map((entry) => entry.input))
const {
  practice,
  session,
  stats,
  expectedCharacter,
  inputCharacter: feedEngine,
  backspace,
  pause,
  resume,
  restart,
} = useWordPracticeEngine(inputItems, initialEntryIndex)

const currentEntry = computed(() => entries.value[practice.value?.wordIndex ?? 0] ?? null)
const status = computed(() => session.value?.status ?? 'idle')
const hasCurrentError = computed(
  () =>
    session.value?.lastAttempt?.correct === false &&
    session.value.lastAttempt.position === session.value.position,
)
const keyboardTarget = computed(() =>
  status.value === 'completed'
    ? null
    : resolveKeyboardTarget(expectedCharacter.value, { capsLockOn: capsLockOn.value }),
)
const overlayOpen = computed(
  () => lessonDrawerOpen.value || settingsOpen.value || resultOpen.value,
)
const title = computed(() => selectedSummary.value?.title ?? '音节练习')
const pauseMessage = computed(() =>
  pauseReason.value === 'visibility' ? '离开页面，训练已自动暂停' : '训练已暂停',
)
const promptText = computed(() => {
  if (loadError.value) return loadError.value
  if (loadingLessonId.value) return '正在加载所选课程，请稍候。'
  if (!currentEntry.value) return '请选择音节课程开始练习。'
  if (status.value === 'completed') return '当前音节课程已经完成。'
  if (hasCurrentError.value) return '按键不正确，请重新输入当前字母。'
  if (!keyboardTarget.value) return '请按照提示继续输入。'

  const character = keyboardTarget.value.character === ' ' ? '空格' : keyboardTarget.value.character
  return `请使用${fingerLabels[keyboardTarget.value.finger]}输入 ${character}`
})
const nextLesson = computed(() => {
  if (!manifest.value || !selectedSummary.value) return null
  const index = manifest.value.lessons.findIndex((item) => item.id === selectedSummary.value?.id)
  return index >= 0 ? (manifest.value.lessons[index + 1] ?? null) : null
})

function routeLessonId(): string | null {
  const value = route.params.lessonId
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null)
}

function readStoredPosition(): StoredSyllablePosition | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(positionStorageKey) ?? 'null') as unknown
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('lessonId' in parsed) ||
      !('entryIndex' in parsed) ||
      typeof parsed.lessonId !== 'string' ||
      typeof parsed.entryIndex !== 'number' ||
      !Number.isFinite(parsed.entryIndex)
    ) {
      return null
    }
    return { lessonId: parsed.lessonId, entryIndex: Math.max(0, Math.trunc(parsed.entryIndex)) }
  } catch {
    return null
  }
}

function storePosition(lessonId: string, entryIndex: number) {
  try {
    localStorage.setItem(positionStorageKey, JSON.stringify({ lessonId, entryIndex }))
  } catch {
    // Storage may be unavailable in private or restricted browser contexts.
  }
}

async function initializeLessons() {
  loadError.value = null
  try {
    const loadedManifest = await loadSyllableManifest()
    manifest.value = loadedManifest
    const requestedId = routeLessonId()
    const stored = readStoredPosition()
    const preferredId = requestedId ?? stored?.lessonId
    const summary =
      loadedManifest.lessons.find((item) => item.id === preferredId) ??
      loadedManifest.lessons.find((item) => item.id === loadedManifest.defaultLessonId) ??
      loadedManifest.lessons[0]

    if (summary) {
      const resumeIndex = stored?.lessonId === summary.id ? stored.entryIndex : 0
      await selectLesson(summary, requestedId !== summary.id, resumeIndex)
    }
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '音节课程清单加载失败。'
  }
}

async function selectLesson(
  summary: SyllableLessonSummary,
  replaceRoute = true,
  resumeIndex = 0,
) {
  if (lesson.value?.id === summary.id) return

  const generation = ++loadGeneration
  selectedSummary.value = summary
  lesson.value = null
  initialEntryIndex.value = Math.min(resumeIndex, Math.max(0, summary.entryCount - 1))
  resultOpen.value = false
  loadError.value = null
  loadingLessonId.value = summary.id
  clearAttemptLog()
  clearKeyFeedback()

  if (replaceRoute && routeLessonId() !== summary.id) {
    await router.replace({ name: 'chinese-syllable-practice', params: { lessonId: summary.id } })
  }

  try {
    const loadedLesson = await loadSyllableLesson(summary)
    if (generation !== loadGeneration) return
    lesson.value = loadedLesson
  } catch (error) {
    if (generation !== loadGeneration) return
    loadError.value = error instanceof Error ? error.message : '音节课程加载失败。'
  } finally {
    if (generation === loadGeneration) loadingLessonId.value = null
  }
}

function retryLoading() {
  if (selectedSummary.value) void selectLesson(selectedSummary.value, false)
  else void initializeLessons()
}

function inputCharacter(character: string, timestamp = Date.now()) {
  const previousEntryIndex = practice.value?.wordIndex
  feedEngine(character, timestamp)

  if (practice.value?.wordIndex !== previousEntryIndex) {
    clearAttemptLog()
    return
  }

  const attempt = session.value?.lastAttempt
  if (!attempt) return
  attemptLog.value = {
    ...attemptLog.value,
    [attempt.position]: { received: attempt.received, correct: attempt.correct },
  }
}

function setKeyFeedback(code: string, feedback: KeyFeedback) {
  const timer = feedbackTimers.get(code)
  if (timer !== undefined) clearTimeout(timer)
  feedbackTimers.delete(code)
  keyFeedback.value = { ...keyFeedback.value, [code]: feedback }
}

function handlePageKeydown(event: KeyboardEvent) {
  syncCapsLockState(event)
  if (overlayOpen.value || !session.value) return

  if (event.key === 'Escape') {
    event.preventDefault()
    if (status.value === 'running') pauseTraining('keyboard')
    return
  }

  if (status.value === 'paused') {
    if (event.ctrlKey || event.metaKey || event.altKey) return
    event.preventDefault()
    resumeTraining()
    return
  }

  if (event.key === 'Backspace') {
    event.preventDefault()
    backspace()
    pruneAttemptLog()
    return
  }

  if (event.ctrlKey || event.metaKey || event.altKey) return
  const received = keyboardKeyToCharacter(event.key)
  if (received === null) return

  if (event.code !== 'CapsLock' && getFingerForCode(event.code) !== null) {
    setKeyFeedback(
      event.code,
      resolveKeyFeedback(event.code, received, expectedCharacter.value, keyboardTarget.value, true),
    )
  }

  event.preventDefault()
  inputCharacter(received)
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

function syncCapsLockState(event: KeyboardEvent) {
  capsLockOn.value =
    event.code === 'CapsLock' ? !capsLockOn.value : event.getModifierState('CapsLock')
}

function pruneAttemptLog() {
  const position = session.value?.position ?? 0
  attemptLog.value = Object.fromEntries(
    Object.entries(attemptLog.value).filter(([key]) => Number(key) < position),
  )
}

function clearAttemptLog() {
  attemptLog.value = {}
}

function clearKeyFeedback() {
  for (const timer of feedbackTimers.values()) clearTimeout(timer)
  feedbackTimers.clear()
  keyFeedback.value = {}
}

function pauseTraining(reason: PauseReason = 'keyboard') {
  if (status.value !== 'running') return
  pauseReason.value = reason
  clearKeyFeedback()
  pause()
}

function resumeTraining() {
  if (status.value !== 'paused') return
  resume()
  pauseReason.value = null
}

function restartTraining() {
  resultOpen.value = false
  restart()
  clearAttemptLog()
}

function startNextLesson() {
  if (nextLesson.value) void selectLesson(nextLesson.value)
}

function handleVisibilityChange() {
  if (document.visibilityState === 'hidden') pauseTraining('visibility')
}

watch(
  () => route.params.lessonId,
  () => {
    if (!manifest.value) return
    const requestedId = routeLessonId()
    if (!requestedId || requestedId === selectedSummary.value?.id) return
    const summary = manifest.value.lessons.find((item) => item.id === requestedId)
    if (summary) void selectLesson(summary, false)
  },
)

watch(
  () => session.value?.status,
  (nextStatus) => {
    if (nextStatus === 'completed') resultOpen.value = true
    if (nextStatus !== 'paused') pauseReason.value = null
  },
)

watch([() => lesson.value?.id, () => practice.value?.wordIndex], ([lessonId, entryIndex]) => {
  if (lessonId && entryIndex !== undefined) storePosition(lessonId, entryIndex)
})

onMounted(() => {
  window.addEventListener('keydown', handlePageKeydown)
  window.addEventListener('keyup', handlePageKeyup)
  window.addEventListener('blur', clearKeyFeedback)
  document.addEventListener('visibilitychange', handleVisibilityChange)
  void initializeLessons()
})

onBeforeUnmount(() => {
  loadGeneration += 1
  window.removeEventListener('keydown', handlePageKeydown)
  window.removeEventListener('keyup', handlePageKeyup)
  window.removeEventListener('blur', clearKeyFeedback)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  clearKeyFeedback()
})
</script>

<template>
  <TrainingWorkspace
    eyebrow="拼音打字 · 音节练习"
    :title="title"
    :status="status"
    :stats="stats"
    show-wpm
    :show-guidance="Boolean(currentEntry && showKeyboard)"
    :pause-message="pauseMessage"
  >
    <template #lesson-picker>
      <div class="header-actions">
        <span v-if="lesson" class="position-label">
          第 {{ (practice?.wordIndex ?? 0) + 1 }} / {{ entries.length }} 组
        </span>
        <button type="button" class="header-button" @click="lessonDrawerOpen = true">
          选择课程
        </button>
        <button type="button" class="header-button icon-button" @click="settingsOpen = true">
          设置
        </button>
      </div>
    </template>

    <template #actions>
      <button v-if="status === 'running'" type="button" @click="pauseTraining()">暂停</button>
      <button v-else-if="status === 'paused'" type="button" @click="resumeTraining()">继续</button>
      <button v-if="session" type="button" class="secondary" @click="restartTraining">
        重新练习
      </button>
    </template>

    <template #content>
      <div v-if="loadingLessonId" class="state-card" role="status">
        <span class="pi pi-spin pi-spinner" aria-hidden="true" />
        <strong>正在加载 {{ title }}</strong>
      </div>
      <div v-else-if="loadError" class="state-card error-card" role="alert">
        <span class="pi pi-exclamation-circle" aria-hidden="true" />
        <strong>课程加载失败</strong>
        <small>{{ loadError }}</small>
        <button type="button" @click="retryLoading">重新加载</button>
      </div>
      <SyllableTypingText
        v-else-if="currentEntry && session"
        :entries="entries"
        :entry-index="practice?.wordIndex ?? 0"
        :position="session.position"
        :has-current-error="hasCurrentError"
        :scale="textScale"
        :attempt-results="attemptLog"
      />
      <div v-else class="state-card">
        <span class="pi pi-language" aria-hidden="true" />
        <strong>选择音节课程开始练习</strong>
      </div>
    </template>

    <template #prompt>{{ promptText }}</template>

    <template #guidance>
      <KeyboardGuide
        v-if="showKeyboard && currentEntry"
        :target="keyboardTarget"
        :key-feedback="keyFeedback"
        :caps-lock-on="capsLockOn"
      />
    </template>
  </TrainingWorkspace>

  <SyllableLessonDrawer
    v-model:open="lessonDrawerOpen"
    :categories="manifest?.categories ?? []"
    :lessons="manifest?.lessons ?? []"
    :active-lesson-id="selectedSummary?.id ?? null"
    :loading-lesson-id="loadingLessonId"
    @select="selectLesson"
  />

  <TrainingSettingsDialog
    v-model:open="settingsOpen"
    v-model:show-keyboard="showKeyboard"
    v-model:text-scale="textScale"
    :show-hands="false"
    hide-hands
  />

  <SessionResultDialog
    v-model:open="resultOpen"
    :lesson-title="title"
    :stats="stats"
    :has-next-lesson="Boolean(nextLesson)"
    completion-label="音节课程完成"
    restart-label="重新练习"
    next-label="下一课"
    close-label="返回练习"
    @restart="restartTraining"
    @next="startNextLesson"
  />
</template>

<style scoped>
.header-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.position-label {
  margin-right: 4px;
  color: #718493;
  font-size: 0.78rem;
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

.state-card {
  display: grid;
  min-height: 190px;
  padding: 28px;
  place-items: center;
  align-content: center;
  gap: 8px;
  color: #536a7d;
  text-align: center;
  background: #fff;
  border: 1px solid #d8e3eb;
  border-radius: 18px;
}

.state-card > .pi {
  color: #168e80;
  font-size: 1.6rem;
}

.state-card small {
  color: #8494a1;
}

.error-card > .pi {
  color: #c45b4e;
}

@media (width <= 700px) {
  .header-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .position-label {
    margin: 0 0 2px;
  }
}
</style>
