import { createRouter, createWebHistory } from 'vue-router'

import TypingPracticePage from '@/features/typing/pages/TypingPracticePage.vue'
import WordPracticePage from '@/features/typing/pages/WordPracticePage.vue'
import ArticlePracticePage from '@/features/typing/pages/ArticlePracticePage.vue'
import SyllablePracticePage from '@/features/typing/pages/SyllablePracticePage.vue'
import ChineseWordPracticePage from '@/features/typing/pages/ChineseWordPracticePage.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/practice/english/keys/english-key-standard-00',
    },
    {
      path: '/practice/english/keys/:lessonId?',
      name: 'english-key-practice',
      component: TypingPracticePage,
    },
    {
      path: '/practice/english/keys-advanced/:lessonId?',
      name: 'english-key-advanced-practice',
      component: TypingPracticePage,
    },
    {
      path: '/practice/english/numpad/:lessonId?',
      name: 'english-numpad-practice',
      component: TypingPracticePage,
    },
    {
      path: '/practice/english/words',
      name: 'english-word-practice',
      component: WordPracticePage,
    },
    {
      path: '/practice/english/articles/:articleId?',
      name: 'english-article-practice',
      component: ArticlePracticePage,
    },
    {
      path: '/practice/chinese/syllables/:lessonId?',
      name: 'chinese-syllable-practice',
      component: SyllablePracticePage,
    },
    {
      path: '/practice/chinese/words/:lessonId?',
      name: 'chinese-word-practice',
      component: ChineseWordPracticePage,
    },
  ],
})

export default router
