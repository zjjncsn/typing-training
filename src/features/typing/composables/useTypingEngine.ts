import { computed, onBeforeUnmount, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'

import {
  backspaceCharacter,
  createTypingSession,
  getExpectedCharacter,
  getTypingStats,
  keyboardKeyToCharacter,
  pauseTypingSession,
  restartTypingSession,
  resumeTypingSession,
  typeCharacter,
  type TypingEngineOptions,
} from '../engine/typingEngine'

export function useTypingEngine(
  content: MaybeRefOrGetter<string>,
  options: MaybeRefOrGetter<Partial<TypingEngineOptions>> = {},
) {
  const session = ref(createTypingSession(toValue(content), toValue(options)))
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

  function inputCharacter(
    character: string,
    timestamp = Date.now(),
    correctOverride?: boolean,
  ) {
    session.value = typeCharacter(session.value, character, timestamp, correctOverride)
    clock.value = timestamp
  }

  function backspace() {
    session.value = backspaceCharacter(session.value)
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.ctrlKey || event.metaKey || event.altKey) return

    const target = event.target
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      (target instanceof HTMLElement && target.isContentEditable)
    ) {
      return
    }

    const character = keyboardKeyToCharacter(event.key)
    if (character === null) return

    event.preventDefault()
    inputCharacter(character)
  }

  function pause(timestamp = Date.now()) {
    session.value = pauseTypingSession(session.value, timestamp)
    clock.value = timestamp
  }

  function resume(timestamp = Date.now()) {
    session.value = resumeTypingSession(session.value, timestamp)
    clock.value = timestamp
  }

  function restart() {
    session.value = restartTypingSession(session.value)
    clock.value = Date.now()
  }

  watch(
    [() => toValue(content), () => toValue(options)],
    ([nextContent, nextOptions]) => {
      session.value = createTypingSession(nextContent, nextOptions)
      clock.value = Date.now()
    },
  )

  watch(
    () => session.value.status,
    (status) => {
      if (status === 'running') startClock()
      else stopClock()
    },
    { immediate: true },
  )

  onBeforeUnmount(stopClock)

  return {
    session,
    stats: computed(() => getTypingStats(session.value, clock.value)),
    expectedCharacter: computed(() => getExpectedCharacter(session.value)),
    inputCharacter,
    handleKeydown,
    backspace,
    pause,
    resume,
    restart,
  }
}
