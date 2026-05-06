<script setup lang="ts">
import type { PageId } from '../domain/types'

defineProps<{
  page: PageId
}>()

const emit = defineEmits<{
  navigate: [page: PageId]
}>()

const items: Array<{ id: PageId; label: string }> = [
  { id: 'dashboard', label: '首页' },
  { id: 'settings', label: '设置' },
  { id: 'history', label: '历史记录' }
]
</script>

<template>
  <nav class="app-nav" aria-label="主导航">
    <button
      v-for="item in items"
      :key="item.id"
      class="nav-button"
      :class="{ active: item.id === page }"
      type="button"
      @click="emit('navigate', item.id)"
    >
      {{ item.label }}
    </button>
  </nav>
</template>
