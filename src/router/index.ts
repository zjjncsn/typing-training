import { createRouter, createWebHistory } from 'vue-router'

import TypingPracticePage from '@/features/typing/pages/TypingPracticePage.vue'

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
  ],
})

export default router
