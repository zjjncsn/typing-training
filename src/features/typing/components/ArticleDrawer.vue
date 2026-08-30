<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import {
  articleProgressPercentage,
  type ArticleProgressEntry,
  type ArticleProgressState,
} from '../articles/articleProgress'
import type { ArticleCategory, ArticleCategorySummary, ArticleSummary } from '../articles/types'

const props = defineProps<{
  open: boolean
  categories: ArticleCategorySummary[]
  articles: ArticleSummary[]
  progress: ArticleProgressState
  activeArticleId: string | null
  loadingArticleId?: string | null
}>()

const emit = defineEmits<{
  'update:open': [open: boolean]
  select: [article: ArticleSummary]
}>()

const searchQuery = ref('')
const expandedCategories = ref<ArticleCategory[]>([])
const normalizedQuery = computed(() => searchQuery.value.trim().toLocaleLowerCase('zh-CN'))
const searching = computed(() => normalizedQuery.value.length > 0)

const groups = computed(() =>
  props.categories
    .map((category) => {
      const allArticles = props.articles.filter((article) => article.category === category.id)
      const articles = normalizedQuery.value
        ? allArticles.filter((article) =>
            [article.title, article.sourceName, article.excerpt].some((value) =>
              value.toLocaleLowerCase('zh-CN').includes(normalizedQuery.value),
            ),
          )
        : allArticles

      return {
        ...category,
        articles,
        totalCount: allArticles.length,
        completedCount: allArticles.filter(
          (article) => props.progress.articles[article.id]?.completed,
        ).length,
      }
    })
    .filter((group) => group.articles.length > 0),
)

function close() {
  emit('update:open', false)
}

function selectArticle(article: ArticleSummary) {
  emit('select', article)
  close()
}

function toggleCategory(category: ArticleCategory) {
  expandedCategories.value = expandedCategories.value.includes(category)
    ? expandedCategories.value.filter((item) => item !== category)
    : [...expandedCategories.value, category]
}

function isExpanded(category: ArticleCategory): boolean {
  return searching.value || expandedCategories.value.includes(category)
}

function formatLength(count: number): string {
  return `${count.toLocaleString('zh-CN')} 字符`
}

function progressEntry(articleId: string): ArticleProgressEntry | undefined {
  return props.progress.articles[articleId]
}

function progressPercent(article: ArticleSummary): number {
  return articleProgressPercentage(progressEntry(article.id), article.characterCount)
}

function progressLabel(article: ArticleSummary): string {
  const entry = progressEntry(article.id)
  if (entry?.completed) return '已完成'
  if (entry && entry.position > 0)
    return `继续 · ${Math.max(1, Math.floor(progressPercent(article)))}%`
  return '未开始'
}

function progressClass(article: ArticleSummary): string {
  const entry = progressEntry(article.id)
  if (entry?.completed) return 'completed'
  if (entry && entry.position > 0) return 'in-progress'
  return 'not-started'
}

function handleEscape(event: KeyboardEvent) {
  if (event.key === 'Escape') close()
}

