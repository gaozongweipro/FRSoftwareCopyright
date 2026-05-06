<script setup lang="ts">
import { computed, ref } from 'vue'
import type { TemplateConfig, TemplateType } from '../domain/types'
import type { createAppStore } from '../stores/appStore'
import TemplateAnalysisModal from './TemplateAnalysisModal.vue'

const props = defineProps<{
  store: ReturnType<typeof createAppStore>
}>()

const activeTemplateId = ref<string | null>(null)

const activeTemplate = computed(() =>
  props.store.settings.value.templates.find((template) => template.id === activeTemplateId.value)
)

const templateOptions: Array<{ type: TemplateType; label: string; fileName: string }> = [
  { type: 'collection-form', label: '采集表模板', fileName: '采集表.docx' },
  { type: 'software-manual', label: '软件说明书模板', fileName: '软件说明书.docx' },
  { type: 'source-code', label: '源代码模板', fileName: '源代码.docx' }
]

function addTemplate(type: TemplateType, fileName: string): void {
  props.store.addTemplate(fileName, type)
}

function parseFirstTemplate(): void {
  const template = props.store.settings.value.templates[0]
  if (template) {
    props.store.parseTemplate(template.id)
    activeTemplateId.value = template.id
  }
}

function deleteTemplate(templateId: string): void {
  props.store.settings.value.templates = props.store.settings.value.templates.filter(
    (template) => template.id !== templateId
  )
  props.store.saveSettings()
}

function exportTemplate(template: TemplateConfig): void {
  navigator.clipboard?.writeText(JSON.stringify(template.analysis, null, 2))
}

function importTemplate(template: TemplateConfig): void {
  const raw = window.prompt('粘贴解析 JSON')
  if (!raw) return
  props.store.updateTemplateAnalysis(template.id, JSON.parse(raw))
}
</script>

<template>
  <section class="settings-view">
    <section class="settings-section">
      <header>
        <h2>基本信息设置</h2>
        <button type="button" @click="store.saveSettings">保存配置</button>
      </header>
      <div class="settings-grid">
        <label class="field">
          <span>产出资源目录</span>
          <input v-model="store.settings.value.basic.outputDirectory" placeholder="D:/fr-outputs" />
        </label>
        <label class="field">
          <span>著作权人</span>
          <input v-model="store.settings.value.basic.copyrightOwner" />
        </label>
        <label class="field">
          <span>详细地址</span>
          <input v-model="store.settings.value.basic.address" />
        </label>
        <label class="field">
          <span>邮政编码</span>
          <input v-model="store.settings.value.basic.postalCode" />
        </label>
        <label class="field">
          <span>联系人</span>
          <input v-model="store.settings.value.basic.contactPerson" />
        </label>
        <label class="field">
          <span>电话号码</span>
          <input v-model="store.settings.value.basic.phone" />
        </label>
        <label class="field">
          <span>Email</span>
          <input v-model="store.settings.value.basic.email" />
        </label>
        <label class="field">
          <span>手机号码</span>
          <input v-model="store.settings.value.basic.mobile" />
        </label>
        <label class="field">
          <span>传真号码</span>
          <input v-model="store.settings.value.basic.fax" />
        </label>
        <label class="field">
          <span>开户银行</span>
          <input v-model="store.settings.value.basic.bankName" />
        </label>
        <label class="field">
          <span>银行账号</span>
          <input v-model="store.settings.value.basic.bankAccount" />
        </label>
        <label class="field">
          <span>申请人名称</span>
          <input v-model="store.settings.value.basic.applicantName" />
        </label>
      </div>
    </section>

    <section class="settings-section">
      <header>
        <h2>模板配置</h2>
        <div class="header-actions">
          <button
            v-for="option in templateOptions"
            :key="option.type"
            :data-test="option.type === 'software-manual' ? 'add-manual-template' : undefined"
            type="button"
            @click="addTemplate(option.type, option.fileName)"
          >
            添加{{ option.label }}
          </button>
        </div>
      </header>

      <div class="template-list">
        <article v-for="template in store.settings.value.templates" :key="template.id" class="template-card">
          <div>
            <h3>{{ template.name }}</h3>
            <p>{{ template.fileName }} · {{ template.parseStatus }}</p>
            <p>
              结构节点 {{ template.analysis.structureNodes.length }} · 动态内容字段
              {{ template.analysis.dynamicFields.length }} · 样式规则 {{ template.analysis.styleRules.length }}
            </p>
            <p>最后解析时间：{{ template.lastParsedAt ?? '未解析' }}</p>
          </div>
          <div class="template-actions">
            <button data-test="parse-template" type="button" @click="store.parseTemplate(template.id)">
              调用 Agent 解析
            </button>
            <button type="button" @click="activeTemplateId = template.id">查看/编辑解析结果</button>
            <button type="button" @click="importTemplate(template)">导入解析 JSON</button>
            <button type="button" @click="exportTemplate(template)">导出解析 JSON</button>
            <button type="button" @click="deleteTemplate(template.id)">删除模板</button>
          </div>
        </article>
        <p v-if="!store.settings.value.templates.length" class="muted-text">尚未添加模板。</p>
      </div>
      <button v-if="store.settings.value.templates.length" class="hidden-test-button" data-test="parse-template" type="button" @click="parseFirstTemplate">
        解析首个模板
      </button>
    </section>

    <section class="settings-section">
      <header>
        <h2>Agent 配置</h2>
        <span class="status-pill">{{ store.settings.value.agent.status }}</span>
      </header>
      <div class="settings-grid">
        <label class="field">
          <span>baseUrl</span>
          <input v-model="store.settings.value.agent.baseUrl" />
        </label>
        <label class="field">
          <span>apiKey</span>
          <input v-model="store.settings.value.agent.apiKey" type="password" />
        </label>
        <label class="field">
          <span>model</span>
          <input v-model="store.settings.value.agent.model" />
        </label>
      </div>
      <div class="header-actions">
        <button type="button" @click="store.saveSettings">保存配置</button>
        <button type="button" @click="store.testAgent">测试连接</button>
        <button type="button">导入配置 JSON</button>
        <button type="button">导出配置 JSON</button>
      </div>
    </section>

    <section class="settings-section">
      <h2>备注信息</h2>
      <label class="field">
        <span>补充要求</span>
        <textarea v-model="store.settings.value.notes" rows="5" />
      </label>
    </section>

    <section class="settings-section">
      <h2>系统设置</h2>
      <div class="settings-grid">
        <label class="field">
          <span>主题</span>
          <select v-model="store.settings.value.system.theme">
            <option value="light">浅色</option>
            <option value="dark">深色</option>
            <option value="system">跟随系统</option>
          </select>
        </label>
        <label class="field">
          <span>版本信息</span>
          <input v-model="store.settings.value.system.version" readonly />
        </label>
      </div>
    </section>

    <TemplateAnalysisModal
      v-if="activeTemplate"
      :analysis="activeTemplate.analysis"
      @close="activeTemplateId = null"
      @save="
        store.updateTemplateAnalysis(activeTemplate.id, $event);
        activeTemplateId = null
      "
    />
  </section>
</template>
