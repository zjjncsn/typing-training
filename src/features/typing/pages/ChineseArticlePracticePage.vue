<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import {
  articleResumePosition,
  createEmptyArticleProgress,
  markArticleCompleted,
  parseArticleProgress,
  recordArticlePosition,
  restartArticleProgress,
  type ArticleProgressState,
} from '../articles/articleProgress'
import {
  loadChineseArticle,
  loadChineseArticleManifest,
} from '../chineseArticles/chineseArticleRepository'
import type {
  ChineseArticleManifest,
  ChineseArticleSummary,
  ChineseTrainingArticle,
} from '../chineseArticles/types'
import ArticleDrawer from '../components/ArticleDrawer.vue'
import ArticleTypingText from '../components/ArticleTypingText.vue'
import SessionResultDialog from '../components/SessionResultDialog.vue'
import TrainingSettingsDialog from '../components/TrainingSettingsDialog.vue'
import TrainingWorkspace from '../components/TrainingWorkspace.vue'
import { useTypingEngine } from '../composables/useTypingEngine'

type TypingTextScale = 'small' | 'medium' | 'large'
type PauseReason = 'keyboard' | 'visibility'
type ArticleAttempt = { received: string; correct: boolean }

const progressStorageKey = 'typing-practice.chinese-article-progress.v1'
const route = useRoute()
const router = useRouter()
const manifest = ref<ChineseArticleManifest | null>(null)
const selectedSummary = ref<ChineseArticleSummary | null>(null)
const article = ref<ChineseTrainingArticle | null>(null)
const loadingArticleId = ref<string | null>(null)
const loadError = ref<string | null>(null)
const articleDrawerOpen = ref(false)
const settingsOpen = ref(false)
const resultOpen = ref(false)
const textScale = ref<TypingTextScale>('medium')
const pauseReason = ref<PauseReason | null>(null)
const initialPosition = ref(0)
const attemptLog = ref<Record<number, ArticleAttempt>>({})
const articleProgress = ref<ArticleProgressState>(createEmptyArticleProgress())
const composing = ref(false)
const compositionText = ref('')
const imeInput = ref<HTMLTextAreaElement | null>(null)
let loadGeneration = 0

const content = computed(() => article.value?.content ?? ' ')
const engineOptions = {
  caseSensitive: true,
  autoAdvanceWhitespace: false,
  autoAdvanceBlankLines: true,
}
const {
  session,
  stats,
  inputCharacter: feedEngine,
  backspace,
  pause,
  resume,
  restart,
} = useTypingEngine(content, engineOptions, initialPosition)

const status = computed(() => (article.value ? session.value.status : 'idle'))
const hasCurrentError = computed(
  () =>
    session.value.lastAttempt?.correct === false &&
    session.value.lastAttempt.position === session.value.position,
)
const overlayOpen = computed(
  () => articleDrawerOpen.value || settingsOpen.value || resultOpen.value,
)
const imeDisabled = computed(
  () => !article.value || overlayOpen.value || status.value === 'paused' || status.value === 'completed',
)
const pauseMessage = computed(() =>
  pauseReason.value === 'visibility' ? '离开页面，训练已自动暂停' : '训练已暂停',
)
const title = computed(() => selectedSummary.value?.title ?? '中文文章练习')
const activeArticleIndex = computed(
  () => manifest.value?.articles.findIndex((item) => item.id === selectedSummary.value?.id) ?? -1,
)
const nextArticle = computed(() => manifest.value?.articles[activeArticleIndex.value + 1] ?? null)

function routeArticleId(): string | null {
  const value = route.params.articleId
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null)
}

function persistProgress(nextProgress: ArticleProgressState) {
  if (nextProgress === articleProgress.value) return
  articleProgress.value = nextProgress
  try {
    localStorage.setItem(progressStorageKey, JSON.stringify(nextProgress))
  } catch {
    // Storage may be unavailable in private or restricted browser contexts.
  }
}

function initializeProgress() {
  try {
    articleProgress.value =
      parseArticleProgress(localStorage.getItem(progressStorageKey)) ??
      createEmptyArticleProgress()
  } catch {
    // Storage may be unavailable in private or restricted browser contexts.
  }
}

