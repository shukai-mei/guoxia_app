<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import TabBar from './components/TabBar.vue'

const route = useRoute()

const showTabBar = computed(
  () =>
    ['/', '/my-appointments', '/consultation'].includes(route.path) ||
    route.path.startsWith('/booking-success/')
)
</script>

<template>
  <router-view />
  <TabBar v-if="showTabBar" />
</template>
