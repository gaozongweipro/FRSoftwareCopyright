<script setup lang="ts">
import { ref, watch } from 'vue'
import type { TemplateAnalysis } from '../domain/types'

const props = defineProps<{
  analysis: TemplateAnalysis
}>()

const emit = defineEmits<{
  close: []
  save: [analysis: TemplateAnalysis]
}>()

const draft = ref<TemplateAnalysis>(cloneAnalysis(props.analysis))

watch(
  () => props.analysis,
  (analysis) => {
    draft.value = cloneAnalysis(analysis)
  }
)

function cloneAnalysis(analysis: TemplateAnalysis): TemplateAnalysis {
  return JSON.parse(JSON.stringify(analysis)) as TemplateAnalysis
}
</script>

<template>
  <div class="modal-backdrop" role="dialog" aria-modal="true">
    <section class="analysis-panel">
      <header>
        <div>
          <h2>模板解析结果</h2>
          <p>{{ draft.summary }}</p>
        </div>
        <button type="button" @click="emit('close')">关闭</button>
      </header>

      <section class="analysis-section">
        <h3>结构节点</h3>
        <article v-for="node in draft.structureNodes" :key="node.id" class="analysis-row">
          <label class="check-field">
            <input v-model="node.enabled" type="checkbox" />
            <span>启用</span>
          </label>
          <label class="field">
            <span>节点名称</span>
            <input v-model="node.name" />
          </label>
          <label class="field">
            <span>节点用途</span>
            <input v-model="node.purpose" />
          </label>
        </article>
      </section>

      <section class="analysis-section">
        <h3>动态内容字段</h3>
        <article v-for="field in draft.dynamicFields" :key="field.key" class="analysis-row">
          <label class="check-field">
            <input v-model="field.enabled" type="checkbox" />
            <span>启用</span>
          </label>
          <label class="field">
            <span>字段说明</span>
            <input v-model="field.label" />
          </label>
          <label class="field">
            <span>生成说明</span>
            <input v-model="field.instruction" />
          </label>
        </article>
      </section>

      <section class="analysis-section">
        <h3>样式规则</h3>
        <article v-for="rule in draft.styleRules" :key="rule.id" class="style-row">
          <label class="field">
            <span>作用对象</span>
            <input v-model="rule.target" />
          </label>
          <label class="field">
            <span>字体</span>
            <input v-model="rule.fontFamily" />
          </label>
          <label class="field">
            <span>字号</span>
            <input v-model.number="rule.fontSize" type="number" />
          </label>
          <label class="field">
            <span>行间距</span>
            <input v-model.number="rule.lineHeight" type="number" step="0.1" />
          </label>
        </article>
      </section>

      <div class="modal-actions">
        <button type="button" @click="emit('close')">取消</button>
        <button type="button" @click="emit('save', draft)">保存解析结果</button>
      </div>
    </section>
  </div>
</template>
