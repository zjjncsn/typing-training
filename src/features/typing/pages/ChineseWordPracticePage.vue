<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import {
  loadChineseWordLesson,
  loadChineseWordManifest,
} from '../chineseWords/chineseWordRepository'
import type {
  ChineseWordLesson,
  ChineseWordLessonSummary,
  ChineseWordManifest,
} from '../chineseWords/types'
import ChineseWordLessonDrawer from '../components/ChineseWordLessonDrawer.vue'
import ChineseWordTypingText from '../components/ChineseWordTypingText.vue'
import SessionResultDialog from '../components/SessionResultDialog.vue'
import TrainingSettingsDialog from '../components/TrainingSettingsDialog.vue'
import TrainingWorkspace from '../components/TrainingWorkspace.vue'
import { useWordPracticeEngine } from '../composables/useWordPracticeEngine'

type TypingTextScale = 'small' | 'medium' | 'large'
type PauseReason = 'keyboard' | 'visibility'
type CharacterAttempt = { received: string; correct: boolean }
type StoredWordPosition = { lessonId: string; wordIndex: number }

const positionStorageKey = 'typing-practice.chinese-word-position.v1'
const route = useRoute()
const router = useRouter()

const manifest = ref<ChineseWordManifest | null>(null)
const selectedSummary = ref<ChineseWordLessonSummary | null>(null)
const lesson = ref<ChineseWordLesson | null>(null)
const loadingLessonId = ref<string | null>(null)
const loadError = ref<string | null>(null)
const initialWordIndex = ref(0)
const lessonDrawerOpen = ref(false)
const settingsOpen = ref(false)
const resultOpen = ref(false)
const textScale = ref<TypingTextScale>('medium')
const attemptLog = ref<Record<number, CharacterAttempt>>({})
const pauseReason = ref<PauseReason | null>(null)
const composing = ref(false)
const compositionText = ref('')
const imeInput = ref<HTMLTextAreaElement | null>(null)
const typingText = ref<InstanceType<typeof ChineseWordTypingText> | null>(null)
let loadGeneration = 0

const words = computed(() => lesson.value?.words ?? [])
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
} = useWordPracticeEngine(words, initialWordIndex)

const currentWord = computed(() => words.value[practice.value?.wordIndex ?? 0] ?? null)
const status = computed(() => session.value?.status ?? 'idle')
const hasCurrentError = computed(
  () =>
    session.value?.lastAttempt?.correct === false &&
    session.value.lastAttempt.position === session.value.position,
)
const overlayOpen = computed(
  () => lessonDrawerOpen.value || settingsOpen.value || resultOpen.value,
)
const imeDisabled = computed(
  () => !lesson.value || overlayOpen.value || status.value === 'paused' || status.value === 'completed',
)
const title = computed(() => selectedSummary.value?.title ?? '词汇练习')
const pauseMessage = computed(() =>
  pauseReason.value === 'visibility' ? '离开页面，训练已自动暂停' : '训练已暂停',
)
const promptText = computed(() => {
  if (loadError.value) return loadError.value
  if (loadingLessonId.value) return '正在加载所选词汇课程，请稍候。'
  if (!currentWord.value) return '请选择词汇课程开始练习。'
  if (status.value === 'completed') return '当前词汇课程已经完成。'
  if (hasCurrentError.value) return '输入不正确，请使用 Backspace 清除后重新输入。'
  if (composing.value) return '正在通过输入法选择候选词。'
  return '请使用系统中文输入法输入当前词汇。'
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

function readStoredPosition(): StoredWordPosition | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(positionStorageKey) ?? 'null') as unknown
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('lessonId' in parsed) ||
      !('wordIndex' in parsed) ||
      typeof parsed.lessonId !== 'string' ||
      typeof parsed.wordIndex !== 'number' ||
      !Number.isFinite(parsed.wordIndex)
    ) {
      return null
    }
    return { lessonId: parsed.lessonId, wordIndex: Math.max(0, Math.trunc(parsed.wordIndex)) }
  } catch {
    return null
  }
}

function storePosition(lessonId: string, wordIndex: number) {
  try {
    localStorage.setItem(positionStorageKey, JSON.stringify({ lessonId, wordIndex }))
  } catch {
    // Storage may be unavailable in private or restricted browser contexts.
  }
}

