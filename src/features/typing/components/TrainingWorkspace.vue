<script setup lang="ts">
import type { TypingSessionStatus, TypingStats as TypingStatsValue } from '../engine/typingEngine'

import TypingStats from './TypingStats.vue'

defineProps<{
  eyebrow: string
  title: string
  status: TypingSessionStatus
  stats: TypingStatsValue
  showGuidance?: boolean
}>()

const statusText: Record<TypingSessionStatus, string> = {
  idle: '直接按下第一个字符开始训练',
  running: '训练进行中',
  paused: '训练已暂停',
  completed: '本课完成，做得不错！',
}
</script>

<template>
  <main class="training-workspace">
    <header class="workspace-header">
      <div>
        <p class="eyebrow">{{ eyebrow }}</p>
        <h1>{{ title }}</h1>
      </div>
      <div class="header-tools"><slot name="lesson-picker" /></div>
    </header>

    <TypingStats :stats="stats" />

    <div
      class="progress-track"
      role="progressbar"
      aria-label="课程进度"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-valuenow="Math.round(stats.progress)"
    >
      <div class="progress-value" :style="{ width: `${stats.progress}%` }" />
    </div>

    <section class="practice-area">
      <div class="practice-toolbar">
        <p :data-status="status">{{ statusText[status] }}</p>
        <div class="actions"><slot name="actions" /></div>
      </div>

      <slot name="content" />
      <div class="prompt-bar"><slot name="prompt" /></div>
      <div v-if="showGuidance !== false" class="guidance"><slot name="guidance" /></div>
    </section>
  </main>
</template>

<style scoped>
.training-workspace {
  width: min(1180px, calc(100% - 32px));
  margin: 0 auto;
  padding: 38px 0 70px;
}

.workspace-header,
.practice-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.workspace-header {
  margin-bottom: 22px;
}

.eyebrow {
  margin: 0 0 7px;
  color: #168e80;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.1em;
}

h1 {
  margin: 0;
  color: #172b43;
  font-size: clamp(1.55rem, 3vw, 2.25rem);
}

.header-tools {
  min-width: min(310px, 100%);
}

.progress-track {
  height: 7px;
  margin: 16px 4px 0;
  overflow: hidden;
  background: #dbe7ec;
  border-radius: 999px;
}

.progress-value {
  height: 100%;
  background: linear-gradient(90deg, #31b6a4, #168e80);
  border-radius: inherit;
  transition: width 150ms ease;
}

.practice-area {
  margin-top: 18px;
}

.practice-toolbar {
  min-height: 38px;
  margin-bottom: 10px;
}

.practice-toolbar p {
  margin: 0;
  color: #64748b;
  font-size: 0.9rem;
}

.practice-toolbar p[data-status='running'] {
  color: #08796c;
}

.practice-toolbar p[data-status='paused'] {
  color: #a16700;
}

.practice-toolbar p[data-status='completed'] {
  color: #137c50;
  font-weight: 700;
}

.actions {
  display: flex;
  gap: 8px;
}

.prompt-bar {
  min-height: 46px;
  margin: 12px 0;
  padding: 12px 16px;
  color: #4d6175;
  background: #fff;
  border: 1px solid #d8e3e9;
  border-radius: 12px;
}

.guidance {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(280px, 0.9fr);
  gap: 14px;
}

@media (width <= 900px) {
  .guidance {
    grid-template-columns: 1fr;
  }
}

@media (width <= 700px) {
  .workspace-header,
  .practice-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .header-tools {
    min-width: 0;
  }

  .practice-toolbar {
    gap: 10px;
  }
}
</style>