async function initializeArticles() {
  loadError.value = null
  try {
    const loadedManifest = await loadChineseArticleManifest()
    manifest.value = loadedManifest
    const requestedId = routeArticleId()
    const preferredId = requestedId ?? articleProgress.value.lastArticleId
    const summary =
      loadedManifest.articles.find((item) => item.id === preferredId) ??
      loadedManifest.articles.find((item) => item.id === loadedManifest.defaultArticleId) ??
      loadedManifest.articles[0]

    if (summary) {
      const resumePosition = articleResumePosition(
        articleProgress.value,
        summary.id,
        summary.characterCount,
      )
      await selectArticle(summary, requestedId !== summary.id, resumePosition)
    }
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '中文文章清单加载失败。'
  }
}

async function selectArticle(
  summary: ChineseArticleSummary,
  replaceRoute = true,
  resumePosition?: number,
) {
  if (article.value?.id === summary.id) return

  const generation = ++loadGeneration
  const nextPosition =
    resumePosition ??
    articleResumePosition(articleProgress.value, summary.id, summary.characterCount)
  selectedSummary.value = summary
  article.value = null
  initialPosition.value = Math.min(nextPosition, Math.max(0, summary.characterCount - 1))
  loadingArticleId.value = summary.id
  loadError.value = null
  resultOpen.value = false
  clearAttemptLog()

  if (replaceRoute && routeArticleId() !== summary.id) {
    await router.replace({ name: 'chinese-article-practice', params: { articleId: summary.id } })
  }

  try {
    const loadedArticle = await loadChineseArticle(summary)
    if (generation !== loadGeneration) return
    article.value = loadedArticle
  } catch (error) {
    if (generation !== loadGeneration) return
    loadError.value = error instanceof Error ? error.message : '中文文章加载失败。'
  } finally {
    if (generation === loadGeneration) loadingArticleId.value = null
  }
}

function retryLoading() {
  if (selectedSummary.value) void selectArticle(selectedSummary.value, false, initialPosition.value)
  else void initializeArticles()
}

function selectArticleById(articleId: string) {
  const summary = manifest.value?.articles.find((item) => item.id === articleId)
  if (summary) void selectArticle(summary)
}

function recordAttempt() {
  const attempt = session.value.lastAttempt
  if (!attempt) return
  attemptLog.value = {
    ...attemptLog.value,
    [attempt.position]: { received: attempt.received, correct: attempt.correct },
  }
}

function inputCharacter(character: string, timestamp = Date.now()) {
  feedEngine(character, timestamp)
  recordAttempt()
}

function commitText(text: string) {
  if (imeDisabled.value) return
  const timestamp = Date.now()
  for (const character of Array.from(text)) inputCharacter(character, timestamp)
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

  if (event.key === 'Enter') {
    event.preventDefault()
    inputCharacter('\n')
    return
  }

  if (event.key !== 'Backspace') return
  const target = event.target as HTMLTextAreaElement
  if (target.value) return
  event.preventDefault()
  backspace()
  pruneAttemptLog()
}

