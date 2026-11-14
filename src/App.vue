<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import ContactFloating from './components/ContactFloating.vue'

const route = useRoute()
const showContact = computed(() => !route.path.startsWith('/admin'))
</script>

<template>
  <router-view />
  <ContactFloating v-if="showContact" />
</template>
