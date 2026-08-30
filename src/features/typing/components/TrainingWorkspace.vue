<script setup lang="ts">
import type { TypingSessionStatus, TypingStats as TypingStatsValue } from '../engine/typingEngine'

import TypingStats from './TypingStats.vue'

defineProps<{
  eyebrow: string
  title: string
  status: TypingSessionStatus
  stats: TypingStatsValue
  showGuidance?: boolean
  showPrompt?: boolean
  showAside?: boolean
  pauseMessage?: string
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

      <div class="practice-stage">
        <div class="practice-layout" :class="{ 'has-aside': showAside && $slots.aside }">
          <div class="practice-main">
            <slot name="content" />
            <div v-if="showPrompt !== false" class="prompt-bar"><slot name="prompt" /></div>
            <div v-if="showGuidance !== false" class="guidance"><slot name="guidance" /></div>
          </div>

          <div v-if="showAside && $slots.aside" class="practice-aside">
            <slot name="aside" />
          </div>
        </div>

        <div v-if="status === 'paused'" class="pause-overlay" role="status" aria-live="assertive">
          <div class="pause-card">
            <strong>{{ pauseMessage || '训练已暂停' }}</strong>
            <span>按 Esc 以外的任意键继续</span>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.training-workspace {
  width: min(1080px, calc(100% - 32px));
  margin: 0 auto;
  padding: 18px 0 44px;
}

.workspace-header,
.practice-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.workspace-header {
  margin-bottom: 12px;
}

.eyebrow {
  margin: 0 0 3px;
  color: #168e80;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.1em;
}

h1 {
  margin: 0;
  color: #172b43;
  font-size: clamp(1.35rem, 2.4vw, 1.8rem);
}

.header-tools {
  min-width: min(310px, 100%);
}

.progress-track {
  height: 7px;
  margin: 10px 4px 0;
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
  margin-top: 10px;
}

.practice-toolbar {
  min-height: 32px;
  margin-bottom: 6px;
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

.practice-stage {
  position: relative;
}

.practice-layout.has-aside {
  display: grid;
  grid-template-columns: minmax(680px, 1fr) minmax(250px, 280px);
  gap: 14px;
  align-items: start;
}

.practice-main {
  min-width: 0;
}

.practice-aside {
  position: sticky;
  top: 16px;
  min-width: 0;
}

.pause-overlay {
  position: absolute;
  z-index: 10;
  inset: 0;
  display: grid;
  place-items: center;
  min-height: 220px;
  background: rgb(238 244 248 / 82%);
  border-radius: 18px;
  backdrop-filter: blur(3px);
}

.pause-card {
  display: grid;
  gap: 7px;
  min-width: min(320px, calc(100% - 32px));
  padding: 22px 28px;
  text-align: center;
  background: rgb(255 255 255 / 94%);
  border: 1px solid #cbdbe4;
  border-radius: 16px;
  box-shadow: 0 14px 38px rgb(49 78 102 / 16%);
}

.pause-card strong {
  color: #1b3c55;
  font-size: 1.08rem;
}

.pause-card span {
  color: #64788b;
  font-size: 0.86rem;
}

.prompt-bar {
  min-height: 46px;
  margin: 8px 0;
  padding: 10px 16px;
  color: #4d6175;
  background: #fff;
  border: 1px solid #d8e3e9;
  border-radius: 12px;
}

.guidance {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

@media (width <= 1120px) {
  .practice-layout.has-aside {
    display: block;
  }

  .practice-aside {
    position: static;
    margin-top: 10px;
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