async function initializeLessons() {
  loadError.value = null
  try {
    const loadedManifest = await loadChineseWordManifest()
    manifest.value = loadedManifest
    const requestedId = routeLessonId()
    const stored = readStoredPosition()
    const preferredId = requestedId ?? stored?.lessonId
    const summary =
      loadedManifest.lessons.find((item) => item.id === preferredId) ??
      loadedManifest.lessons.find((item) => item.id === loadedManifest.defaultLessonId) ??
      loadedManifest.lessons[0]

    if (summary) {
      const resumeIndex = stored?.lessonId === summary.id ? stored.wordIndex : 0
      await selectLesson(summary, requestedId !== summary.id, resumeIndex)
    }
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '词汇课程清单加载失败。'
  }
}

async function selectLesson(
  summary: ChineseWordLessonSummary,
  replaceRoute = true,
  resumeIndex = 0,
) {
  if (lesson.value?.id === summary.id) return

  const generation = ++loadGeneration
  selectedSummary.value = summary
  lesson.value = null
  initialWordIndex.value = Math.min(resumeIndex, Math.max(0, summary.wordCount - 1))
  resultOpen.value = false
  loadError.value = null
  loadingLessonId.value = summary.id
  clearAttemptLog()

  if (replaceRoute && routeLessonId() !== summary.id) {
    await router.replace({ name: 'chinese-word-practice', params: { lessonId: summary.id } })
  }

  try {
    const loadedLesson = await loadChineseWordLesson(summary)
    if (generation !== loadGeneration) return
    lesson.value = loadedLesson
  } catch (error) {
    if (generation !== loadGeneration) return
    loadError.value = error instanceof Error ? error.message : '词汇课程加载失败。'
  } finally {
    if (generation === loadGeneration) loadingLessonId.value = null
  }
}

function retryLoading() {
  if (selectedSummary.value) void selectLesson(selectedSummary.value, false)
  else void initializeLessons()
}

