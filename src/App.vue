<script setup lang="ts">
import AppNav from './components/AppNav.vue'
import DashboardView from './components/DashboardView.vue'
import HistoryView from './components/HistoryView.vue'
import SettingsView from './components/SettingsView.vue'
import ToastStack from './components/ToastStack.vue'
import { createAppStore } from './stores/appStore'

const store = createAppStore()
</script>

<template>
  <main class="app-shell">
    <aside class="app-sidebar">
      <p class="eyebrow">FR Software Copyright</p>
      <h1>软著生成工具</h1>
      <AppNav :page="store.page.value" @navigate="store.page.value = $event" />
    </aside>

    <section class="app-content">
      <DashboardView v-if="store.page.value === 'dashboard'" :store="store" />
      <SettingsView v-else-if="store.page.value === 'settings'" :store="store" />
      <HistoryView v-else :store="store" />
    </section>
    <ToastStack />
  </main>
</template>
