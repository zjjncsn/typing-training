<script setup lang="ts">
import { computed } from 'vue'

import leftHandImage from '@/assets/left-hand-outline.png'

import { fingerLabels, type FingerId, type KeyboardTarget } from '../keyboard/qwertyLayout'

const props = defineProps<{
  target: KeyboardTarget | null
}>()

const activeFingers = computed(() => {
  const fingers = new Set<FingerId>()
  if (props.target?.finger) fingers.add(props.target.finger)
  if (props.target?.shiftFinger) fingers.add(props.target.shiftFinger)
  return fingers
})

const activeDescription = computed(() =>
  [...activeFingers.value].map((finger) => fingerLabels[finger]).join(' + '),
)

function isActive(finger: FingerId): boolean {
  return activeFingers.value.has(finger)
}
</script>

<template>
  <section class="hand-panel" aria-label="手指提示">
    <header>
      <p>手指提示</p>
      <strong>{{ activeDescription || '—' }}</strong>
    </header>

    <div class="hands" role="img" :aria-label="activeDescription || '暂无手指提示'">
      <div class="hand-figure">
        <div class="hand-canvas">
          <img :src="leftHandImage" alt="" aria-hidden="true" />
          <span class="finger-marker pinky" :class="{ active: isActive('left-pinky') }" />
          <span class="finger-marker ring" :class="{ active: isActive('left-ring') }" />
          <span class="finger-marker middle" :class="{ active: isActive('left-middle') }" />
          <span class="finger-marker index" :class="{ active: isActive('left-index') }" />
          <span class="finger-marker thumb" :class="{ active: isActive('left-thumb') }" />
        </div>
      </div>

      <div class="hand-figure right-hand">
        <div class="hand-canvas">
          <img :src="leftHandImage" alt="" aria-hidden="true" />
          <span class="finger-marker pinky" :class="{ active: isActive('right-pinky') }" />
          <span class="finger-marker ring" :class="{ active: isActive('right-ring') }" />
          <span class="finger-marker middle" :class="{ active: isActive('right-middle') }" />
          <span class="finger-marker index" :class="{ active: isActive('right-index') }" />
          <span class="finger-marker thumb" :class="{ active: isActive('right-thumb') }" />
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hand-panel {
  min-width: 260px;
  padding: 18px;
  background: #fff;
  border: 1px solid #d4e0e7;
  border-radius: 18px;
}

header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

header p,
header strong {
  margin: 0;
}

header p {
  color: #168e80;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.08em;
}

header strong {
  color: #334b62;
  font-size: 0.86rem;
}

.hands {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 12px;
  margin-top: 10px;
}

.hand-figure {
  width: min(45%, 165px);
}

.hand-canvas {
  position: relative;
  width: 100%;
}

.right-hand .hand-canvas {
  transform: scaleX(-1);
}

img {
  display: block;
  width: 100%;
  height: auto;
  mix-blend-mode: multiply;
  opacity: 0.78;
}

.finger-marker {
  position: absolute;
  width: 11%;
  aspect-ratio: 1;
  pointer-events: none;
  background: #28c76f;
  border: 2px solid #fff;
  border-radius: 50%;
  box-shadow:
    0 0 0 2px #159551,
    0 3px 9px rgb(21 149 81 / 48%);
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.55);
  transition:
    opacity 70ms ease-out,
    transform 70ms ease-out;
}

.finger-marker.active {
  opacity: 1;
  transform: translate(-50%, -50%) scale(1);
}

.finger-marker.pinky {
  top: 27%;
  left: 7%;
}

.finger-marker.ring {
  top: 11%;
  left: 25%;
}

.finger-marker.middle {
  top: 5%;
  left: 40.5%;
}

.finger-marker.index {
  top: 7%;
  left: 63%;
}

.finger-marker.thumb {
  top: 39%;
  left: 91%;
}

@media (prefers-reduced-motion: reduce) {
  .finger-marker {
    transition: none;
  }
}
</style>