function handlePageKeydown(event: KeyboardEvent) {
  if (composing.value || event.isComposing || overlayOpen.value || !article.value) return

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
  attemptLog.value = Object.fromEntries(
    Object.entries(attemptLog.value).filter(([key]) => Number(key) < session.value.position),
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
  if (article.value) {
    persistProgress(restartArticleProgress(articleProgress.value, article.value.id))
  }
  restart()
  clearAttemptLog()
  focusImeInput()
}

function openNextArticle() {
  if (nextArticle.value) void selectArticle(nextArticle.value)
}

function handleVisibilityChange() {
  if (document.visibilityState === 'hidden') pauseTraining('visibility')
}

watch(
  () => route.params.articleId,
  () => {
    if (!manifest.value) return
    const requestedId = routeArticleId()
    if (!requestedId || requestedId === selectedSummary.value?.id) return
    const summary = manifest.value.articles.find((item) => item.id === requestedId)
    if (summary) void selectArticle(summary, false)
  },
)

watch(
  () => session.value.status,
  (nextStatus) => {
    if (nextStatus === 'completed') {
      resultOpen.value = true
      if (article.value) {
        persistProgress(
          markArticleCompleted(
            articleProgress.value,
            article.value.id,
            Array.from(article.value.content).length,
          ),
        )
      }
    }
    if (nextStatus !== 'paused') pauseReason.value = null
  },
)

watch([() => article.value?.id, () => session.value.position], ([articleId, position]) => {
  if (!articleId || !article.value || session.value.status === 'completed') return
  persistProgress(
    recordArticlePosition(
      articleProgress.value,
      articleId,
      position,
      Array.from(article.value.content).length,
    ),
  )
  void nextTick(focusImeInput)
})

watch(imeDisabled, (disabled) => {
  if (!disabled) void nextTick(focusImeInput)
})

onMounted(() => {
  window.addEventListener('keydown', handlePageKeydown)
  document.addEventListener('visibilitychange', handleVisibilityChange)
  initializeProgress()
  void initializeArticles()
})

onBeforeUnmount(() => {
  loadGeneration += 1
  window.removeEventListener('keydown', handlePageKeydown)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})
</script>

<template>
  <TrainingWorkspace
    eyebrow="拼音打字 · 文章练习"
    :title="title"
    :status="status"
    :stats="stats"
    :show-guidance="false"
    :show-prompt="false"
    :pause-message="pauseMessage"
  >
    <template #lesson-picker>
      <div class="header-actions">
        <span v-if="article" class="position-label">
          第 {{ session.position + 1 }} / {{ Array.from(article.content).length }} 字符
        </span>
        <button type="button" class="header-button" @click="articleDrawerOpen = true">
          选择文章
        </button>
        <button type="button" class="header-button icon-button" @click="settingsOpen = true">
          设置
        </button>
      </div>
    </template>

    <template #actions>
      <button v-if="status === 'running'" type="button" @click="pauseTraining()">暂停</button>
      <button v-else-if="status === 'paused'" type="button" @click="resumeTraining()">继续</button>
      <button v-if="article" type="button" class="secondary" @click="restartTraining">
        重新练习
      </button>
    </template>

    <template #content>
      <div v-if="loadingArticleId" class="state-card" role="status">
        <span class="pi pi-spin pi-spinner" aria-hidden="true" />
        <strong>正在加载 {{ selectedSummary?.title }}</strong>
        <small>只会下载当前选择的文章。</small>
      </div>
      <div v-else-if="loadError" class="state-card error-card" role="alert">
        <span class="pi pi-exclamation-circle" aria-hidden="true" />
        <strong>文章加载失败</strong>
        <small>{{ loadError }}</small>
        <button type="button" @click="retryLoading">重新加载</button>
      </div>
      <div v-else-if="article" class="ime-practice" @click="focusImeInput">
        <ArticleTypingText
          language="chinese"
          :content="article.content"
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
              aria-label="中文文章输入区"
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
        </ArticleTypingText>
      </div>
      <div v-else class="state-card">
        <span class="pi pi-file-edit" aria-hidden="true" />
        <strong>选择一篇文章开始练习</strong>
      </div>
    </template>
  </TrainingWorkspace>

  <ArticleDrawer
    v-model:open="articleDrawerOpen"
    :categories="manifest?.categories ?? []"
    :articles="manifest?.articles ?? []"
    :progress="articleProgress"
    :active-article-id="selectedSummary?.id ?? null"
    :loading-article-id="loadingArticleId"
    @select="selectArticleById"
  />

  <TrainingSettingsDialog
    v-model:open="settingsOpen"
    v-model:text-scale="textScale"
    :show-keyboard="false"
    :show-hands="false"
    hide-keyboard
    hide-hands
  />

  <SessionResultDialog
    v-model:open="resultOpen"
    :lesson-title="title"
    :stats="stats"
    :has-next-lesson="Boolean(nextArticle)"
    completion-label="文章完成"
    restart-label="重新练习"
    next-label="下一篇"
    close-label="返回练习"
    @restart="restartTraining"
    @next="openNextArticle"
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
  min-height: 360px;
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
