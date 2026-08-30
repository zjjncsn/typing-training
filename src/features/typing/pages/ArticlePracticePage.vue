<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import type { ArticleManifest, ArticleSummary, TrainingArticle } from '../articles/types'
import { loadArticle, loadArticleManifest } from '../articles/articleRepository'
import ArticleDrawer from '../components/ArticleDrawer.vue'
import ArticleTypingText from '../components/ArticleTypingText.vue'
import SessionResultDialog from '../components/SessionResultDialog.vue'
import TrainingSettingsDialog from '../components/TrainingSettingsDialog.vue'
import TrainingWorkspace from '../components/TrainingWorkspace.vue'
import { useTypingEngine } from '../composables/useTypingEngine'
import { keyboardKeyToCharacter } from '../engine/typingEngine'

type TypingTextScale = 'small' | 'medium' | 'large'
type PauseReason = 'keyboard' | 'visibility'
type ArticleAttempt = { received: string; correct: boolean }

interface StoredArticlePosition {
  articleId: string
  position: number
}

const articlePositionStorageKey = 'typing-practice.article-position.v1'
const route = useRoute()
const router = useRouter()
const manifest = ref<ArticleManifest | null>(null)
const selectedSummary = ref<ArticleSummary | null>(null)
const article = ref<TrainingArticle | null>(null)
const loadingArticleId = ref<string | null>(null)
const loadError = ref<string | null>(null)
const articleDrawerOpen = ref(false)
const settingsOpen = ref(false)
const resultOpen = ref(false)
const textScale = ref<TypingTextScale>('medium')
const pauseReason = ref<PauseReason | null>(null)
const initialPosition = ref(0)
const attemptLog = ref<Record<number, ArticleAttempt>>({})
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
const pauseMessage = computed(() =>
  pauseReason.value === 'visibility' ? '离开页面，训练已自动暂停' : '训练已暂停',
)
const title = computed(
  () => article.value?.sourceName ?? selectedSummary.value?.sourceName ?? '正在加载文章',
)
const activeArticleIndex = computed(
  () => manifest.value?.articles.findIndex((item) => item.id === selectedSummary.value?.id) ?? -1,
)
const nextArticle = computed(() => manifest.value?.articles[activeArticleIndex.value + 1] ?? null)

function routeArticleId(): string | null {
  const value = route.params.articleId
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null)
}

function readStoredPosition(): StoredArticlePosition | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(articlePositionStorageKey) ?? 'null') as unknown
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('articleId' in parsed) ||
      !('position' in parsed) ||
      typeof parsed.articleId !== 'string' ||
      typeof parsed.position !== 'number' ||
      !Number.isFinite(parsed.position)
    ) {
      return null
    }

    return {
      articleId: parsed.articleId,
      position: Math.max(0, Math.trunc(parsed.position)),
    }
  } catch {
    return null
  }
}

function storePosition(articleId: string, position: number) {
  try {
    localStorage.setItem(
      articlePositionStorageKey,
      JSON.stringify({ articleId, position } satisfies StoredArticlePosition),
    )
  } catch {
    // Storage may be unavailable in private or restricted browser contexts.
  }
}

async function initializeArticles() {
  loadError.value = null
  try {
    const loadedManifest = await loadArticleManifest()
    manifest.value = loadedManifest
    const requestedId = routeArticleId()
    const stored = readStoredPosition()
    const preferredId = requestedId ?? stored?.articleId
    const summary =
      loadedManifest.articles.find((item) => item.id === preferredId) ??
      loadedManifest.articles.find((item) => item.id === loadedManifest.defaultArticleId) ??
      loadedManifest.articles[0]

    if (summary) {
      const resumePosition = stored?.articleId === summary.id ? stored.position : 0
      await selectArticle(summary, requestedId !== summary.id, resumePosition)
    }
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '文章清单加载失败。'
  }
}

async function selectArticle(summary: ArticleSummary, replaceRoute = true, resumePosition = 0) {
  if (article.value?.id === summary.id) return

  const generation = ++loadGeneration
  selectedSummary.value = summary
  article.value = null
  initialPosition.value = Math.min(resumePosition, Math.max(0, summary.characterCount - 1))
  loadingArticleId.value = summary.id
  loadError.value = null
  resultOpen.value = false
  clearAttemptLog()

  if (replaceRoute && routeArticleId() !== summary.id) {
    await router.replace({ name: 'english-article-practice', params: { articleId: summary.id } })
  }

  try {
    const loadedArticle = await loadArticle(summary)
    if (generation !== loadGeneration) return
    article.value = loadedArticle
  } catch (error) {
    if (generation !== loadGeneration) return
    loadError.value = error instanceof Error ? error.message : '文章加载失败。'
  } finally {
    if (generation === loadGeneration) loadingArticleId.value = null
  }
}

function retryLoading() {
  if (selectedSummary.value) void selectArticle(selectedSummary.value, false, initialPosition.value)
  else void initializeArticles()
}

function recordAttempt() {
  const attempt = session.value.lastAttempt
  if (!attempt) return
  attemptLog.value = {
    ...attemptLog.value,
    [attempt.position]: { received: attempt.received, correct: attempt.correct },
  }
}

function inputCharacter(character: string) {
  feedEngine(character)
  recordAttempt()
}

function handlePageKeydown(event: KeyboardEvent) {
  if (overlayOpen.value || !article.value) return

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

  event.preventDefault()
  inputCharacter(received)
}

function pruneAttemptLog() {
  attemptLog.value = Object.fromEntries(
    Object.entries(attemptLog.value).filter(([key]) => Number(key) < session.value.position),
  )
}

function clearAttemptLog() {
  attemptLog.value = {}
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
}

function restartTraining() {
  resultOpen.value = false
  restart()
  clearAttemptLog()
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
      if (article.value) storePosition(article.value.id, 0)
    }
    if (nextStatus !== 'paused') pauseReason.value = null
  },
)

watch([() => article.value?.id, () => session.value.position], ([articleId, position]) => {
  if (articleId && session.value.status !== 'completed') storePosition(articleId, position)
})

onMounted(() => {
  window.addEventListener('keydown', handlePageKeydown)
  document.addEventListener('visibilitychange', handleVisibilityChange)
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
    eyebrow="英文打字 · 文章练习"
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
      <ArticleTypingText
        v-else-if="article"
        :content="article.content"
        :position="session.position"
        :has-current-error="hasCurrentError"
        :scale="textScale"
        :attempt-results="attemptLog"
      />
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
    :active-article-id="selectedSummary?.id ?? null"
    :loading-article-id="loadingArticleId"
    @select="selectArticle"
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
