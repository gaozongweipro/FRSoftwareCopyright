# Soft Copyright Front Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Vue single-page front-end prototype that demonstrates the full soft-copyright generation workflow with simulated data, validation, settings, resource review, and history replay.

**Architecture:** The app is a Vite + Vue 3 + TypeScript SPA. Domain logic lives in focused TypeScript modules under `src/domain` and `src/stores`, while Vue components consume those modules for dashboard, settings, history, and resource modal interactions. Data persistence uses `localStorage` through one storage adapter so later Tauri/file-system integration can replace it cleanly.

**Tech Stack:** Vue 3, TypeScript, Vite, Vitest, Vue Test Utils, CSS modules through scoped/plain CSS, browser `localStorage`.

---

## Scope Check

The approved spec covers one cohesive prototype: a single SPA with dashboard, settings, history, simulated generation, resource interactions, and local persistence. It should be implemented as one plan because every subsystem supports the same demo flow and shares the same domain model.

## File Structure

- Create: `package.json`  
  Defines scripts and dependencies.
- Create: `index.html`  
  Vite entry shell.
- Create: `vite.config.ts`  
  Vite and Vitest configuration.
- Create: `tsconfig.json`, `tsconfig.node.json`  
  TypeScript configuration.
- Create: `src/main.ts`  
  Mounts the Vue app.
- Create: `src/App.vue`  
  Top-level layout and page navigation.
- Create: `src/styles.css`  
  Global desktop-first styling.
- Create: `src/domain/types.ts`  
  Shared settings, template, task, resource, history, and validation types.
- Create: `src/domain/mockData.ts`  
  Deterministic demo content and template parsing output builders.
- Create: `src/domain/generation.ts`  
  Validation, task creation, node regeneration, zip simulation, and statistics logic.
- Create: `src/domain/storage.ts`  
  Versioned localStorage adapter.
- Create: `src/stores/appStore.ts`  
  Reactive app state facade used by Vue components.
- Create: `src/components/AppNav.vue`  
  Main navigation.
- Create: `src/components/DashboardView.vue`  
  Home workspace: input, validation, flow, results.
- Create: `src/components/SettingsView.vue`  
  Basic info, template config, Agent config, notes, system settings.
- Create: `src/components/HistoryView.vue`  
  History list, delete, and load behavior.
- Create: `src/components/ResourceModal.vue`  
  Resource preview/edit/regenerate interactions.
- Create: `src/components/TemplateAnalysisModal.vue`  
  Template structure/style analysis editor.
- Create: `src/components/ToastStack.vue`  
  Non-blocking feedback messages.
- Create: `src/test/setup.ts`  
  Vitest DOM setup.
- Create tests under `src/domain/*.test.ts` and `src/components/*.test.ts`.

## Task 1: Scaffold Vite Vue App

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `src/main.ts`
- Create: `src/App.vue`
- Create: `src/styles.css`
- Create: `src/test/setup.ts`

- [ ] **Step 1: Create package manifest**

Create `package.json` with:

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

- [ ] **Step 2: Add Vite and TypeScript config**

Create `vite.config.ts`:

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

Create `tsconfig.json`:

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

Create `tsconfig.node.json`:

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

- [ ] **Step 3: Add app entry**

Create `index.html`, `src/main.ts`, `src/test/setup.ts`, a temporary `src/App.vue`, and `src/styles.css` so the app renders a shell title.

- [ ] **Step 4: Install dependencies**

Run: `npm install`

Expected: `package-lock.json` is created and npm exits with code 0.

- [ ] **Step 5: Verify scaffold**

Run: `npm run build`

