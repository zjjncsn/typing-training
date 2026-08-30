import assert from 'node:assert/strict'
import test from 'node:test'

import {
  articleProgressPercentage,
  articleResumePosition,
  createEmptyArticleProgress,
  markArticleCompleted,
  migrateArticleProgress,
  parseArticleProgress,
  recordArticlePosition,
  restartArticleProgress,
} from './articleProgress.ts'

test('migrates the previous single-article position', () => {
  const state = migrateArticleProgress(
    null,
    JSON.stringify({ articleId: 'adage-11', position: 128.8 }),
    500,
  )

  assert.equal(state.lastArticleId, 'adage-11')
  assert.deepEqual(state.articles['adage-11'], {
    position: 128,
    completed: false,
    updatedAt: 500,
  })
})

test('sanitizes malformed progress entries without losing valid articles', () => {
  const state = parseArticleProgress(
    JSON.stringify({
      schemaVersion: 1,
      lastArticleId: 'essay-2',
      articles: {
        'essay-2': { position: 42, completed: false, updatedAt: 100 },
        broken: { position: 'nope' },
      },
    }),
  )

  assert.deepEqual(Object.keys(state?.articles ?? {}), ['essay-2'])
})

test('records independent positions and calculates progress', () => {
  let state = createEmptyArticleProgress()
  state = recordArticlePosition(state, 'adage-1', 25, 100, 10)
  state = recordArticlePosition(state, 'essay-1', 60, 200, 20)

  assert.equal(state.articles['adage-1']?.position, 25)
  assert.equal(state.articles['essay-1']?.position, 60)
  assert.equal(state.lastArticleId, 'essay-1')
  assert.equal(articleProgressPercentage(state.articles['adage-1'], 100), 25)
})

test('completed articles restart at the beginning without losing completion history', () => {
  let state = markArticleCompleted(createEmptyArticleProgress(), 'joke-3', 80, 10)
  assert.equal(articleResumePosition(state, 'joke-3', 80), 0)
  assert.equal(articleProgressPercentage(state.articles['joke-3'], 80), 100)

  state = restartArticleProgress(state, 'joke-3', 20)
  assert.deepEqual(state.articles['joke-3'], {
    position: 0,
    completed: true,
    updatedAt: 20,
  })
})
