<script setup lang="ts">
import { numpadKeys } from '../keyboard/numpadLayout'
import type { KeyboardTarget, KeyFeedback } from '../keyboard/types'

const props = defineProps<{
  target: KeyboardTarget | null
  keyFeedback: Readonly<Partial<Record<string, KeyFeedback>>>
}>()

function keyState(code: string) {
  const feedback = props.keyFeedback[code]

  return {
    active: props.target?.code === code,
    correct: feedback === 'correct',
    incorrect: feedback === 'incorrect',
    'home-anchor': code === 'Numpad5',
  }
}
</script>

<template>
  <section class="numpad-panel" aria-label="数字键盘指法提示">
    <div class="numpad">
      <div
        v-for="definition in numpadKeys"
        :key="definition.code"
        class="keycap"
        :class="keyState(definition.code)"
        :data-finger="definition.finger"
        :style="{
          gridColumn: `${definition.column} / span ${definition.columnSpan ?? 1}`,
          gridRow: `${definition.row} / span ${definition.rowSpan ?? 1}`,
        }"
        :aria-current="keyState(definition.code).active || undefined"
      >
        {{ definition.label }}
      </div>
    </div>
  </section>
</template>

<style scoped>
.numpad-panel {
  display: grid;
  place-items: center;
  width: 100%;
  padding: 16px 18px;
  background: #e9f2f5;
  border: 1px solid #cedde4;
  border-radius: 18px;
}

.numpad {
  display: grid;
  grid-template-columns: repeat(4, 68px);
  grid-template-rows: repeat(5, 50px);
  gap: 7px;
}

.keycap {
  --key-top: #f2f5fa;
  --key-bottom: #dde4ec;
  --key-border: #aebdca;

  position: relative;
  display: grid;
  place-items: center;
  min-width: 0;
  color: #26384d;
  background: linear-gradient(180deg, var(--key-top), var(--key-bottom));
  border: 1px solid var(--key-border);
  border-bottom-width: 3px;
  border-radius: 8px;
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 82%),
    0 2px 3px rgb(48 76 94 / 10%);
  font-family: "Cascadia Mono", Consolas, monospace;
  font-size: 1rem;
  transition:
    transform 45ms ease-out,
    box-shadow 45ms ease-out;
}

.keycap[data-finger$="pinky"] {
  --key-top: #f1ebff;
  --key-bottom: #d8cdf5;
  --key-border: #a995d3;
}

.keycap[data-finger$="ring"] {
  --key-top: #e5e9ff;
  --key-bottom: #b6c2f2;
  --key-border: #7188ce;
}

.keycap[data-finger$="middle"] {
  --key-top: #f8e8fb;
  --key-bottom: #eac8ef;
  --key-border: #c18acb;
}

.keycap[data-finger$="index"] {
  --key-top: #ddf8fb;
  --key-bottom: #9bdde5;
  --key-border: #4babb9;
}

.keycap[data-finger$="thumb"] {
  --key-top: #e5f0ff;
  --key-bottom: #bfd5f1;
  --key-border: #80a8d2;
}

.keycap.home-anchor::after {
  position: absolute;
  bottom: 6px;
  left: 50%;
  width: 24px;
  height: 3px;
  content: '';
  background: rgb(38 56 77 / 42%);
  border-radius: 2px;
  transform: translateX(-50%);
}

.keycap.active {
  z-index: 1;
  color: #583b00;
  background: linear-gradient(#fff2ad, #ffd75c);
  border-color: #e4a91e;
  box-shadow: 0 0 0 3px rgb(245 169 35 / 20%);
}

.keycap.correct {
  color: #174d28;
  background: linear-gradient(#e8f9e7, #a9e49e);
  border-color: #3d9b51;
  box-shadow: 0 0 0 3px rgb(61 155 81 / 20%);
  transform: translateY(2px) scale(0.985);
}

.keycap.incorrect {
  color: #742424;
  background: linear-gradient(#ffe8e5, #f4aaa3);
  border-color: #ce514b;
  box-shadow: 0 0 0 3px rgb(206 81 75 / 20%);
  transform: translateY(2px) scale(0.985);
}

@media (prefers-reduced-motion: reduce) {
  .keycap {
    transition: none;
  }
}

@media (width <= 420px) {
  .numpad {
    grid-template-columns: repeat(4, minmax(48px, 60px));
  }
}
</style>