Expected: TypeScript passes and Vite emits `dist/`.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json index.html vite.config.ts tsconfig.json tsconfig.node.json src
git commit -m "chore: scaffold vue prototype app"
```

## Task 2: Domain Model, Mock Data, and Persistence

**Files:**
- Create: `src/domain/types.ts`
- Create: `src/domain/mockData.ts`
- Create: `src/domain/storage.ts`
- Create: `src/domain/storage.test.ts`
- Create: `src/domain/mockData.test.ts`

- [ ] **Step 1: Write type and mock-data tests**

Create `src/domain/mockData.test.ts`:

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

Create `src/domain/storage.test.ts`:

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

- [ ] **Step 2: Run tests to verify failure**

Run: `npm run test -- src/domain/mockData.test.ts src/domain/storage.test.ts`

Expected: FAIL because the modules do not exist.

- [ ] **Step 3: Implement domain types**

Create `src/domain/types.ts` with explicit unions for `PageId`, `TemplateType`, `ResourceType`, `NodeStatus`, and interfaces for settings, template analysis, resources, generation tasks, validation issues, and history records. Include `AgentConfig.status` as `'untested' | 'available' | 'unavailable'`.

- [ ] **Step 4: Implement mock data builders**

Create `src/domain/mockData.ts` with:

```ts
export function createInitialSettings(): AppSettings
export function createDemoTemplateAnalysis(type: TemplateType): TemplateAnalysis
export function createDemoTemplate(fileName: string, type: TemplateType): TemplateConfig
export function buildDocumentContent(title: string, resourceName: string): string
```

The template analysis must include structure nodes for cover, catalog, chapter, table, screenshot area, source area, and appendix; dynamic fields for project name, copyright owner, features, architecture, page flow, source code, screenshot notes, and generated date; style rules for font family, size, color, paragraph spacing, line height, alignment, title level, numbering, and table cell style.

- [ ] **Step 5: Implement storage adapter**

Create `src/domain/storage.ts`:

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

- [ ] **Step 6: Verify tests pass**

Run: `npm run test -- src/domain/mockData.test.ts src/domain/storage.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/domain
git commit -m "feat: add prototype domain model and persistence"
```

## Task 3: Generation Validation and Simulated Workflow

**Files:**
- Create: `src/domain/generation.ts`
- Create: `src/domain/generation.test.ts`

- [ ] **Step 1: Write generation tests**

Create `src/domain/generation.test.ts`:

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

- [ ] **Step 2: Run tests to verify failure**

Run: `npm run test -- src/domain/generation.test.ts`

Expected: FAIL because `generation.ts` does not exist.

- [ ] **Step 3: Implement validation and task builders**

Create `src/domain/generation.ts` with:

```ts
export function validateGenerationStart(title: string, settings: AppSettings): ValidationIssue[]
export function createGenerationTask(title: string, systemType: SystemType, settings: AppSettings): GenerationTask
export function regenerateResource(task: GenerationTask, resourceId: string, suggestion?: string): GenerationTask
export function compressTask(task: GenerationTask): GenerationTask
export function calculateTaskStats(task: GenerationTask): TaskStats
```

Validation must return issues in this order: title, output directory, template, Agent. `createGenerationTask` must create fixed analysis/code/image stages and a dynamic document stage from `settings.templates`.

- [ ] **Step 4: Verify tests pass**

Run: `npm run test -- src/domain/generation.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/generation.ts src/domain/generation.test.ts
git commit -m "feat: add simulated generation workflow"
```

## Task 4: Reactive App Store

**Files:**
- Create: `src/stores/appStore.ts`
- Create: `src/stores/appStore.test.ts`

- [ ] **Step 1: Write store tests**

Create `src/stores/appStore.test.ts`:

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

- [ ] **Step 2: Run tests to verify failure**

Run: `npm run test -- src/stores/appStore.test.ts`

Expected: FAIL because store does not exist.

- [ ] **Step 3: Implement store facade**

Create `src/stores/appStore.ts` with a `createAppStore()` function returning Vue refs and actions:

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

For the prototype, `testAgent()` sets status to `available` when baseUrl, apiKey, and model are non-empty; otherwise it sets `unavailable`.

- [ ] **Step 4: Verify tests pass**

Run: `npm run test -- src/stores/appStore.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/stores
git commit -m "feat: add reactive prototype store"
```

## Task 5: App Shell, Dashboard, and Results

**Files:**
- Modify: `src/App.vue`
- Create: `src/components/AppNav.vue`
- Create: `src/components/DashboardView.vue`
- Create: `src/components/ToastStack.vue`
- Create: `src/components/DashboardView.test.ts`

- [ ] **Step 1: Write dashboard component tests**

Create `src/components/DashboardView.test.ts`:

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

- [ ] **Step 2: Run test to verify failure**

Run: `npm run test -- src/components/DashboardView.test.ts`

Expected: FAIL because component does not exist.

- [ ] **Step 3: Implement shell components**

Implement `App.vue` as the app shell with a single store instance and conditional rendering for dashboard, settings, and history pages. Implement `AppNav.vue` with three buttons: 首页, 设置, 历史记录.

- [ ] **Step 4: Implement dashboard**

`DashboardView.vue` must render:

- Title input.
- System type select defaulting to Web 端.
- Start button with `data-test="start-generation"`.
- Validation issue panel with jump buttons to settings.
- Result summary with project address, document address, zip state, and statistics.
- Four-stage workflow display.
- Node actions: preview/edit, regenerate, suggest regenerate.

- [ ] **Step 5: Verify dashboard test and build**

Run: `npm run test -- src/components/DashboardView.test.ts`

Expected: PASS.

Run: `npm run build`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/App.vue src/components src/styles.css
git commit -m "feat: build dashboard workflow shell"
```

## Task 6: Settings and Template Analysis UI

**Files:**
- Create: `src/components/SettingsView.vue`
- Create: `src/components/TemplateAnalysisModal.vue`
- Create: `src/components/SettingsView.test.ts`

- [ ] **Step 1: Write settings tests**

Create `src/components/SettingsView.test.ts`:

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

- [ ] **Step 2: Run test to verify failure**

Run: `npm run test -- src/components/SettingsView.test.ts`

Expected: FAIL because component does not exist.

- [ ] **Step 3: Implement settings sections**

`SettingsView.vue` must render sections for basic information, template config, Agent config, notes, and system settings. Include all company fields from the spec and persist on save.

- [ ] **Step 4: Implement template analysis modal**

