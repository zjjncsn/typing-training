import { createRouter, createWebHistory } from 'vue-router'

import TypingPracticePage from '@/features/typing/pages/TypingPracticePage.vue'
import WordPracticePage from '@/features/typing/pages/WordPracticePage.vue'

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
  ],
})

export default router
