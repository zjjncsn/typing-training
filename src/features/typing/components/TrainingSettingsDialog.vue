<script setup lang="ts">
type TypingTextScale = 'small' | 'medium' | 'large'

defineProps<{
  open: boolean
  showKeyboard: boolean
  showHands: boolean
  textScale: TypingTextScale
  enableExplanation?: boolean
  showExplanation?: boolean
  hideKeyboard?: boolean
  hideHands?: boolean
}>()

const emit = defineEmits<{
  'update:open': [open: boolean]
  'update:showKeyboard': [value: boolean]
  'update:showHands': [value: boolean]
  'update:textScale': [value: TypingTextScale]
  'update:showExplanation': [value: boolean]
}>()
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="dialog-layer"
      role="presentation"
      @click.self="emit('update:open', false)"
    >
      <section role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <header>
          <div>
            <p>训练偏好</p>
            <h2 id="settings-title">显示设置</h2>
          </div>
          <button type="button" aria-label="关闭设置" @click="emit('update:open', false)">×</button>
        </header>

        <label v-if="!hideKeyboard" class="setting-row">
          <div><strong>屏幕键盘</strong><small>显示目标键和 Shift 组合</small></div>
          <input
            type="checkbox"
            :checked="showKeyboard"
            @change="emit('update:showKeyboard', ($event.target as HTMLInputElement).checked)"
          />
        </label>

        <label v-if="enableExplanation" class="setting-row">
          <div><strong>单词释义</strong><small>显示当前单词的音标和中文解释</small></div>
          <input
            type="checkbox"
            :checked="showExplanation"
            @change="emit('update:showExplanation', ($event.target as HTMLInputElement).checked)"
          />
        </label>

        <label v-if="!hideHands" class="setting-row">
          <div><strong>手指提示</strong><small>显示目标手指和双手联动</small></div>
          <input
            type="checkbox"
            :checked="showHands"
            @change="emit('update:showHands', ($event.target as HTMLInputElement).checked)"
          />
        </label>

        <fieldset>
          <legend>训练文字大小</legend>
          <label v-for="scale in ['small', 'medium', 'large'] as const" :key="scale">
            <input
              type="radio"
              name="text-scale"
              :value="scale"
              :checked="textScale === scale"
              @change="emit('update:textScale', scale)"
            />
            {{ { small: '小', medium: '标准', large: '大' }[scale] }}
          </label>
        </fieldset>

        <p class="rule-note">当前训练规则：输入错误时停留在原位，必须输入正确字符后继续。</p>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.dialog-layer {
  position: fixed;
  z-index: 110;
  inset: 0;
  display: grid;
  padding: 20px;
  place-items: center;
  background: rgb(18 37 55 / 42%);
  backdrop-filter: blur(3px);
}

section {
  width: min(470px, 100%);
  padding: 24px;
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 24px 70px rgb(17 39 58 / 28%);
}

header,
.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

header {
  margin-bottom: 18px;
}

header p,
header h2 {
  margin: 0;
}

header p {
  color: #168e80;
  font-size: 0.72rem;
  font-weight: 800;
}

header h2 {
  margin-top: 3px;
  color: #20384f;
}

header button {
  width: 36px;
  height: 36px;
  color: #52687c;
  cursor: pointer;
  background: #f4f8fa;
  border: 1px solid #d3dfe5;
  border-radius: 10px;
  font-size: 1.4rem;
}

.setting-row {
  padding: 15px 0;
  border-top: 1px solid #e4ebef;
}

.setting-row div {
  display: grid;
  gap: 3px;
}

.setting-row strong {
  color: #334b61;
  font-size: 0.9rem;
}

.setting-row small,
.rule-note {
  color: #7a8b99;
  font-size: 0.76rem;
}

.setting-row input {
  width: 20px;
  height: 20px;
  accent-color: #168e80;
}

fieldset {
  display: flex;
  gap: 20px;
  margin: 14px 0 0;
  padding: 15px;
  border: 1px solid #dce5ea;
  border-radius: 12px;
}

legend {
  padding: 0 6px;
  color: #52687b;
  font-size: 0.78rem;
  font-weight: 700;
}

fieldset label {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #40566c;
  font-size: 0.84rem;
}

fieldset input {
  accent-color: #168e80;
}

.rule-note {
  margin: 16px 0 0;
  padding: 11px;
  background: #f3f7f8;
  border-radius: 9px;
}
</style>
