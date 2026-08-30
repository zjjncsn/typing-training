<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import DictionaryDrawer from '../components/DictionaryDrawer.vue'
import KeyboardGuide from '../components/KeyboardGuide.vue'
import SessionResultDialog from '../components/SessionResultDialog.vue'
import TrainingSettingsDialog from '../components/TrainingSettingsDialog.vue'
import TrainingWorkspace from '../components/TrainingWorkspace.vue'
import WordExplanationPanel from '../components/WordExplanationPanel.vue'
import WordTypingText from '../components/WordTypingText.vue'
import { useWordPracticeEngine } from '../composables/useWordPracticeEngine'
import { loadDictionary, loadDictionaryManifest } from '../dictionaries/dictionaryRepository'
import type {
  DictionaryEntry,
  DictionaryManifest,
  DictionarySummary,
  WordDictionary,
} from '../dictionaries/types'
import { keyboardKeyToCharacter } from '../engine/typingEngine'
import { resolveKeyFeedback } from '../keyboard/keyboardFeedback'
import { fingerLabels, getFingerForCode, resolveKeyboardTarget } from '../keyboard/qwertyLayout'
import type { KeyFeedback } from '../keyboard/types'

type TypingTextScale = 'small' | 'medium' | 'large'
type PauseReason = 'keyboard' | 'visibility'
type WordAttempt = { received: string; correct: boolean }
type StoredWordPosition = { dictionaryId: string; wordIndex: number }

const wordPositionStorageKey = 'typing-practice.word-position.v1'
const route = useRoute()
const router = useRouter()

const manifest = ref<DictionaryManifest | null>(null)
const selectedSummary = ref<DictionarySummary | null>(null)
const dictionary = ref<WordDictionary | null>(null)
const loadingDictionaryId = ref<string | null>(null)
const loadError = ref<string | null>(null)
const initialWordIndex = ref(0)
const dictionaryDrawerOpen = ref(false)
const settingsOpen = ref(false)
const resultOpen = ref(false)
const showKeyboard = ref(true)
const showExplanation = ref(true)
const textScale = ref<TypingTextScale>('medium')
const keyFeedback = ref<Record<string, KeyFeedback>>({})
const attemptLog = ref<Record<number, WordAttempt>>({})
const pauseReason = ref<PauseReason | null>(null)
const capsLockOn = ref(false)
const feedbackTimers = new Map<string, ReturnType<typeof setTimeout>>()
let loadGeneration = 0

const entries = computed<DictionaryEntry[]>(() => dictionary.value?.entries ?? [])
const words = computed(() => entries.value.map((entry) => entry.word))

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
  () => dictionaryDrawerOpen.value || settingsOpen.value || resultOpen.value,
)
const title = computed(() => selectedSummary.value?.name ?? '单词练习')
const pauseMessage = computed(() =>
  pauseReason.value === 'visibility' ? '离开页面，训练已自动暂停' : '训练已暂停',
)
const promptText = computed(() => {
  if (loadError.value) return loadError.value
  if (loadingDictionaryId.value) return '正在下载所选词典，请稍候。'
  if (!currentEntry.value) return '请选择词典开始练习。'
  if (status.value === 'completed') return '当前词典已经完成。'
  if (hasCurrentError.value) return '按键不正确，请重新输入当前字符。'
  if (!keyboardTarget.value) return '请按照提示继续输入。'

  const character = keyboardTarget.value.character === ' ' ? '空格' : keyboardTarget.value.character
  const shift = keyboardTarget.value.shiftFinger
    ? `，同时按住${fingerLabels[keyboardTarget.value.shiftFinger]} Shift`
    : ''
  return `请使用${fingerLabels[keyboardTarget.value.finger]}输入 ${character}${shift}`
})

function queryDictionaryId(): string | null {
  const value = route.query.dictionary
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null)
}

function readStoredPosition(): StoredWordPosition | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(wordPositionStorageKey) ?? 'null') as unknown
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('dictionaryId' in parsed) ||
      !('wordIndex' in parsed) ||
      typeof parsed.dictionaryId !== 'string' ||
      typeof parsed.wordIndex !== 'number' ||
      !Number.isFinite(parsed.wordIndex)
    ) {
      return null
    }

    return {
      dictionaryId: parsed.dictionaryId,
      wordIndex: Math.max(0, Math.trunc(parsed.wordIndex)),
    }
  } catch {
    return null
  }
}

function storePosition(dictionaryId: string, wordIndex: number) {
  try {
    localStorage.setItem(
      wordPositionStorageKey,
      JSON.stringify({ dictionaryId, wordIndex } satisfies StoredWordPosition),
    )
  } catch {
    // Storage may be unavailable in private or restricted browser contexts.
  }
}

async function initializeDictionaries() {
  loadError.value = null
  try {
    const loadedManifest = await loadDictionaryManifest()
    manifest.value = loadedManifest
    const requestedId = queryDictionaryId()
    const storedPosition = readStoredPosition()
    const preferredId = requestedId ?? storedPosition?.dictionaryId
    const summary =
      loadedManifest.dictionaries.find((item) => item.id === preferredId) ??
      loadedManifest.dictionaries.find((item) => item.id === loadedManifest.defaultDictionaryId) ??
      loadedManifest.dictionaries[0]

    if (summary) {
      const resumeIndex = storedPosition?.dictionaryId === summary.id ? storedPosition.wordIndex : 0
      await selectDictionary(summary, requestedId !== summary.id, resumeIndex)
    }
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '词典清单加载失败。'
  }
}

