<script setup lang="ts">
import type { TypingStats } from '../engine/typingEngine'

defineProps<{
  stats: TypingStats
  showWpm?: boolean
}>()

function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
</script>

<template>
  <dl class="stats">
    <div>
      <dt>时间</dt>
      <dd>{{ formatDuration(stats.elapsedMs) }}</dd>
    </div>
    <div>
      <dt>速度</dt>
      <dd>{{ Math.round(stats.cpm) }} <small>CPM</small></dd>
    </div>
    <div v-if="showWpm">
      <dt>单词</dt>
      <dd>{{ Math.round(stats.wpm) }} <small>WPM</small></dd>
    </div>
    <div>
      <dt>正确率</dt>
      <dd>{{ stats.accuracy.toFixed(1) }}<small>%</small></dd>
    </div>
    <div>
      <dt>进度</dt>
      <dd>{{ Math.round(stats.progress) }}<small>%</small></dd>
    </div>
  </dl>
</template>

<style scoped>
.stats {
  display: flex;
  justify-content: center;
  width: fit-content;
  margin: 0 auto;
  padding: 8px 6px;
  background: rgb(255 255 255 / 82%);
  border: 1px solid #d8e3eb;
  border-radius: 12px;
}

.stats div {
  display: flex;
  align-items: baseline;
  gap: 7px;
  padding: 2px 18px;
}

.stats div + div {
  border-left: 1px solid #d8e3eb;
}

dt {
  margin: 0;
  color: #718096;
  font-size: 0.8rem;
}

dd {
  margin: 0;
  color: #1c314a;
  font-size: 1.05rem;
  font-weight: 700;
}

small {
  margin-left: 3px;
  font-size: 0.65em;
  font-weight: 500;
}

@media (width <= 600px) {
  .stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    width: auto;
  }

  .stats div {
    justify-content: center;
  }

  .stats div + div {
    border-left: none;
  }

  .stats div:last-child:nth-child(odd) {
    grid-column: 1 / -1;
  }
}
</style>
