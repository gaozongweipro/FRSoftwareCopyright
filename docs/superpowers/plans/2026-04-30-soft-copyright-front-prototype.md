# 软著生成工具前端原型实施计划

> **给 agentic workers：** 必须使用子技能：推荐使用 `superpowers:subagent-driven-development`，也可以使用 `superpowers:executing-plans`，按任务逐步实施本计划。步骤使用复选框（`- [x]`）语法跟踪。

**目标：** 构建一个 Vue 单页前端原型，用模拟数据演示完整软著生成流程，包括生成前校验、设置配置、资源查看、资源重生成和历史回放。

**架构：** 应用采用 Vite + Vue 3 + TypeScript SPA。领域逻辑放在 `src/domain` 和 `src/stores` 下的聚焦 TypeScript 模块中，Vue 组件负责消费这些模块并实现首页工作台、设置、历史记录和资源弹窗交互。数据持久化统一通过一个 `localStorage` 适配器完成，便于后续替换成 Tauri 或本地文件系统集成。

**技术栈：** Vue 3、TypeScript、Vite、Vitest、Vue Test Utils、普通 CSS 或 scoped CSS、浏览器 `localStorage`。

---

## 范围检查

已确认的设计文档覆盖的是一个统一的前端原型：单页应用中包含首页工作台、设置、历史记录、模拟生成、资源交互和本地持久化。所有子系统服务于同一个演示流程，并共享同一套领域模型，因此作为一个实施计划推进。

## 文件结构

- 创建：`package.json`  
  定义脚本和依赖。
- 创建：`index.html`  
  Vite 入口页面。
- 创建：`vite.config.ts`  
  Vite 和 Vitest 配置。
- 创建：`tsconfig.json`、`tsconfig.node.json`  
  TypeScript 配置。
- 创建：`src/main.ts`  
  挂载 Vue 应用。
- 创建：`src/App.vue`  
  顶层布局和页面导航。
- 创建：`src/styles.css`  
  全局桌面端优先样式。
- 创建：`src/domain/types.ts`  
  共享的设置、模板、任务、资源、历史记录和校验类型。
- 创建：`src/domain/mockData.ts`  
  确定性的演示内容和模板解析结果构造器。
- 创建：`src/domain/generation.ts`  
  校验、任务创建、节点重生成、压缩包模拟和统计逻辑。
- 创建：`src/domain/storage.ts`  
  带版本命名空间的 localStorage 适配器。
- 创建：`src/stores/appStore.ts`  
  供 Vue 组件使用的响应式应用状态门面。
- 创建：`src/components/AppNav.vue`  
  主导航。
- 创建：`src/components/DashboardView.vue`  
  首页工作台：输入、校验、流程和结果。
- 创建：`src/components/SettingsView.vue`  
  基本信息、模板配置、Agent 配置、备注和系统设置。
- 创建：`src/components/HistoryView.vue`  
  历史列表、删除和加载行为。
- 创建：`src/components/ResourceModal.vue`  
  资源预览、编辑和重生成交互。
- 创建：`src/components/TemplateAnalysisModal.vue`  
  模板结构和样式解析结果编辑器。
- 创建：`src/components/ToastStack.vue`  
  非阻塞反馈消息。
- 创建：`src/test/setup.ts`  
  Vitest DOM 测试设置。
- 在 `src/domain/*.test.ts` 和 `src/components/*.test.ts` 下创建测试。

## 任务 1：搭建 Vite Vue 应用脚手架

**文件：**
- 创建：`package.json`
- 创建：`index.html`
- 创建：`vite.config.ts`
- 创建：`tsconfig.json`
- 创建：`tsconfig.node.json`
- 创建：`src/main.ts`
- 创建：`src/App.vue`
- 创建：`src/styles.css`
- 创建：`src/test/setup.ts`

- [x] **步骤 1：创建 package manifest**

创建 `package.json`：

```json
{
  "name": "fr-software-copyright",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "build": "vue-tsc -b && vite build",
    "preview": "vite preview --host 127.0.0.1",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@vitejs/plugin-vue": "^5.2.3",
    "vue": "^3.5.13"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@vue/test-utils": "^2.4.6",
    "jsdom": "^25.0.1",
    "typescript": "^5.8.3",
    "vite": "^6.3.4",
    "vitest": "^3.1.2",
    "vue-tsc": "^2.2.10"
  }
}
```