`TemplateAnalysisModal.vue` must allow editing structure node names, dynamic field descriptions, style rule values, and `enabled` state. It must not show placeholder wording, one-key validation, or one-key repair controls.

- [ ] **Step 5: Verify**

Run: `npm run test -- src/components/SettingsView.test.ts`

Expected: PASS.

Run: `npm run build`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/SettingsView.vue src/components/TemplateAnalysisModal.vue src/components/SettingsView.test.ts
git commit -m "feat: add settings and template analysis UI"
```

## Task 7: Resource Modal and History Replay

**Files:**
- Create: `src/components/ResourceModal.vue`
- Create: `src/components/HistoryView.vue`
- Create: `src/components/ResourceModal.test.ts`
- Create: `src/components/HistoryView.test.ts`

- [ ] **Step 1: Write resource modal tests**

Create `src/components/ResourceModal.test.ts`:

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

- [ ] **Step 2: Write history tests**

Create `src/components/HistoryView.test.ts`:

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

- [ ] **Step 3: Run tests to verify failure**

Run: `npm run test -- src/components/ResourceModal.test.ts src/components/HistoryView.test.ts`

Expected: FAIL because components do not exist.

- [ ] **Step 4: Implement resource modal**

The modal must:

- Render textareas only for document and image-note resources.
- Render preview-only controls for `html-demo`.
- Render regenerate and suggestion controls for every resource.
- Show suggestion history.

- [ ] **Step 5: Implement history**

`HistoryView.vue` must render title, system type, status, generated time, template count, resource count, duration, load action, and delete action. Loading history must restore the task in dashboard.

- [ ] **Step 6: Verify**

Run: `npm run test -- src/components/ResourceModal.test.ts src/components/HistoryView.test.ts`

Expected: PASS.

Run: `npm run build`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/ResourceModal.vue src/components/HistoryView.vue src/components/*Modal.test.ts src/components/HistoryView.test.ts
git commit -m "feat: add resource modal and history replay"
```

## Task 8: Full Prototype Polish and Acceptance Verification

**Files:**
- Modify: `src/styles.css`
- Modify: `src/App.vue`
- Modify: `src/components/*.vue`
- Create: `README.md`

- [ ] **Step 1: Add README**

Create `README.md` with:

```md
# FRSoftwareCopyright

软著生成工具前端演示原型。首版使用 Vue 3 + Vite + TypeScript 实现，不接真实 Agent，不写真实本地文件，使用模拟数据演示从标题输入、配置校验、模板解析、资源生成到历史回放的完整流程。

## Commands

- `npm install`
- `npm run dev`
- `npm run test`
- `npm run build`
```

- [ ] **Step 2: Polish desktop layout**

Ensure the UI is restrained and desktop-tool-like:

- No marketing hero.
- Dashboard execution area is visually dominant.
- Settings and history use dense, scannable panels.
- No whole-app horizontal overflow at 1366px width.
- Buttons and labels do not overlap at narrow desktop widths.

- [ ] **Step 3: Run full tests**

Run: `npm run test`

Expected: all tests PASS.

- [ ] **Step 4: Run production build**

Run: `npm run build`

Expected: TypeScript and Vite build PASS.

- [ ] **Step 5: Start dev server for manual review**

Run: `npm run dev`

Expected: Vite prints a local URL, usually `http://127.0.0.1:5173/`.

- [ ] **Step 6: Manual acceptance checklist**

In the browser:

- Start generation with empty state and confirm validation lists title, output directory, template, and Agent configuration.
- Configure output directory.
- Add and parse one software manual template.
- Fill Agent config and test it as available.
- Generate a task and confirm the document stage only contains the configured template output.
- Open HTML demo resource and confirm there is no code editor.
- Regenerate a resource with a suggestion and confirm the suggestion history appears.
- Compress output and confirm zip path appears.
- Refresh the browser and confirm settings/history persist.
- Load a history item and confirm the dashboard restores that task.

- [ ] **Step 7: Commit**

```bash
git add README.md src
git commit -m "feat: polish prototype and document usage"
```

## Final Verification

Run:

```bash
npm run test
npm run build
git status --short
```

Expected:

- `npm run test` passes.
- `npm run build` passes.
- `git status --short` is empty unless the dev server generated ignored output.

## Spec Coverage Review

- Homepage input and generation button: Task 5.
- Required validation including output directory: Tasks 3 and 5.
- Four-stage workflow: Tasks 3 and 5.
- Node regenerate and suggestion regenerate: Tasks 3, 5, and 7.
- Resource editing/preview with HTML preview-only rule: Task 7.
- Dynamic document generation from configured templates: Task 3.
- Result summary and zip simulation: Tasks 3 and 5.
- Settings page including basic info, templates, Agent, notes, system settings: Task 6.
- Agent-based ordinary docx template analysis with Word style metadata: Tasks 2 and 6.
- No one-key validation or repair controls: Task 6.
- History list, delete, and load: Task 7.
- localStorage persistence: Tasks 2 and 4.
- Acceptance verification: Task 8.
