<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ResourceArtifact } from '../domain/types'

const props = defineProps<{
  resource: ResourceArtifact
}>()

const emit = defineEmits<{
  close: []
  save: [resourceId: string, content: string]
  regenerate: [resourceId: string]
  suggest: [resourceId: string, suggestion: string]
}>()

const draftContent = ref(props.resource.content)
const suggestion = ref('')

const canEditContent = computed(() => props.resource.type !== 'html-demo')

watch(
  () => props.resource,
  (resource) => {
    draftContent.value = resource.content
    suggestion.value = ''
  }
)
</script>

<template>
  <div class="modal-backdrop" role="dialog" aria-modal="true">
    <section class="resource-panel">
      <header>
        <div>
          <h2>{{ resource.name }}</h2>
          <p>{{ resource.previewLabel }} · 生成时间：{{ resource.generatedAt }}</p>
        </div>
        <button type="button" @click="emit('close')">关闭</button>
      </header>

      <textarea v-if="canEditContent" v-model="draftContent" aria-label="资源内容" />
      <div v-else class="html-preview">
        <strong>预览</strong>
        <p>{{ resource.content }}</p>
      </div>

      <label class="field">
        <span>建议后重新生成</span>
        <input v-model="suggestion" placeholder="输入本次重生成建议" />
      </label>

      <section class="suggestion-history">
        <h3>建议历史</h3>
        <p v-if="!resource.suggestions.length">暂无建议记录。</p>
        <ol v-else>
          <li v-for="item in resource.suggestions" :key="`${item.createdAt}-${item.text}`">
            {{ item.createdAt }} · {{ item.text }}
          </li>
        </ol>
      </section>

      <div class="modal-actions">
        <button v-if="canEditContent" type="button" @click="emit('save', resource.id, draftContent)">
          保存
        </button>
        <button type="button" @click="emit('regenerate', resource.id)">重新生成</button>
        <button type="button" @click="emit('suggest', resource.id, suggestion)">按建议重生成</button>
      </div>
    </section>
  </div>
</template>