- [x] **步骤 2：添加 Vite 和 TypeScript 配置**

创建 `vite.config.ts`：

```ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true
  }
})
```

创建 `tsconfig.json`：

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "Bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "preserve",
    "strict": true
  },
  "include": ["src/**/*.ts", "src/**/*.vue"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

创建 `tsconfig.node.json`：

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

- [x] **步骤 3：添加应用入口**

创建 `index.html`、`src/main.ts`、`src/test/setup.ts`、临时的 `src/App.vue` 和 `src/styles.css`，让应用能渲染一个基础 shell 标题。

- [x] **步骤 4：安装依赖**

运行：`npm install`

预期：生成 `package-lock.json`，并且 npm 以 code 0 退出。

- [x] **步骤 5：验证脚手架**

运行：`npm run build`

预期：TypeScript 通过，Vite 输出 `dist/`。

- [x] **步骤 6：提交**

```bash
git add package.json package-lock.json index.html vite.config.ts tsconfig.json tsconfig.node.json src
git commit -m "chore: scaffold vue prototype app"
```

## 任务 2：领域模型、模拟数据和持久化

**文件：**
- 创建：`src/domain/types.ts`
- 创建：`src/domain/mockData.ts`
- 创建：`src/domain/storage.ts`
- 创建：`src/domain/storage.test.ts`
- 创建：`src/domain/mockData.test.ts`

- [x] **步骤 1：编写类型和模拟数据测试**

创建 `src/domain/mockData.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { createDemoTemplateAnalysis, createInitialSettings } from './mockData'

describe('mock data builders', () => {
  it('creates settings with no output directory by default so validation can block generation', () => {
    const settings = createInitialSettings()
    expect(settings.basic.outputDirectory).toBe('')
    expect(settings.agent.status).toBe('untested')
  })

  it('creates agent-style template analysis with structure, dynamic fields, and Word styles', () => {
    const analysis = createDemoTemplateAnalysis('software-manual')
    expect(analysis.structureNodes.length).toBeGreaterThan(3)
    expect(analysis.dynamicFields.map((field) => field.key)).toContain('projectName')
    expect(analysis.styleRules.some((rule) => rule.fontFamily && rule.lineHeight)).toBe(true)
  })
})
```

创建 `src/domain/storage.test.ts`：

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { createStorageAdapter } from './storage'

describe('storage adapter', () => {
  beforeEach(() => localStorage.clear())

  it('returns fallback data when no value exists', () => {
    const storage = createStorageAdapter('fr-test')
    expect(storage.load('settings', { name: 'fallback' })).toEqual({ name: 'fallback' })
  })

  it('round-trips JSON values under a versioned namespace', () => {
    const storage = createStorageAdapter('fr-test')
    storage.save('settings', { outputDirectory: 'D:/outputs' })
    expect(storage.load('settings', null)).toEqual({ outputDirectory: 'D:/outputs' })
  })
})
```

- [x] **步骤 2：运行测试确认失败**

运行：`npm run test -- src/domain/mockData.test.ts src/domain/storage.test.ts`

预期：失败，因为相关模块尚不存在。

- [x] **步骤 3：实现领域类型**

创建 `src/domain/types.ts`，显式定义 `PageId`、`TemplateType`、`ResourceType`、`NodeStatus` 等 union，并定义设置、模板解析、资源、生成任务、校验问题和历史记录接口。`AgentConfig.status` 必须是 `'untested' | 'available' | 'unavailable'`。

- [x] **步骤 4：实现模拟数据构造器**

创建 `src/domain/mockData.ts`，包含：

```ts
export function createInitialSettings(): AppSettings
export function createDemoTemplateAnalysis(type: TemplateType): TemplateAnalysis
export function createDemoTemplate(fileName: string, type: TemplateType): TemplateConfig
export function buildDocumentContent(title: string, resourceName: string): string
```

模板解析必须包含以下内容：封面、目录、章节、表格、截图区域、源码区域和附录等结构节点；项目名称、著作权人、功能、架构、页面流程、源码、截图说明和生成日期等动态字段；字体、字号、颜色、段落间距、行间距、对齐方式、标题层级、编号和表格单元格样式等样式规则。

- [x] **步骤 5：实现 storage adapter**

创建 `src/domain/storage.ts`：

```ts
export function createStorageAdapter(namespace: string) {
  return {
    load<T>(key: string, fallback: T): T {
      const raw = localStorage.getItem(`${namespace}:v1:${key}`)
      if (!raw) return fallback
      try {
        return JSON.parse(raw) as T
      } catch {
        return fallback
      }
    },
    save<T>(key: string, value: T): void {
      localStorage.setItem(`${namespace}:v1:${key}`, JSON.stringify(value))
    },
    remove(key: string): void {
      localStorage.removeItem(`${namespace}:v1:${key}`)
    }
  }
}
```

- [x] **步骤 6：确认测试通过**

运行：`npm run test -- src/domain/mockData.test.ts src/domain/storage.test.ts`

预期：PASS。

- [x] **步骤 7：提交**

```bash
git add src/domain
git commit -m "feat: add prototype domain model and persistence"
```

## 任务 3：生成前校验和模拟生成流程

**文件：**
- 创建：`src/domain/generation.ts`
- 创建：`src/domain/generation.test.ts`

- [x] **步骤 1：编写生成流程测试**

创建 `src/domain/generation.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { createDemoTemplate, createInitialSettings } from './mockData'
import { createGenerationTask, regenerateResource, validateGenerationStart } from './generation'

describe('generation workflow', () => {
  it('blocks generation when title, output directory, template, or agent availability is missing', () => {
    const settings = createInitialSettings()
    const issues = validateGenerationStart('', settings)
    expect(issues.map((issue) => issue.code)).toEqual([
      'missing-title',
      'missing-output-directory',
      'missing-template',
      'agent-unavailable'
    ])
  })

  it('creates document nodes only for configured templates', () => {
    const settings = createInitialSettings()
    settings.basic.outputDirectory = 'D:/fr-outputs'
    settings.agent = { baseUrl: 'https://api.example.com', apiKey: 'sk-demo', model: 'demo-model', status: 'available' }
    settings.templates = [createDemoTemplate('说明书.docx', 'software-manual')]

    const task = createGenerationTask('智慧仓储管理系统 V1.0', 'web', settings)

    const documentNames = task.stages
      .find((stage) => stage.id === 'document')!
      .nodes.map((node) => node.name)
    expect(documentNames).toEqual(['软件说明书'])
  })

  it('tracks suggestion-based regeneration on one resource only', () => {
    const settings = createInitialSettings()
    settings.basic.outputDirectory = 'D:/fr-outputs'
    settings.agent = { baseUrl: 'https://api.example.com', apiKey: 'sk-demo', model: 'demo-model', status: 'available' }
    settings.templates = [createDemoTemplate('采集表.docx', 'collection-form')]
    const task = createGenerationTask('客户关系管理平台 V1.0', 'web', settings)
    const resourceId = task.stages[0].nodes[0].resource.id

    const updated = regenerateResource(task, resourceId, '补充审批流程和角色权限说明')

    const resource = updated.stages[0].nodes[0].resource
    expect(resource.regenerateCount).toBe(1)
    expect(resource.suggestions[0].text).toContain('审批流程')
  })
})
```

- [x] **步骤 2：运行测试确认失败**

运行：`npm run test -- src/domain/generation.test.ts`

预期：失败，因为 `generation.ts` 尚不存在。

- [x] **步骤 3：实现校验和任务构造器**

创建 `src/domain/generation.ts`，包含：

```ts
export function validateGenerationStart(title: string, settings: AppSettings): ValidationIssue[]
export function createGenerationTask(title: string, systemType: SystemType, settings: AppSettings): GenerationTask
export function regenerateResource(task: GenerationTask, resourceId: string, suggestion?: string): GenerationTask
export function compressTask(task: GenerationTask): GenerationTask
export function calculateTaskStats(task: GenerationTask): TaskStats
```

校验问题必须按以下顺序返回：标题、产出资源目录、模板、Agent。`createGenerationTask` 必须创建固定的项目分析、项目编码、图片截取阶段，并根据 `settings.templates` 创建动态文档生成阶段。

- [x] **步骤 4：确认测试通过**

运行：`npm run test -- src/domain/generation.test.ts`

预期：PASS。

- [x] **步骤 5：提交**

```bash
git add src/domain/generation.ts src/domain/generation.test.ts
git commit -m "feat: add simulated generation workflow"
```

## 任务 4：响应式应用 Store

**文件：**
- 创建：`src/stores/appStore.ts`
- 创建：`src/stores/appStore.test.ts`

- [x] **步骤 1：编写 store 测试**

创建 `src/stores/appStore.test.ts`：

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { createAppStore } from './appStore'

describe('app store', () => {
  beforeEach(() => localStorage.clear())

  it('keeps generation blocked until required settings are configured', () => {
    const store = createAppStore()
    store.projectTitle.value = ''
    store.startGeneration()
    expect(store.validationIssues.value.map((issue) => issue.code)).toContain('missing-output-directory')
    expect(store.currentTask.value).toBeNull()
  })

  it('saves settings and restores them from localStorage', () => {
    const store = createAppStore()
    store.settings.value.basic.outputDirectory = 'D:/fr-outputs'
    store.persistAll()

    const restored = createAppStore()
    expect(restored.settings.value.basic.outputDirectory).toBe('D:/fr-outputs')
  })
})
```

- [x] **步骤 2：运行测试确认失败**

运行：`npm run test -- src/stores/appStore.test.ts`

预期：失败，因为 store 尚不存在。

- [x] **步骤 3：实现 store 门面**

创建 `src/stores/appStore.ts`，提供 `createAppStore()` 函数，返回 Vue refs 和 actions：

```ts
export function createAppStore() {
  const settings = ref(storage.load('settings', createInitialSettings()))
  const currentTask = ref<GenerationTask | null>(storage.load('currentTask', null))
  const history = ref<HistoryRecord[]>(storage.load('history', []))
  const page = ref<PageId>('dashboard')
  const projectTitle = ref('')
  const systemType = ref<SystemType>('web')
  const validationIssues = ref<ValidationIssue[]>([])

  function startGeneration(): void
  function saveSettings(): void
  function testAgent(): void
  function addTemplate(fileName: string, type: TemplateType): void
  function parseTemplate(templateId: string): void
  function updateTemplateAnalysis(templateId: string, analysis: TemplateAnalysis): void
  function regenerate(resourceId: string, suggestion?: string): void
  function saveResource(resourceId: string, content: string): void
  function compressCurrentTask(): void
  function loadHistory(recordId: string): void
  function deleteHistory(recordId: string): void
  function persistAll(): void
}
```

原型阶段，`testAgent()` 在 baseUrl、apiKey 和 model 都非空时将状态设为 `available`；否则设为 `unavailable`。

- [x] **步骤 4：确认测试通过**

运行：`npm run test -- src/stores/appStore.test.ts`

预期：PASS。

- [x] **步骤 5：提交**

```bash
git add src/stores
git commit -m "feat: add reactive prototype store"
```

## 任务 5：应用 Shell、首页工作台和结果区

**文件：**
- 修改：`src/App.vue`
- 创建：`src/components/AppNav.vue`
- 创建：`src/components/DashboardView.vue`
- 创建：`src/components/ToastStack.vue`
- 创建：`src/components/DashboardView.test.ts`

- [x] **步骤 1：编写首页组件测试**

创建 `src/components/DashboardView.test.ts`：

```ts
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import DashboardView from './DashboardView.vue'
import { createAppStore } from '../stores/appStore'

describe('DashboardView', () => {
  it('shows validation issues before generation starts', async () => {
    const store = createAppStore()
    const wrapper = mount(DashboardView, { props: { store } })
    await wrapper.find('[data-test="start-generation"]').trigger('click')
    expect(wrapper.text()).toContain('产出资源目录')
    expect(wrapper.text()).toContain('模板')
    expect(wrapper.text()).toContain('Agent')
  })
})
```

- [x] **步骤 2：运行测试确认失败**

运行：`npm run test -- src/components/DashboardView.test.ts`

预期：失败，因为组件尚不存在。

- [x] **步骤 3：实现 shell 组件**

将 `App.vue` 实现为应用 shell：创建单个 store 实例，并根据当前页面渲染首页、设置和历史记录。实现 `AppNav.vue`，包含三个按钮：首页、设置、历史记录。

- [x] **步骤 4：实现首页工作台**

`DashboardView.vue` 必须渲染：

- 标题输入。
- 系统类型选择，默认 Web 端。
- 带 `data-test="start-generation"` 的开始生成按钮。
- 带设置跳转按钮的校验问题面板。
- 包含项目地址、文档地址、压缩包状态和统计信息的结果摘要。
- 四阶段执行流程。
- 节点操作：预览/编辑、重新生成、建议重生成。

- [x] **步骤 5：验证首页测试和构建**

运行：`npm run test -- src/components/DashboardView.test.ts`

预期：PASS。

运行：`npm run build`

预期：PASS。

- [x] **步骤 6：提交**

```bash
git add src/App.vue src/components src/styles.css
git commit -m "feat: build dashboard workflow shell"
```

## 任务 6：设置页和模板解析 UI

**文件：**
- 创建：`src/components/SettingsView.vue`
- 创建：`src/components/TemplateAnalysisModal.vue`
- 创建：`src/components/SettingsView.test.ts`

- [x] **步骤 1：编写设置页测试**

创建 `src/components/SettingsView.test.ts`：

```ts
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import SettingsView from './SettingsView.vue'
import { createAppStore } from '../stores/appStore'

describe('SettingsView', () => {
  it('shows template parsing as agent analysis of ordinary docx structure and styles', async () => {
    const store = createAppStore()
    const wrapper = mount(SettingsView, { props: { store } })
    await wrapper.find('[data-test="add-manual-template"]').trigger('click')
    await wrapper.find('[data-test="parse-template"]').trigger('click')
    expect(wrapper.text()).toContain('结构节点')
    expect(wrapper.text()).toContain('动态内容字段')
    expect(wrapper.text()).toContain('样式规则')
  })
})
```

- [x] **步骤 2：运行测试确认失败**

运行：`npm run test -- src/components/SettingsView.test.ts`

预期：失败，因为组件尚不存在。

- [x] **步骤 3：实现设置分组**

`SettingsView.vue` 必须渲染基本信息、模板配置、Agent 配置、备注信息和系统设置。包含设计文档中的所有公司字段，并支持保存。

- [x] **步骤 4：实现模板解析弹窗**

`TemplateAnalysisModal.vue` 必须允许编辑结构节点名称、动态字段说明、样式规则值和 `enabled` 状态。不得出现占位符措辞、一键验证或一键修复控件。

- [x] **步骤 5：验证**

运行：`npm run test -- src/components/SettingsView.test.ts`

预期：PASS。

运行：`npm run build`

预期：PASS。

- [x] **步骤 6：提交**

```bash
git add src/components/SettingsView.vue src/components/TemplateAnalysisModal.vue src/components/SettingsView.test.ts
git commit -m "feat: add settings and template analysis UI"
```

## 任务 7：资源弹窗和历史回放

**文件：**
- 创建：`src/components/ResourceModal.vue`
- 创建：`src/components/HistoryView.vue`
- 创建：`src/components/ResourceModal.test.ts`
- 创建：`src/components/HistoryView.test.ts`

- [x] **步骤 1：编写资源弹窗测试**

创建 `src/components/ResourceModal.test.ts`：

```ts
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ResourceModal from './ResourceModal.vue'

describe('ResourceModal', () => {
  it('does not render an HTML code editor for html-demo resources', () => {
    const wrapper = mount(ResourceModal, {
      props: {
        resource: {
          id: 'html-1',
          type: 'html-demo',
          name: '演示 HTML 界面',
          content: '<main>demo</main>',
          previewLabel: '本地预览',
          generatedAt: '2026-04-30 12:00:00',
          regenerateCount: 0,
          suggestions: []
        }
      }
    })
    expect(wrapper.text()).toContain('预览')
    expect(wrapper.find('textarea').exists()).toBe(false)
  })
})
```

- [x] **步骤 2：编写历史记录测试**

创建 `src/components/HistoryView.test.ts`：

```ts
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import HistoryView from './HistoryView.vue'
import { createAppStore } from '../stores/appStore'

describe('HistoryView', () => {
  it('shows an empty state when no generation history exists', () => {
    const store = createAppStore()
    const wrapper = mount(HistoryView, { props: { store } })
    expect(wrapper.text()).toContain('暂无历史记录')
  })
})
```

- [x] **步骤 3：运行测试确认失败**

运行：`npm run test -- src/components/ResourceModal.test.ts src/components/HistoryView.test.ts`

预期：失败，因为组件尚不存在。

- [x] **步骤 4：实现资源弹窗**

弹窗必须满足：

- 只为文档类和图片说明类资源渲染 textarea。
- 为 `html-demo` 只渲染预览类控制。
- 为所有资源渲染重新生成和建议重生成控制。
- 显示建议历史。

- [x] **步骤 5：实现历史记录**

`HistoryView.vue` 必须渲染标题、系统类型、状态、生成时间、模板数量、资源数量、耗时、加载操作和删除操作。加载历史记录时必须恢复首页中的对应任务。

- [x] **步骤 6：验证**

运行：`npm run test -- src/components/ResourceModal.test.ts src/components/HistoryView.test.ts`

预期：PASS。

运行：`npm run build`

预期：PASS。

- [x] **步骤 7：提交**

```bash
git add src/components/ResourceModal.vue src/components/HistoryView.vue src/components/*Modal.test.ts src/components/HistoryView.test.ts
git commit -m "feat: add resource modal and history replay"
```

## 任务 8：完整原型打磨和验收验证

**文件：**
- 修改：`src/styles.css`
- 修改：`src/App.vue`
- 修改：`src/components/*.vue`
- 创建：`README.md`

- [x] **步骤 1：添加 README**

创建 `README.md`：

```md
# FRSoftwareCopyright

软著生成工具前端演示原型。首版使用 Vue 3 + Vite + TypeScript 实现，不接真实 Agent，不写真实本地文件，使用模拟数据演示从标题输入、配置校验、模板解析、资源生成到历史回放的完整流程。

## Commands

- `npm install`
- `npm run dev`
- `npm run test`
- `npm run build`
```

- [x] **步骤 2：打磨桌面端布局**

确保 UI 克制并符合桌面工具气质：

- 不做营销型 hero。
- 首页执行过程区域在视觉上占主导。
- 设置和历史记录使用紧凑、便于扫描的面板。
- 1366px 宽度下没有整页水平溢出。
- 较窄桌面宽度下按钮和标签不重叠。

- [x] **步骤 3：运行完整测试**

运行：`npm run test`

预期：全部测试 PASS。

- [x] **步骤 4：运行生产构建**

运行：`npm run build`

预期：TypeScript 和 Vite 构建 PASS。

- [x] **步骤 5：启动开发服务器供人工 review**

运行：`npm run dev`

预期：Vite 输出本地 URL，通常是 `http://127.0.0.1:5173/`。

- [x] **步骤 6：人工验收清单**

在浏览器中检查：

- 空状态点击开始生成，确认校验列出标题、产出资源目录、模板和 Agent 配置。
- 配置产出资源目录。
- 添加并解析一个软件说明书模板。
- 填写 Agent 配置并测试为可用。
- 生成任务，并确认文档生成阶段只包含已配置模板对应的产物。
- 打开 HTML 演示资源，确认没有代码编辑器。
- 带建议重生成一个资源，并确认建议历史出现。
- 点击压缩输出，并确认压缩包路径出现。
- 刷新浏览器，确认设置和历史记录仍保留。
- 加载一条历史记录，确认首页恢复该任务。

- [x] **步骤 7：提交**

```bash
git add README.md src
git commit -m "feat: polish prototype and document usage"
```

## 最终验证

运行：

```bash
npm run test
npm run build
git status --short
```

预期：

- `npm run test` 通过。
- `npm run build` 通过。
- 除非开发服务器生成了被忽略的输出，否则 `git status --short` 为空。

## 设计文档覆盖检查

- 首页输入和生成按钮：任务 5。
- 必要校验，包括产出资源目录：任务 3 和任务 5。
- 四阶段执行流程：任务 3 和任务 5。
- 节点重新生成和建议重生成：任务 3、任务 5 和任务 7。
- 资源编辑/预览，以及 HTML 只预览不编辑规则：任务 7。
- 根据配置模板动态生成文档：任务 3。
- 结果摘要和压缩包模拟：任务 3 和任务 5。
- 设置页，包括基本信息、模板、Agent、备注、系统设置：任务 6。
- 基于 Agent 的普通 docx 模板解析，以及 Word 样式元数据：任务 2 和任务 6。
- 不提供一键验证或一键修复控件：任务 6。
- 历史记录列表、删除和加载：任务 7。
- localStorage 持久化：任务 2 和任务 4。
- 验收验证：任务 8。