watch(
  () => props.open,
  (open) => {
    if (!open) return
    const activeCategory = props.articles.find(
      (article) => article.id === props.activeArticleId,
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
        <aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="article-title">
          <header>
            <div>
              <p>文章练习</p>
              <h2 id="article-title">选择文章</h2>
            </div>
            <button type="button" class="close-button" aria-label="关闭文章选择" @click="close">
              ×
            </button>
          </header>

          <label class="search-field">
            <span class="pi pi-search" aria-hidden="true" />
            <input v-model="searchQuery" type="search" placeholder="搜索标题、文件名或正文" />
          </label>

          <p v-if="searching" class="search-summary">找到 {{ groups.length }} 个分类中的匹配文章</p>

          <section v-for="group in groups" :key="group.id" class="article-group">
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
              <small>{{ group.completedCount }} / {{ group.totalCount }} 已完成</small>
            </button>

            <ul v-if="isExpanded(group.id)">
              <li v-for="item in group.articles" :key="item.id">
                <button
                  type="button"
                  class="article-item"
                  :class="{ active: item.id === activeArticleId }"
                  :aria-current="item.id === activeArticleId ? 'page' : undefined"
                  @click="selectArticle(item)"
                >
                  <span class="article-icon"><span class="pi pi-file-edit" /></span>
                  <span class="article-copy">
                    <span class="title-row">
                      <strong>{{ item.title }}</strong>
                      <small>{{ item.sourceName }} · {{ formatLength(item.characterCount) }}</small>
                    </span>
                    <small class="excerpt">{{ item.excerpt }}</small>
                    <span v-if="progressPercent(item) > 0" class="item-progress" aria-hidden="true">
                      <span :style="{ width: `${progressPercent(item)}%` }" />
                    </span>
                  </span>
                  <span v-if="item.id === loadingArticleId" class="article-state loading">
                    加载中
                  </span>
                  <span v-else-if="item.id === activeArticleId" class="article-state current">
                    当前
                  </span>
                  <span v-else class="article-state" :class="progressClass(item)">
                    {{ progressLabel(item) }}
                  </span>
                </button>
              </li>
            </ul>
          </section>

          <div v-if="groups.length === 0" class="empty-search">
            <span class="pi pi-search" aria-hidden="true" />
            <strong>没有找到匹配的文章</strong>
            <small>可以尝试文章编号、原文件名或正文关键词。</small>
          </div>
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
  width: min(520px, calc(100% - 28px));
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

.search-field {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 10px 12px;
  color: #788b99;
  background: #fff;
  border: 1px solid #d6e2e8;
  border-radius: 11px;
}

.search-field:focus-within {
  border-color: #48aa9d;
  box-shadow: 0 0 0 3px rgb(22 142 128 / 10%);
}

.search-field input {
  width: 100%;
  min-width: 0;
  color: #334b61;
  background: transparent;
  border: 0;
  outline: 0;
  font: inherit;
}

.search-summary {
  margin: 9px 2px 0;
  color: #7b8d9b;
  font-size: 0.72rem;
}

.article-group {
  margin-top: 12px;
}

.group-header {
  display: grid;
  grid-template-columns: 16px 1fr auto;
  align-items: center;
  gap: 7px;
  width: 100%;
  padding: 10px 8px;
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

.group-header strong {
  font-size: 0.84rem;
}

.group-header small {
  color: #8394a2;
  font-size: 0.7rem;
}

ul {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.article-item {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) auto;
  align-items: center;
  gap: 11px;
  width: 100%;
  padding: 11px 12px;
  color: #40566c;
  text-align: left;
  cursor: pointer;
  background: #fff;
  border: 1px solid #d8e3e9;
  border-radius: 12px;
}

.article-icon {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  color: #168e80;
  background: #e5f4f1;
  border-radius: 9px;
}

.article-copy {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.title-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.title-row strong {
  flex: 0 0 auto;
  font-size: 0.88rem;
}

.title-row small,
.excerpt,
.article-state {
  overflow: hidden;
  color: #8393a2;
  font-size: 0.66rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.excerpt {
  display: block;
}

.item-progress {
  width: 100%;
  height: 3px;
  overflow: hidden;
  background: #e5edf1;
  border-radius: 999px;
}

.item-progress > span {
  display: block;
  height: 100%;
  background: #32aa9b;
  border-radius: inherit;
}

.article-item.active {
  border-color: #168e80;
  box-shadow: 0 0 0 2px rgb(22 142 128 / 12%);
}

.article-state {
  padding: 4px 6px;
  border-radius: 999px;
}

.article-state.current,
.article-state.in-progress {
  color: #168e80;
  background: #e8f6f3;
  font-weight: 700;
}

.article-state.completed {
  color: #397b55;
  background: #eaf6ed;
  font-weight: 700;
}

.article-state.loading {
  color: #a16700;
  background: #fff5dc;
}

.empty-search {
  display: grid;
  min-height: 180px;
  place-items: center;
  align-content: center;
  gap: 6px;
  color: #728594;
  text-align: center;
}

.empty-search .pi {
  color: #168e80;
  font-size: 1.35rem;
}

.empty-search small {
  color: #91a0ab;
  font-size: 0.72rem;
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
