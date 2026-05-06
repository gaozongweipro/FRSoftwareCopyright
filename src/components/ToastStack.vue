<script setup lang="ts">
defineProps<{
  messages?: string[]
}>()
</script>

<template>
  <div v-if="messages?.length" class="toast-stack" aria-live="polite">
    <p v-for="message in messages" :key="message" class="toast">{{ message }}</p>
  </div>
</template>
