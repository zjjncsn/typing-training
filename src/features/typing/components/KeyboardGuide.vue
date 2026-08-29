<script setup lang="ts">
import { qwertyRows, type KeyboardTarget } from '../keyboard/qwertyLayout'
import type { KeyFeedback } from '../keyboard/types'

const props = defineProps<{
  target: KeyboardTarget | null
  keyFeedback: Readonly<Partial<Record<string, KeyFeedback>>>
}>()

const homeAnchorCodes = new Set(['KeyF', 'KeyJ'])

function keyState(code: string) {
  const feedback = props.keyFeedback[code]

  return {
    active: props.target?.code === code,
    modifier: props.target?.shiftCode === code,
    correct: feedback === 'correct',
    incorrect: feedback === 'incorrect',
    'home-anchor': homeAnchorCodes.has(code),
  }
}
</script>

<template>
  <section class="keyboard-panel" aria-label="键盘指法提示">
    <div class="keyboard">
      <div v-for="(row, rowIndex) in qwertyRows" :key="rowIndex" class="keyboard-row">
        <div
          v-for="definition in row"
          :key="definition.code"
          class="keycap"
          :class="[
            keyState(definition.code),
            { 'letter-key': definition.code.startsWith('Key') },
          ]"
          :data-finger="definition.finger"
          :style="{ flex: definition.width ?? 1 }"
          :aria-current="keyState(definition.code).active || undefined"
        >
          <small v-if="definition.shiftLabel">{{ definition.shiftLabel }}</small>
          <span>{{ definition.label }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.keyboard-panel {
  min-width: 0;
  width: 100%;
  padding: 14px 18px 16px;
  user-select: none;
  background: #e9f2f5;
  border: 1px solid #cedde4;
  border-radius: 18px;
}

.keyboard {
  display: grid;
  gap: 6px;
  min-width: 680px;
}

.keyboard-row {
  display: flex;
  gap: 6px;
}

.keyboard-row:last-child {
  width: 48%;
  margin: 0 auto;
}

.keycap {
  --key-top: #f2f5fa;
  --key-bottom: #dde4ec;
  --key-border: #aebdca;

  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 46px;
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
  font-size: 0.78rem;
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
  content: '';
  position: absolute;
  bottom: 5px;
  left: 50%;
  width: 34%;
  height: 3px;
  border-radius: 2px;
  background: rgb(38 56 77 / 42%);
  transform: translateX(-50%);
}

.keycap small {
  position: absolute;
  top: 4px;
  left: 6px;
  color: #8a9baa;
  font-size: 0.62rem;
}

.keycap.letter-key span {
  font-size: 1.08rem;
  font-weight: 650;
}

.keycap.active {
  z-index: 1;
  color: #583b00;
  background: linear-gradient(#fff2ad, #ffd75c);
  border-color: #e4a91e;
  box-shadow: 0 0 0 3px rgb(245 169 35 / 20%);
}

.keycap.modifier {
  color: #fff;
  background: linear-gradient(#40b9a7, #168e80);
  border-color: #0e7267;
  box-shadow: 0 0 0 3px rgb(22 142 128 / 18%);
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

@media (width <= 850px) {
  .keyboard-panel {
    overflow-x: auto;
  }
}
</style>
