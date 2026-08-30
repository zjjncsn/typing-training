<script setup lang="ts">
defineProps<{
  wrap?: boolean
  emphasized?: boolean
}>()
</script>

<template>
  <section class="typing-input-panel" :class="{ wrap, emphasized }">
    <div class="typing-input-row prompt-row"><slot name="prompt" /></div>
    <div class="typing-input-row echo-row" aria-label="输入回显"><slot name="echo" /></div>
  </section>
</template>

<style scoped>
.typing-input-panel {
  overflow: hidden;
  color: #53667a;
  background: #fff;
  border: 1px solid #d8e3eb;
  border-radius: 16px;
  box-shadow: 0 10px 28px rgb(49 78 102 / 8%);
}

.typing-input-panel.emphasized {
  border-color: #bfd5df;
  box-shadow: 0 10px 28px rgb(49 78 102 / 10%);
}

.typing-input-row {
  display: flex;
  align-items: center;
  min-height: 2.45em;
  padding: 10px 20px;
}

.typing-input-panel.wrap .typing-input-row {
  flex-wrap: wrap;
  align-content: center;
}

.prompt-row {
  border-bottom: 1px solid #e2e9ed;
}

.echo-row {
  color: #304e65;
}
</style>
