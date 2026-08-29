import { computed, onBeforeUnmount, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'

import {
  backspaceWordPractice,
  createWordPracticeSession,
  getWordPracticeExpectedCharacter,
  getWordPracticeStats,
  pauseWordPractice,
  restartWordPractice,
  resumeWordPractice,
  typeWordPracticeCharacter,
  type WordPracticeSession,
} from '../engine/wordPracticeSession'
import type { TypingStats } from '../engine/typingEngine'

const emptyStats: TypingStats = {
  elapsedMs: 0,
  progress: 0,
  accuracy: 100,
  cpm: 0,
  wpm: 0,
  correctCount: 0,
  errorCount: 0,
  totalKeystrokes: 0,
  remainingCharacters: 0,
}

export function useWordPracticeEngine(
  words: MaybeRefOrGetter<readonly string[]>,
  initialWordIndex: MaybeRefOrGetter<number> = 0,
) {
  const practice = ref<WordPracticeSession | null>(null)
  const clock = ref(Date.now())
  let clockTimer: ReturnType<typeof setInterval> | undefined

  function startClock() {
    if (clockTimer !== undefined) return
    clockTimer = setInterval(() => {
      clock.value = Date.now()
    }, 100)
  }

  function stopClock() {
    if (clockTimer === undefined) return
    clearInterval(clockTimer)
    clockTimer = undefined
  }

  function inputCharacter(character: string, timestamp = Date.now(), correctOverride?: boolean) {
    if (!practice.value) return
    practice.value = typeWordPracticeCharacter(
      practice.value,
      character,
      timestamp,
      correctOverride,
    )
    clock.value = timestamp
  }

  function backspace() {
    if (practice.value) practice.value = backspaceWordPractice(practice.value)
  }

  function pause(timestamp = Date.now()) {
    if (practice.value) practice.value = pauseWordPractice(practice.value, timestamp)
    clock.value = timestamp
  }

  function resume(timestamp = Date.now()) {
    if (practice.value) practice.value = resumeWordPractice(practice.value, timestamp)
    clock.value = timestamp
  }

  function restart() {
    if (practice.value) practice.value = restartWordPractice(practice.value)
    clock.value = Date.now()
  }

  watch(
    [() => toValue(words), () => toValue(initialWordIndex)],
    ([nextWords, nextInitialWordIndex]) => {
      practice.value =
        nextWords.length > 0 ? createWordPracticeSession(nextWords, nextInitialWordIndex) : null
      clock.value = Date.now()
    },
    { immediate: true },
  )

  watch(
    () => practice.value?.typing.status,
    (status) => {
      if (status === 'running') startClock()
      else stopClock()
    },
    { immediate: true },
  )

  onBeforeUnmount(stopClock)

  return {
    practice,
    session: computed(() => practice.value?.typing ?? null),
    stats: computed(() =>
      practice.value ? getWordPracticeStats(practice.value, clock.value) : emptyStats,
    ),
    expectedCharacter: computed(() =>
      practice.value ? getWordPracticeExpectedCharacter(practice.value) : null,
    ),
    inputCharacter,
    backspace,
    pause,
    resume,
    restart,
  }
}
