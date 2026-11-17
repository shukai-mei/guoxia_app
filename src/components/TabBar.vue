<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Icon as VanIcon } from 'vant'

type TabKey = 'home' | 'appointments' | 'consultation'

interface TabItem {
  key: TabKey
  label: string
  icon: string
  activeIcon: string
  to: string
}

const route = useRoute()
const router = useRouter()

const tabs: TabItem[] = [
  { key: 'home', label: '房源', icon: 'wap-home-o', activeIcon: 'wap-home', to: '/' },
  {
    key: 'appointments',
    label: '预约',
    icon: 'todo-list-o',
    activeIcon: 'todo-list',
    to: '/my-appointments'
  },
  { key: 'consultation', label: '咨询', icon: 'smile-o', activeIcon: 'smile', to: '/consultation' }
]

const activeKey = computed<TabKey>(() => {
  const path = route.path
  if (path === '/') {
    return 'home'
  }
  if (path.startsWith('/booking-success')) {
    return 'appointments'
  }
  if (path === '/consultation') {
    return 'consultation'
  }
  return 'appointments'
})

function onTabClick(tab: TabItem) {
  if (route.path !== tab.to) {
    router.push(tab.to)
  }
}
</script>

<template>
  <div class="tab-bar-holder" aria-hidden="true" />
  <nav class="tab-bar">
    <button
      v-for="tab in tabs"
      :key="tab.key"
      type="button"
      class="tab-item"
      :class="{ 'tab-item--active': activeKey === tab.key }"
      @click="onTabClick(tab)"
    >
      <VanIcon :name="activeKey === tab.key ? tab.activeIcon : tab.icon" size="22" />
      <span class="tab-label">{{ tab.label }}</span>
    </button>
  </nav>
</template>

<style scoped>
.tab-bar-holder {
  height: 56px;
  padding-bottom: env(safe-area-inset-bottom);
}

.tab-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 100;
  display: flex;
  background: #fff;
  border-top: 0.5px solid var(--line);
  padding: 6px 0 calc(6px + env(safe-area-inset-bottom));
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  background: none;
  border: none;
  padding: 0;
  color: var(--hint);
  cursor: pointer;
}

.tab-item--active {
  color: var(--brand);
}

.tab-label {
  font-size: 10px;
  line-height: 1.2;
}
</style>