async function selectDictionary(summary: DictionarySummary, replaceRoute = true, resumeIndex = 0) {
  if (dictionary.value?.id === summary.id) return

  const generation = ++loadGeneration
  selectedSummary.value = summary
  dictionary.value = null
  initialWordIndex.value = resumeIndex
  resultOpen.value = false
  loadError.value = null
  loadingDictionaryId.value = summary.id
  clearAttemptLog()
  clearKeyFeedback()

  if (replaceRoute && queryDictionaryId() !== summary.id) {
    await router.replace({ name: 'english-word-practice', query: { dictionary: summary.id } })
  }

  try {
    const loadedDictionary = await loadDictionary(summary)
    if (generation !== loadGeneration) return
    dictionary.value = loadedDictionary
  } catch (error) {
    if (generation !== loadGeneration) return
    loadError.value = error instanceof Error ? error.message : '词典加载失败。'
  } finally {
    if (generation === loadGeneration) loadingDictionaryId.value = null
  }
}

function retryLoading() {
  if (selectedSummary.value) void selectDictionary(selectedSummary.value, false)
  else void initializeDictionaries()
}

function inputCharacter(character: string, timestamp = Date.now(), correctOverride?: boolean) {
  const previousWordIndex = practice.value?.wordIndex
  feedEngine(character, timestamp, correctOverride)

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

function handleVisibilityChange() {
  if (document.visibilityState === 'hidden') pauseTraining('visibility')
}

watch(
  () => route.query.dictionary,
  () => {
    if (!manifest.value) return
    const requestedId = queryDictionaryId()
    if (!requestedId || requestedId === selectedSummary.value?.id) return
    const summary = manifest.value.dictionaries.find((item) => item.id === requestedId)
    if (summary) void selectDictionary(summary, false)
  },
)

watch(
  () => session.value?.status,
  (nextStatus) => {
    if (nextStatus === 'completed') resultOpen.value = true
    if (nextStatus !== 'paused') pauseReason.value = null
  },
)

watch(
  [() => dictionary.value?.id, () => practice.value?.wordIndex],
  ([dictionaryId, wordIndex]) => {
    if (dictionaryId && wordIndex !== undefined) storePosition(dictionaryId, wordIndex)
  },
)

onMounted(() => {
  window.addEventListener('keydown', handlePageKeydown)
  window.addEventListener('keyup', handlePageKeyup)
  window.addEventListener('blur', clearKeyFeedback)
  document.addEventListener('visibilitychange', handleVisibilityChange)
  void initializeDictionaries()
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
    eyebrow="英文打字 · 单词练习"
    :title="title"
    :status="status"
    :stats="stats"
    show-wpm
    :show-guidance="Boolean(currentEntry && showKeyboard)"
    :show-aside="Boolean(currentEntry && showExplanation)"
    :pause-message="pauseMessage"
  >
    <template #lesson-picker>
      <div class="header-actions">
        <span v-if="dictionary" class="position-label">
          第 {{ (practice?.wordIndex ?? 0) + 1 }} / {{ entries.length }} 词
        </span>
        <button type="button" class="header-button" @click="dictionaryDrawerOpen = true">
          选择词典
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
      <div v-if="loadingDictionaryId" class="state-card" role="status">
        <span class="pi pi-spin pi-spinner" aria-hidden="true" />
        <strong>正在加载 {{ title }}</strong>
        <small>只会下载当前选择的词典。</small>
      </div>
      <div v-else-if="loadError" class="state-card error-card" role="alert">
        <span class="pi pi-exclamation-circle" aria-hidden="true" />
        <strong>词典加载失败</strong>
        <small>{{ loadError }}</small>
        <button type="button" @click="retryLoading">重新加载</button>
      </div>
      <template v-else-if="currentEntry && session">
        <WordTypingText
          :words="words"
          :word-index="practice?.wordIndex ?? 0"
          :position="session.position"
          :has-current-error="hasCurrentError"
          :scale="textScale"
          :attempt-results="attemptLog"
        />
      </template>
      <div v-else class="state-card">
        <span class="pi pi-book" aria-hidden="true" />
        <strong>选择一本词典开始练习</strong>
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

    <template #aside>
      <WordExplanationPanel v-if="currentEntry" :entry="currentEntry" />
    </template>
  </TrainingWorkspace>

  <DictionaryDrawer
    v-model:open="dictionaryDrawerOpen"
    :dictionaries="manifest?.dictionaries ?? []"
    :active-dictionary-id="selectedSummary?.id ?? null"
    :loading-dictionary-id="loadingDictionaryId"
    @select="selectDictionary"
  />

  <TrainingSettingsDialog
    v-model:open="settingsOpen"
    v-model:show-keyboard="showKeyboard"
    v-model:show-explanation="showExplanation"
    v-model:text-scale="textScale"
    :show-hands="false"
    enable-explanation
    hide-hands
  />

  <SessionResultDialog
    v-model:open="resultOpen"
    :lesson-title="title"
    :stats="stats"
    :has-next-lesson="false"
    completion-label="词典完成"
    restart-label="重新练习"
    close-label="返回练习"
    @restart="restartTraining"
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
