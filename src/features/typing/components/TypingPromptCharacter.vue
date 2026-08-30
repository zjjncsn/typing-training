<script setup lang="ts">
defineProps<{
  character: string
  complete?: boolean
  current?: boolean
  error?: boolean
}>()
</script>

<template>
  <span class="typing-prompt-character" :class="{ complete, current, error }">{{ character }}</span>
</template>

<style scoped>
.typing-prompt-character {
  position: relative;
  display: inline-block;
  flex: 0 0 auto;
  width: 1ch;
  white-space: pre;
  text-align: center;
}

.typing-prompt-character.complete {
  color: #7c8ea0;
}

.typing-prompt-character.current {
  color: #17293e;
}

.typing-prompt-character.current::after {
  position: absolute;
  right: 14%;
  bottom: -0.12em;
  left: 14%;
  height: 3px;
  background: #168e80;
  border-radius: 999px;
  content: '';
}

.typing-prompt-character.current.error {
  color: #a32c2c;
  background: #ffebe8;
  animation: prompt-shake 100ms ease-out;
}

.typing-prompt-character.current.error::after {
  background: #c0392b;
}

@keyframes prompt-shake {
  25% {
    transform: translateX(-2px);
  }

  75% {
    transform: translateX(2px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .typing-prompt-character.current.error {
    animation: none;
  }
}
</style>