function inputCharacter(character: string, timestamp = Date.now()) {
  const previousWordIndex = practice.value?.wordIndex
  feedEngine(character, timestamp)

  if (practice.value?.wordIndex !== previousWordIndex) {
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

function commitText(text: string) {
  if (imeDisabled.value) return
  const timestamp = Date.now()
  for (const character of Array.from(text)) {
    inputCharacter(character, timestamp)
  }
}

function focusImeInput() {
  if (!imeDisabled.value) imeInput.value?.focus({ preventScroll: true })
}

function commitImeValue(target: HTMLTextAreaElement) {
  const value = target.value
  target.value = ''
  if (value) commitText(value)
}

function handleCompositionStart(event: CompositionEvent) {
  composing.value = true
  compositionText.value = (event.target as HTMLTextAreaElement).value
}

function handleCompositionUpdate(event: CompositionEvent) {
  compositionText.value = event.data || (event.target as HTMLTextAreaElement).value
}

function handleCompositionEnd(event: CompositionEvent) {
  composing.value = false
  compositionText.value = ''
  commitImeValue(event.target as HTMLTextAreaElement)
}

function handleImeInput(event: InputEvent) {
  if (composing.value || event.isComposing) {
    compositionText.value = (event.target as HTMLTextAreaElement).value
    return
  }
  commitImeValue(event.target as HTMLTextAreaElement)
}

function handleImeKeydown(event: KeyboardEvent) {
  if (event.isComposing || composing.value) return

  if (
    event.key === 'Enter' &&
    expectedCharacter.value === ' ' &&
    typingText.value?.isCurrentWordAtLineEnd()
  ) {
    event.preventDefault()
    inputCharacter(' ')
    return
  }

  if (event.key !== 'Backspace') return
  const target = event.target as HTMLTextAreaElement
  if (target.value) return
  event.preventDefault()
  handleBackspace()
}

function handleBackspace() {
  if (imeDisabled.value) return
  backspace()
  pruneAttemptLog()
}

function handlePageKeydown(event: KeyboardEvent) {
  if (composing.value || event.isComposing || overlayOpen.value || !session.value) return

  if (event.key === 'Escape') {
    event.preventDefault()
    if (status.value === 'running') pauseTraining('keyboard')
    return
  }

  if (status.value === 'paused') {
    if (event.ctrlKey || event.metaKey || event.altKey) return
    event.preventDefault()
    resumeTraining()
  }
}

function pruneAttemptLog() {
  const position = session.value?.position ?? 0
  attemptLog.value = Object.fromEntries(
    Object.entries(attemptLog.value).filter(([key]) => Number(key) < position),
  )
}

function clearAttemptLog() {
  attemptLog.value = {}
  compositionText.value = ''
}

function pauseTraining(reason: PauseReason = 'keyboard') {
  if (status.value !== 'running') return
  pauseReason.value = reason
  pause()
}

function resumeTraining() {
  if (status.value !== 'paused') return
  resume()
  pauseReason.value = null
  focusImeInput()
}

function restartTraining() {
  resultOpen.value = false
  restart()
  clearAttemptLog()
  focusImeInput()
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

watch([() => lesson.value?.id, () => practice.value?.wordIndex], ([lessonId, wordIndex]) => {
  if (lessonId && wordIndex !== undefined) storePosition(lessonId, wordIndex)
  void nextTick(focusImeInput)
})

watch(
  () => session.value?.position,
  () => void nextTick(focusImeInput),
)

watch(imeDisabled, (disabled) => {
  if (!disabled) void nextTick(focusImeInput)
})

onMounted(() => {
  window.addEventListener('keydown', handlePageKeydown)
  document.addEventListener('visibilitychange', handleVisibilityChange)
  void initializeLessons()
})

onBeforeUnmount(() => {
  loadGeneration += 1
  window.removeEventListener('keydown', handlePageKeydown)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})
</script>

<template>
  <TrainingWorkspace
    eyebrow="拼音打字 · 词汇练习"
    :title="title"
    :status="status"
    :stats="stats"
    :show-guidance="false"
    :pause-message="pauseMessage"
  >
    <template #lesson-picker>
      <div class="header-actions">
        <span v-if="lesson" class="position-label">
          第 {{ (practice?.wordIndex ?? 0) + 1 }} / {{ words.length }} 词
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
      <div v-else-if="currentWord && session" class="ime-practice" @click="focusImeInput">
        <ChineseWordTypingText
          ref="typingText"
          :words="words"
          :word-index="practice?.wordIndex ?? 0"
          :position="session.position"
          :has-current-error="hasCurrentError"
          :composition-text="compositionText"
          :scale="textScale"
          :attempt-results="attemptLog"
        >
          <template #ime-anchor>
            <textarea
              ref="imeInput"
              class="ime-capture"
              aria-label="中文输入区"
              lang="zh-CN"
              autocomplete="off"
              autocapitalize="off"
              spellcheck="false"
              :disabled="imeDisabled"
              @compositionstart="handleCompositionStart"
              @compositionupdate="handleCompositionUpdate"
              @compositionend="handleCompositionEnd"
              @input="handleImeInput"
              @keydown="handleImeKeydown"
              @paste.prevent
            />
          </template>
        </ChineseWordTypingText>
      </div>
      <div v-else class="state-card">
        <span class="pi pi-list-check" aria-hidden="true" />
        <strong>选择词汇课程开始练习</strong>
      </div>
    </template>

    <template #prompt>{{ promptText }}</template>
  </TrainingWorkspace>

  <ChineseWordLessonDrawer
    v-model:open="lessonDrawerOpen"
    :categories="manifest?.categories ?? []"
    :lessons="manifest?.lessons ?? []"
    :active-lesson-id="selectedSummary?.id ?? null"
    :loading-lesson-id="loadingLessonId"
    @select="selectLesson"
  />

  <TrainingSettingsDialog
    v-model:open="settingsOpen"
    :show-keyboard="false"
    :show-hands="false"
    v-model:text-scale="textScale"
    hide-keyboard
    hide-hands
  />

  <SessionResultDialog
    v-model:open="resultOpen"
    :lesson-title="title"
    :stats="stats"
    :has-next-lesson="Boolean(nextLesson)"
    completion-label="词汇课程完成"
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

.ime-practice {
  cursor: text;
}

.ime-capture {
  position: absolute;
  z-index: 0;
  top: 0;
  left: 0;
  width: 1em;
  height: 1.6em;
  padding: 0;
  overflow: hidden;
  color: transparent;
  font: inherit;
  line-height: inherit;
  caret-color: transparent;
  resize: none;
  background: transparent;
  border: 0;
  opacity: 0;
  pointer-events: none;
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
