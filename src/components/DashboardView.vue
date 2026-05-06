<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ResourceArtifact, WorkflowNode } from '../domain/types'
import type { createAppStore } from '../stores/appStore'

const props = defineProps<{
  store: ReturnType<typeof createAppStore>
}>()

const selectedResource = ref<ResourceArtifact | null>(null)
const suggestionText = ref('')

const task = computed(() => props.store.currentTask.value)
const stats = computed(() => task.value?.stats)
const documentStage = computed(() => task.value?.stages.find((stage) => stage.id === 'document'))

function startGeneration(): void {
  props.store.startGeneration()
}

function openResource(resource: ResourceArtifact): void {
  selectedResource.value = resource
  suggestionText.value = ''
}

function saveSelectedResource(): void {
  if (!selectedResource.value) return
  props.store.saveResource(selectedResource.value.id, selectedResource.value.content)
  selectedResource.value = null
}

function regenerate(node: WorkflowNode): void {
  props.store.regenerate(node.resource.id)
}

function regenerateWithSuggestion(): void {
  if (!selectedResource.value) return
  props.store.regenerate(selectedResource.value.id, suggestionText.value)
  selectedResource.value = null
}

function compress(): void {
  props.store.compressCurrentTask()
}
</script>

<template>
  <section class="dashboard-view">
    <div class="workspace-toolbar">
      <label class="field title-field">
        <span>系统标题</span>
        <input
          v-model="store.projectTitle.value"
          placeholder="例如：智慧仓储管理系统 V1.0"
          aria-label="系统标题"
        />
      </label>
      <label class="field compact-field">
        <span>系统类型</span>
        <select v-model="store.systemType.value" aria-label="系统类型">
          <option value="web">Web 端</option>
        </select>
      </label>
      <button class="primary-button" data-test="start-generation" type="button" @click="startGeneration">
        开始生成
      </button>
    </div>

    <p v-if="store.validationIssues.value.some((issue) => issue.code === 'missing-title')" class="inline-error">
      请先填写系统标题。
    </p>

    <section v-if="store.validationIssues.value.length" class="attention-panel">
      <div>
        <h2>生成前校验</h2>
        <p>以下配置完成后才能启动模拟生成流程。</p>
      </div>
      <button
        v-for="issue in store.validationIssues.value"
        :key="issue.code"
        class="issue-row"
        type="button"
        @click="store.page.value = issue.targetPage"
      >
        <strong>{{ issue.label }}</strong>
        <span>{{ issue.message }}</span>
      </button>
    </section>

    <section class="summary-strip" aria-label="生成结果摘要">
      <button class="address-button" type="button" :disabled="!task">
        <span>项目地址</span>
        <strong>{{ task?.projectUrl ?? '生成后显示' }}</strong>
      </button>
      <button class="address-button" type="button" :disabled="!task">
        <span>文档地址</span>
        <strong>{{ task?.documentDirectory ?? '生成后显示' }}</strong>
      </button>
      <button class="address-button" type="button" :disabled="!task" @click="compress">
        <span>压缩包</span>
        <strong>{{ task?.zipPath ?? '待压缩输出' }}</strong>
      </button>
      <div class="stats-grid">
        <span>资源 {{ stats?.resourceCount ?? 0 }}</span>
        <span>模板 {{ stats?.templateCount ?? documentStage?.nodes.length ?? 0 }}</span>
        <span>重生成 {{ stats?.regenerateCount ?? 0 }}</span>
        <span>耗时 {{ stats?.durationSeconds ?? 0 }}s</span>
      </div>
    </section>

    <section class="flow-board" aria-label="四阶段执行流程">
      <article v-for="stage in task?.stages ?? []" :key="stage.id" class="stage-panel">
        <header>
          <h2>{{ stage.name }}</h2>
          <span>{{ stage.status }}</span>
        </header>
        <div class="node-list">
          <article v-for="node in stage.nodes" :key="node.id" class="node-row">
            <div>
              <strong>{{ node.name }}</strong>
              <span>{{ node.resource.previewLabel }}</span>
            </div>
            <div class="node-actions">
              <button type="button" @click="openResource(node.resource)">预览/编辑</button>
              <button type="button" @click="regenerate(node)">重新生成</button>
              <button type="button" @click="openResource(node.resource)">建议重生成</button>
            </div>
          </article>
        </div>
      </article>
      <article v-if="!task" class="empty-flow">
        <h2>等待生成任务</h2>
        <p>完成必要配置后，执行流程将在这里展示项目分析、项目编码、图片截取和文档生成四个阶段。</p>
      </article>
    </section>

    <div v-if="selectedResource" class="modal-backdrop" role="dialog" aria-modal="true">
      <section class="resource-panel">
        <header>
          <h2>{{ selectedResource.name }}</h2>
          <button type="button" @click="selectedResource = null">关闭</button>
        </header>
        <textarea
          v-if="selectedResource.type !== 'html-demo'"
          v-model="selectedResource.content"
          aria-label="资源内容"
        />
        <div v-else class="html-preview">
          <strong>预览</strong>
          <p>{{ selectedResource.content }}</p>
        </div>
        <label class="field">
          <span>建议后重新生成</span>
          <input v-model="suggestionText" placeholder="补充生成建议" />
        </label>
        <div class="modal-actions">
          <button type="button" @click="saveSelectedResource">保存</button>
          <button type="button" @click="regenerateWithSuggestion">按建议重生成</button>
        </div>
      </section>
    </div>
  </section>
</template>
