<script setup lang="ts">
import AppNav from './components/AppNav.vue'
import DashboardView from './components/DashboardView.vue'
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
      <section v-else-if="store.page.value === 'settings'" class="placeholder-view">
        <h2>设置</h2>
        <p>设置页将在下一任务接入基本信息、模板配置和 Agent 配置。</p>
      </section>
      <section v-else class="placeholder-view">
        <h2>历史记录</h2>
        <p>历史回放将在后续任务接入。</p>
      </section>
    </section>
    <ToastStack />
  </main>
</template>
