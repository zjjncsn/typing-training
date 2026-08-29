<script setup lang="ts">
import { computed } from 'vue'

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

    <svg viewBox="0 0 620 220" role="img" :aria-label="activeDescription || '暂无手指提示'">
      <g class="hand left-hand">
        <rect class="palm" x="78" y="112" width="174" height="88" rx="42" />
        <g :class="{ active: isActive('left-pinky') }">
          <rect class="finger" x="42" y="72" width="38" height="105" rx="19" />
          <circle class="tip" cx="61" cy="82" r="8" />
        </g>
        <g :class="{ active: isActive('left-ring') }">
          <rect class="finger" x="84" y="35" width="38" height="128" rx="19" />
          <circle class="tip" cx="103" cy="45" r="8" />
        </g>
        <g :class="{ active: isActive('left-middle') }">
          <rect class="finger" x="127" y="18" width="40" height="145" rx="20" />
          <circle class="tip" cx="147" cy="28" r="8" />
        </g>
        <g :class="{ active: isActive('left-index') }">
          <rect class="finger" x="172" y="39" width="40" height="126" rx="20" />
          <circle class="tip" cx="192" cy="49" r="8" />
        </g>
        <g :class="{ active: isActive('left-thumb') }" transform="rotate(-38 242 142)">
          <rect class="finger" x="222" y="103" width="42" height="91" rx="21" />
          <circle class="tip" cx="243" cy="114" r="8" />
        </g>
      </g>

      <g class="hand right-hand">
        <rect class="palm" x="368" y="112" width="174" height="88" rx="42" />
        <g :class="{ active: isActive('right-thumb') }" transform="rotate(38 378 142)">
          <rect class="finger" x="356" y="103" width="42" height="91" rx="21" />
          <circle class="tip" cx="377" cy="114" r="8" />
        </g>
        <g :class="{ active: isActive('right-index') }">
          <rect class="finger" x="408" y="39" width="40" height="126" rx="20" />
          <circle class="tip" cx="428" cy="49" r="8" />
        </g>
        <g :class="{ active: isActive('right-middle') }">
          <rect class="finger" x="453" y="18" width="40" height="145" rx="20" />
          <circle class="tip" cx="473" cy="28" r="8" />
        </g>
        <g :class="{ active: isActive('right-ring') }">
          <rect class="finger" x="498" y="35" width="38" height="128" rx="19" />
          <circle class="tip" cx="517" cy="45" r="8" />
        </g>
        <g :class="{ active: isActive('right-pinky') }">
          <rect class="finger" x="540" y="72" width="38" height="105" rx="19" />
          <circle class="tip" cx="559" cy="82" r="8" />
        </g>
      </g>
    </svg>
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

svg {
  display: block;
  width: 100%;
  height: auto;
  margin-top: 8px;
}

.palm,
.finger {
  fill: #dce8ec;
  stroke: #9fb5bf;
  stroke-width: 2;
}

.tip {
  fill: #b9cbd2;
  transition:
    fill 140ms ease,
    filter 140ms ease;
}

g.active .finger {
  fill: #ffe694;
  stroke: #e1a525;
}

g.active .tip {
  fill: #f5a623;
  filter: drop-shadow(0 0 7px rgb(245 166 35 / 70%));
}
</style>
