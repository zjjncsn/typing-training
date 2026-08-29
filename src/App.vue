<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import PanelMenu from 'primevue/panelmenu'

const route = useRoute()
const router = useRouter()
const menuCollapsed = ref(true)
const expandedMenuKeys = ref<Record<string, boolean>>({ english: true })

const menuItems = computed(() => [
  {
    key: 'english',
    label: '英文打字',
    icon: 'pi pi-language',
    items: [
      {
        label: '基础键位',
        icon: 'pi pi-table',
        class: route.name === 'english-key-practice' ? 'active-menu-item' : undefined,
        command: () =>
          router.push({
            name: 'english-key-practice',
            params: { lessonId: 'english-key-standard-00' },
          }),
      },
      {
        label: '键位练习（高级）',
        icon: 'pi pi-star',
        class: route.name === 'english-key-advanced-practice' ? 'active-menu-item' : undefined,
        command: () =>
          router.push({
            name: 'english-key-advanced-practice',
            params: { lessonId: 'english-key-standard-00' },
          }),
      },
      {
        label: '数字键盘',
        icon: 'pi pi-calculator',
        class: route.name === 'english-numpad-practice' ? 'active-menu-item' : undefined,
        command: () =>
          router.push({
            name: 'english-numpad-practice',
            params: { lessonId: 'english-numpad-00' },
          }),
      },
      {
        label: '单词练习',
        icon: 'pi pi-list-check',
        class: route.name === 'english-word-practice' ? 'active-menu-item' : undefined,
        command: () => router.push({ name: 'english-word-practice' }),
      },
      {
        label: '文章练习',
        icon: 'pi pi-file-edit',
        disabled: true,
      },
    ],
  },
])
</script>

<template>
  <div class="app-shell" :class="{ 'menu-collapsed': menuCollapsed }">
    <aside class="app-sidebar" aria-label="训练导航">
      <div class="brand-row">
        <div class="brand-mark">
          <img src="/typing-logo.png" alt="" />
        </div>
        <div class="brand-copy">
          <strong>打字练习</strong>
          <span>Web 练习版</span>
        </div>
      </div>

      <Button
        class="collapse-button"
        :icon="menuCollapsed ? 'pi pi-angle-right' : 'pi pi-angle-left'"
        severity="secondary"
        rounded
        :aria-label="menuCollapsed ? '展开侧边菜单' : '收起侧边菜单'"
        @click="menuCollapsed = !menuCollapsed"
      />

      <PanelMenu
        v-model:expanded-keys="expandedMenuKeys"
        :model="menuItems"
        multiple
        class="training-menu"
      />
    </aside>

    <div class="app-content">
      <RouterView />
    </div>
  </div>
</template>

<style>
:root {
  color: #223047;
  background: #eef4f8;
  font-family:
    Inter,
    'Microsoft YaHei',
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    sans-serif;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
}

* {
  box-sizing: border-box;
}

body {
  min-width: 320px;
  min-height: 100vh;
  margin: 0;
}

.app-shell {
  min-height: 100vh;
}

.app-sidebar {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 20;
  width: 224px;
  height: 100vh;
  padding: 14px 10px;
  overflow: visible;
  background: rgb(255 255 255 / 88%);
  border-right: 1px solid #d8e3e9;
  box-shadow: 5px 0 20px rgb(50 80 103 / 5%);
  backdrop-filter: blur(12px);
  transition: width 160ms ease;
}

.brand-row {
  display: flex;
  align-items: center;
  min-height: 46px;
  margin-bottom: 14px;
  padding: 2px 4px;
}

.brand-mark {
  flex: 0 0 38px;
  width: 38px;
  height: 38px;
  overflow: hidden;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 4px 12px rgb(22 142 128 / 16%);
}

.brand-mark img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.brand-copy {
  display: grid;
  min-width: 0;
  margin-left: 10px;
  white-space: nowrap;
}

.brand-copy strong {
  color: #19364d;
  font-size: 0.92rem;
}

.brand-copy span {
  margin-top: 1px;
  color: #8394a3;
  font-size: 0.68rem;
}

.app-sidebar .collapse-button {
  position: absolute;
  top: 50%;
  right: -15px;
  z-index: 2;
  width: 30px;
  height: 30px;
  color: #607689;
  background: #fbfcfd;
  border: 1px solid #d8e3e9;
  box-shadow: 0 3px 10px rgb(50 80 103 / 12%);
  transform: translateY(-50%);
}

.training-menu {
  width: 100%;
  border: 0;
}

.training-menu .p-panelmenu-panel {
  margin: 0;
  border: 0;
}

.training-menu .p-panelmenu-header-content,
.training-menu .p-panelmenu-content {
  background: transparent;
  border: 0;
}

.training-menu .p-panelmenu-header-link,
.training-menu .p-panelmenu-item-link {
  min-height: 42px;
  border-radius: 9px;
}

.training-menu .active-menu-item > .p-panelmenu-item-content {
  color: #08796c;
  background: #e8f7f4;
}

.app-content {
  min-width: 0;
  min-height: 100vh;
  margin-left: 68px;
}

.menu-collapsed .app-sidebar {
  width: 68px;
}

.menu-collapsed .brand-copy,
.menu-collapsed .training-menu .p-panelmenu-header-label,
.menu-collapsed .training-menu .p-panelmenu-item-label,
.menu-collapsed .training-menu .p-panelmenu-submenu-icon {
  display: none;
}

.menu-collapsed .training-menu .p-panelmenu-header-link,
.menu-collapsed .training-menu .p-panelmenu-item-link {
  justify-content: center;
  padding-inline: 0;
}

.menu-collapsed .training-menu .p-panelmenu-header-icon,
.menu-collapsed .training-menu .p-panelmenu-item-icon {
  margin: 0;
}

button,
select {
  font: inherit;
}

@media (width <= 760px) {
  .app-content {
    margin-left: 58px;
  }

  .menu-collapsed .app-sidebar {
    width: 58px;
    padding-inline: 6px;
  }
}
</style>
