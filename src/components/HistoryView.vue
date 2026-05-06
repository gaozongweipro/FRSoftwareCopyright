<script setup lang="ts">
import type { createAppStore } from '../stores/appStore'

defineProps<{
  store: ReturnType<typeof createAppStore>
}>()
</script>

<template>
  <section class="history-view">
    <header>
      <h2>历史记录</h2>
      <span>{{ store.history.value.length }} 条</span>
    </header>

    <section v-if="!store.history.value.length" class="empty-flow">
      <h2>暂无历史记录</h2>
      <p>完成一次模拟生成后，历史记录会保存系统标题、执行状态、资源数量和生成耗时。</p>
    </section>

    <div v-else class="history-list">
      <article v-for="record in store.history.value" :key="record.id" class="history-row">
        <div>
          <h3>{{ record.title }}</h3>
          <p>
            {{ record.systemType }} · {{ record.status }} · 生成时间：{{ record.generatedAt }}
          </p>
        </div>
        <dl>
          <div>
            <dt>模板数量</dt>
            <dd>{{ record.templateCount }}</dd>
          </div>
          <div>
            <dt>资源数量</dt>
            <dd>{{ record.resourceCount }}</dd>
          </div>
          <div>
            <dt>耗时</dt>
            <dd>{{ record.durationSeconds }}s</dd>
          </div>
        </dl>
        <div class="history-actions">
          <button type="button" @click="store.loadHistory(record.id)">加载</button>
          <button type="button" @click="store.deleteHistory(record.id)">删除</button>
        </div>
      </article>
    </div>
  </section>
</template>
