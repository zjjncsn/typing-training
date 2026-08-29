<script setup lang="ts">
import type { TypingStats } from '../engine/typingEngine'

defineProps<{
  open: boolean
  lessonTitle: string
  stats: TypingStats
  hasNextLesson: boolean
  completionLabel?: string
  restartLabel?: string
  nextLabel?: string
  closeLabel?: string
}>()

const emit = defineEmits<{
  'update:open': [open: boolean]
  restart: []
  next: []
}>()

function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000)
  return `${Math.floor(seconds / 60)}分${seconds % 60}秒`
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="result-layer">
      <section role="dialog" aria-modal="true" aria-labelledby="result-title">
        <div class="success-mark">✓</div>
        <p>{{ completionLabel ?? '课程完成' }}</p>
        <h2 id="result-title">{{ lessonTitle }}</h2>

        <dl>
          <div>
            <dt>用时</dt>
            <dd>{{ formatDuration(stats.elapsedMs) }}</dd>
          </div>
          <div>
            <dt>速度</dt>
            <dd>{{ Math.round(stats.cpm) }} CPM</dd>
          </div>
          <div>
            <dt>正确率</dt>
            <dd>{{ stats.accuracy.toFixed(1) }}%</dd>
          </div>
          <div>
            <dt>错误</dt>
            <dd>{{ stats.errorCount }}</dd>
          </div>
        </dl>

        <div class="result-actions">
          <button type="button" class="secondary" @click="emit('restart')">
            {{ restartLabel ?? '再练一次' }}
          </button>
          <button v-if="hasNextLesson" type="button" @click="emit('next')">
            {{ nextLabel ?? '下一课' }}
          </button>
          <button v-else type="button" @click="emit('update:open', false)">
            {{ closeLabel ?? '返回课程' }}
          </button>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.result-layer {
  position: fixed;
  z-index: 120;
  inset: 0;
  display: grid;
  padding: 20px;
  place-items: center;
  background: rgb(18 37 55 / 45%);
  backdrop-filter: blur(4px);
}

section {
  width: min(500px, 100%);
  padding: 30px;
  text-align: center;
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 24px 70px rgb(17 39 58 / 30%);
}

.success-mark {
  display: grid;
  width: 56px;
  height: 56px;
  margin: 0 auto 12px;
  place-items: center;
  color: #fff;
  background: #20a58f;
  border-radius: 50%;
  font-size: 1.7rem;
  font-weight: 800;
}

section > p,
h2 {
  margin: 0;
}

section > p {
  color: #168e80;
  font-size: 0.78rem;
  font-weight: 800;
}

h2 {
  margin-top: 5px;
  color: #20384f;
}

dl {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 9px;
  margin: 22px 0;
}

dl div {
  padding: 13px;
  background: #f2f7f8;
  border-radius: 10px;
}

dt {
  color: #7b8c99;
  font-size: 0.72rem;
}

dd {
  margin: 4px 0 0;
  color: #294258;
  font-weight: 800;
}

.result-actions {
  display: flex;
  justify-content: center;
  gap: 9px;
}

button {
  padding: 10px 18px;
  color: #fff;
  cursor: pointer;
  background: #168e80;
  border: 1px solid #168e80;
  border-radius: 10px;
}

button.secondary {
  color: #40566c;
  background: #fff;
  border-color: #bdcbd5;
}
</style>
