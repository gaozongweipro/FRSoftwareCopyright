# Soft Copyright Runtime Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the completed front-end prototype so generation, template parsing, Agent testing, regeneration, and archive creation run through a runtime adapter and task event state machine instead of direct one-shot mock helpers.

**Architecture:** Keep Vue components thin, move task state transitions into pure domain helpers, and add `src/runtime` as the execution boundary. `mockRuntime` remains the default browser implementation, while Store actions consume runtime promises/events and persist resulting task/settings/history state.

**Tech Stack:** Vue 3, TypeScript, Vite, Vitest, Vue Test Utils, browser `localStorage`.

---

## File Structure

- Modify: `src/domain/types.ts`  
  Add runtime errors, task events, template parse errors, and optional failure metadata on templates/nodes/tasks.
- Modify: `src/domain/generation.ts`  
  Add `createInitialGenerationTask`, `applyTaskEvent`, `retryFailedNode`, and `canCompressTask`; keep existing helpers compatible where possible.
- Modify: `src/domain/generation.test.ts`  
  Extend tests for event progression, node failure, retry, and compression guard.
- Create: `src/runtime/types.ts`  
  Define `GenerationRuntime` and result/input contracts.
- Create: `src/runtime/mockRuntime.ts`  
  Implement async mock runtime using existing mock data and domain helpers.
- Create: `src/runtime/mockRuntime.test.ts`  
  Verify runtime returns stable events and failure-shaped results.
- Modify: `src/stores/appStore.ts`  
  Accept an optional runtime, make async actions, track operation state and errors, and apply task events.
- Modify: `src/stores/appStore.test.ts`  
  Verify Store calls runtime and handles success/failure.
- Modify: `src/components/DashboardView.vue`  
  Await async actions, show running/failed status, retry failed nodes, and guard compression.
- Modify: `src/components/DashboardView.test.ts`  
  Verify failed node text and compression disablement.
- Modify: `src/components/SettingsView.vue`  
  Await runtime-backed Agent/template actions and show parsing/test errors.
- Modify: `src/components/SettingsView.test.ts`  
  Verify parse failure does not crash and Agent unavailable is visible.
- Modify: `src/components/ResourceModal.vue`  
  Keep HTML preview-only behavior and surface regeneration failures through parent Store state.
- Modify: `README.md`  
  Document mock runtime and future Tauri runtime boundary.

## Task 1: Domain Event Model

**Files:**
- Modify: `src/domain/types.ts`
- Modify: `src/domain/generation.ts`
- Modify: `src/domain/generation.test.ts`

- [ ] **Step 1: Add failing tests for task events**

Add these tests to `src/domain/generation.test.ts`:

```ts
import {
  applyTaskEvent,
  canCompressTask,
  createInitialGenerationTask,
  retryFailedNode
} from './generation'

it('progresses a generated task through running and completed node events', () => {
  const settings = createInitialSettings()
  settings.basic.outputDirectory = 'D:/fr-outputs'
  settings.agent = { baseUrl: 'https://api.example.com', apiKey: 'sk-demo', model: 'demo-model', status: 'available' }
  settings.templates = [createDemoTemplate('说明书.docx', 'software-manual')]

  const task = createInitialGenerationTask('智慧仓储管理系统 V1.0', 'web', settings)
  const running = applyTaskEvent(task, { type: 'node-started', stageId: 'analysis', nodeId: 'analysis-function', at: '2026-05-06T00:00:00.000Z' })
  expect(running.status).toBe('running')
  expect(running.stages[0].nodes[0].status).toBe('running')

  const completed = applyTaskEvent(running, { type: 'node-completed', stageId: 'analysis', nodeId: 'analysis-function', at: '2026-05-06T00:00:01.000Z' })
  expect(completed.stages[0].nodes[0].status).toBe('completed')
})

it('records node failure details and can retry the failed node', () => {
  const settings = createInitialSettings()
  settings.basic.outputDirectory = 'D:/fr-outputs'
  settings.agent = { baseUrl: 'https://api.example.com', apiKey: 'sk-demo', model: 'demo-model', status: 'available' }
  settings.templates = [createDemoTemplate('说明书.docx', 'software-manual')]
  const task = createInitialGenerationTask('客户关系管理平台 V1.0', 'web', settings)

  const failed = applyTaskEvent(task, {
    type: 'node-failed',
    stageId: 'code',
    nodeId: 'code-html-demo',
    at: '2026-05-06T00:00:02.000Z',
    error: { code: 'mock-code-failed', message: '演示界面生成失败', recoverable: true }
  })
  expect(failed.status).toBe('needs-attention')
  expect(failed.stages[1].nodes[0].status).toBe('failed')
  expect(failed.stages[1].nodes[0].error?.message).toBe('演示界面生成失败')

  const retried = retryFailedNode(failed, 'resource-code-html-demo')
  expect(retried.stages[1].nodes[0].status).toBe('pending')
  expect(retried.stages[1].nodes[0].error).toBeUndefined()
})

it('allows compression only after the document stage is completed', () => {
  const settings = createInitialSettings()
  settings.basic.outputDirectory = 'D:/fr-outputs'
  settings.agent = { baseUrl: 'https://api.example.com', apiKey: 'sk-demo', model: 'demo-model', status: 'available' }
  settings.templates = [createDemoTemplate('说明书.docx', 'software-manual')]
  const task = createInitialGenerationTask('档案管理平台 V1.0', 'web', settings)

  expect(canCompressTask(task)).toBe(false)

  const completed = task.stages.reduce(
    (current, stage) => applyTaskEvent(current, { type: 'stage-completed', stageId: stage.id, at: '2026-05-06T00:00:03.000Z' }),
    task
  )
  expect(canCompressTask(completed)).toBe(true)
})
```

- [ ] **Step 2: Run the event tests and confirm failure**

Run:

```bash
npm run test -- src/domain/generation.test.ts
```

Expected: FAIL because `createInitialGenerationTask`, `applyTaskEvent`, `retryFailedNode`, `canCompressTask`, and `WorkflowNode.error` do not exist yet.

- [ ] **Step 3: Extend domain types**

Update `src/domain/types.ts` with these additions:

```ts
export interface RuntimeErrorInfo {
  code: string
  message: string
  detail?: string
  recoverable: boolean
}

export type TaskEvent =
  | { type: 'task-started'; at: string }
  | { type: 'stage-started'; stageId: WorkflowStage['id']; at: string }
  | { type: 'node-started'; stageId: WorkflowStage['id']; nodeId: string; at: string }
  | { type: 'node-completed'; stageId: WorkflowStage['id']; nodeId: string; at: string; resource?: ResourceArtifact }
  | { type: 'node-failed'; stageId: WorkflowStage['id']; nodeId: string; at: string; error: RuntimeErrorInfo }
  | { type: 'stage-completed'; stageId: WorkflowStage['id']; at: string }
  | { type: 'task-completed'; at: string }
  | { type: 'task-failed'; at: string; error: RuntimeErrorInfo }
  | { type: 'resource-updated'; resourceId: string; at: string; resource: ResourceArtifact }
  | { type: 'archive-created'; at: string; zipPath: string }
```

Also add optional error fields:

```ts
export interface TemplateConfig {
  id: string
  name: string
  type: TemplateType
  fileName: string
  parseStatus: ParseStatus
  analysis: TemplateAnalysis
  lastParsedAt?: string
  error?: RuntimeErrorInfo
}

export interface WorkflowNode {
  id: string
  name: string
  status: NodeStatus
  resource: ResourceArtifact
  error?: RuntimeErrorInfo
}

export interface GenerationTask {
  id: string
  title: string
  systemType: SystemType
  status: NodeStatus
  stages: WorkflowStage[]
  projectUrl: string
  documentDirectory: string
  zipPath?: string
  startedAt: string
  completedAt?: string
  stats: TaskStats
  error?: RuntimeErrorInfo
}
```

- [ ] **Step 4: Implement event helpers**

In `src/domain/generation.ts`, add exports with this behavior:

```ts
export function createInitialGenerationTask(
  title: string,
  systemType: SystemType,
  settings: AppSettings
): GenerationTask {
  const task = createGenerationTask(title, systemType, settings)
  return {
    ...task,
    status: 'pending',
    completedAt: undefined,
    zipPath: undefined,
    stages: task.stages.map((stage) => ({
      ...stage,
      status: 'pending',
      nodes: stage.nodes.map((node) => ({ ...node, status: 'pending', error: undefined }))
    })),
    stats: calculateTaskStats({ ...task, completedAt: undefined })
  }
}

export function applyTaskEvent(task: GenerationTask, event: TaskEvent): GenerationTask {
  const updated = applyEventWithoutStats(task, event)
  return { ...updated, stats: calculateTaskStats(updated) }
}

export function retryFailedNode(task: GenerationTask, resourceId: string): GenerationTask {
  const updated: GenerationTask = {
    ...task,
    status: 'running',
    error: undefined,
    stages: task.stages.map((stage) => ({
      ...stage,
      status: stage.nodes.some((node) => node.resource.id === resourceId) ? 'running' : stage.status,
      nodes: stage.nodes.map((node) =>
        node.resource.id === resourceId ? { ...node, status: 'pending', error: undefined } : node
      )
    }))
  }
  return { ...updated, stats: calculateTaskStats(updated) }
}

export function canCompressTask(task: GenerationTask | null): boolean {
  if (!task) return false
  const documentStage = task.stages.find((stage) => stage.id === 'document')
  return task.status === 'completed' && documentStage?.status === 'completed' && !task.zipPath
}
```

Implement `applyEventWithoutStats` in the same file so every `TaskEvent` updates task/stage/node statuses and error fields deterministically.

- [ ] **Step 5: Run domain verification**

Run:

```bash
npm run test -- src/domain/generation.test.ts
npm run build
```

Expected: PASS.

- [ ] **Step 6: Commit domain event model**

Run:

```bash
git add src/domain/types.ts src/domain/generation.ts src/domain/generation.test.ts
git commit -m "feat: add generation task event model"
```

## Task 2: Runtime Contract and Mock Runtime

**Files:**
- Create: `src/runtime/types.ts`
- Create: `src/runtime/mockRuntime.ts`
- Create: `src/runtime/mockRuntime.test.ts`

- [ ] **Step 1: Write runtime tests**

Create `src/runtime/mockRuntime.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { createDemoTemplate, createInitialSettings } from '../domain/mockData'
import { createMockRuntime } from './mockRuntime'

describe('mock runtime', () => {
  it('tests agent availability through the runtime boundary', async () => {
    const runtime = createMockRuntime()
    const result = await runtime.testAgent({
      baseUrl: 'https://api.example.com',
      apiKey: 'sk-demo',
      model: 'demo-model',
      status: 'untested'
    })
    expect(result.status).toBe('available')
    expect(result.error).toBeUndefined()
  })

  it('parses a template asynchronously', async () => {
    const runtime = createMockRuntime()
    const settings = createInitialSettings()
    const template = createDemoTemplate('说明书.docx', 'software-manual')

    const result = await runtime.parseTemplate(template, settings)

    expect(result.analysis.structureNodes.length).toBeGreaterThan(3)
    expect(result.parsedAt).toBeTruthy()
  })

  it('starts generation with an initial task and ordered task events', async () => {
    const runtime = createMockRuntime()
    const settings = createInitialSettings()
    settings.basic.outputDirectory = 'D:/fr-outputs'
    settings.agent = { baseUrl: 'https://api.example.com', apiKey: 'sk-demo', model: 'demo-model', status: 'available' }
    settings.templates = [createDemoTemplate('说明书.docx', 'software-manual')]

    const result = await runtime.startGeneration(
      { title: '智慧仓储管理系统 V1.0', systemType: 'web' },
      settings
    )

    expect(result.task.status).toBe('pending')
    expect(result.events[0].type).toBe('task-started')
    expect(result.events.some((event) => event.type === 'task-completed')).toBe(true)
  })
})
```

- [ ] **Step 2: Run runtime tests and confirm failure**

Run:

```bash
npm run test -- src/runtime/mockRuntime.test.ts
```

Expected: FAIL because `src/runtime` does not exist.

- [ ] **Step 3: Define runtime contracts**

Create `src/runtime/types.ts`:

```ts
import type {
  AgentConfig,
  AppSettings,
  GenerationTask,
  RuntimeErrorInfo,
  SystemType,
  TaskEvent,
  TemplateAnalysis,
  TemplateConfig
} from '../domain/types'

export interface GenerationInput {
  title: string
  systemType: SystemType
}

export interface AgentTestResult {
  status: AgentConfig['status']
  testedAt: string
  error?: RuntimeErrorInfo
}

export interface TemplateParseResult {
  analysis: TemplateAnalysis
  parsedAt: string
  error?: RuntimeErrorInfo
}

export interface GenerationStartResult {
  task: GenerationTask
  events: TaskEvent[]
}

export interface RuntimeResourceResult {
  events: TaskEvent[]
  error?: RuntimeErrorInfo
}

export interface RuntimeArchiveResult {
  events: TaskEvent[]
  error?: RuntimeErrorInfo
}

export interface GenerationRuntime {
  validateEnvironment(settings: AppSettings): Promise<RuntimeErrorInfo[]>
  testAgent(config: AgentConfig): Promise<AgentTestResult>
  parseTemplate(template: TemplateConfig, settings: AppSettings): Promise<TemplateParseResult>
  startGeneration(input: GenerationInput, settings: AppSettings): Promise<GenerationStartResult>
  regenerateResource(task: GenerationTask, resourceId: string, suggestion?: string): Promise<RuntimeResourceResult>
  compressTask(task: GenerationTask): Promise<RuntimeArchiveResult>
}
```

- [ ] **Step 4: Implement mock runtime**

Create `src/runtime/mockRuntime.ts`:

```ts
import { applyTaskEvent, createInitialGenerationTask, regenerateResource } from '../domain/generation'
import { createDemoTemplateAnalysis } from '../domain/mockData'
import type { RuntimeErrorInfo, TaskEvent } from '../domain/types'
import type {
  AgentTestResult,
  GenerationInput,
  GenerationRuntime,
  GenerationStartResult,
  RuntimeArchiveResult,
  RuntimeResourceResult,
  TemplateParseResult
} from './types'

export function createMockRuntime(): GenerationRuntime {
  return {
    async validateEnvironment() {
      return []
    },
    async testAgent(config) {
      const testedAt = nowText()
      if (config.baseUrl.trim() && config.apiKey.trim() && config.model.trim()) {
        return { status: 'available', testedAt } satisfies AgentTestResult
      }
      return {
        status: 'unavailable',
        testedAt,
        error: createError('mock-agent-unavailable', 'Agent 配置不完整，无法完成模拟连接。')
      }
    },
    async parseTemplate(template) {
      return {
        analysis: createDemoTemplateAnalysis(template.type),
        parsedAt: nowText()
      } satisfies TemplateParseResult
    },
    async startGeneration(input: GenerationInput, settings) {
      const task = createInitialGenerationTask(input.title, input.systemType, settings)
      return {
        task,
        events: createCompletionEvents(task)
      } satisfies GenerationStartResult
    },
    async regenerateResource(task, resourceId, suggestion) {
      const updated = regenerateResource(task, resourceId, suggestion)
      const resource = updated.stages.flatMap((stage) => stage.nodes).find((node) => node.resource.id === resourceId)?.resource
      return {
        events: resource ? [{ type: 'resource-updated', resourceId, resource, at: nowText() }] : [],
        error: resource ? undefined : createError('mock-resource-not-found', '未找到要重新生成的资源。')
      } satisfies RuntimeResourceResult
    },
    async compressTask(task) {
      return {
        events: [{ type: 'archive-created', at: nowText(), zipPath: `${task.documentDirectory}/${task.title}_交付包.zip` }]
      } satisfies RuntimeArchiveResult
    }
  }
}

function createCompletionEvents(task: ReturnType<typeof createInitialGenerationTask>): TaskEvent[] {
  const events: TaskEvent[] = [{ type: 'task-started', at: nowText() }]
  for (const stage of task.stages) {
    events.push({ type: 'stage-started', stageId: stage.id, at: nowText() })
    for (const node of stage.nodes) {
      events.push({ type: 'node-started', stageId: stage.id, nodeId: node.id, at: nowText() })
      events.push({ type: 'node-completed', stageId: stage.id, nodeId: node.id, at: nowText(), resource: node.resource })
    }
    events.push({ type: 'stage-completed', stageId: stage.id, at: nowText() })
  }
  events.push({ type: 'task-completed', at: nowText() })
  return events
}

function createError(code: string, message: string): RuntimeErrorInfo {
  return { code, message, recoverable: true }
}

function nowText(): string {
  return new Date().toISOString()
}
```

- [ ] **Step 5: Run runtime verification**

Run:

```bash
npm run test -- src/runtime/mockRuntime.test.ts
npm run build
```

Expected: PASS.

- [ ] **Step 6: Commit runtime contract**

Run:

```bash
git add src/runtime
git commit -m "feat: add mock generation runtime"
```

## Task 3: Store Runtime Integration

**Files:**
- Modify: `src/stores/appStore.ts`
- Modify: `src/stores/appStore.test.ts`

- [ ] **Step 1: Replace Store tests with async runtime expectations**

Extend `src/stores/appStore.test.ts` with:

```ts
it('uses the runtime to test agent availability', async () => {
  const store = createAppStore()
  store.settings.value.agent = {
    baseUrl: 'https://api.example.com',
    apiKey: 'sk-demo',
    model: 'demo-model',
    status: 'untested'
  }

  await store.testAgent()

  expect(store.settings.value.agent.status).toBe('available')
  expect(store.operation.value.agentTesting).toBe(false)
})

it('applies runtime task events when generation starts', async () => {
  const store = createAppStore()
  store.projectTitle.value = '智慧仓储管理系统 V1.0'
  store.settings.value.basic.outputDirectory = 'D:/fr-outputs'
  store.settings.value.agent = { baseUrl: 'https://api.example.com', apiKey: 'sk-demo', model: 'demo-model', status: 'available' }
  store.addTemplate('说明书.docx', 'software-manual')
  await store.parseTemplate(store.settings.value.templates[0].id)

  await store.startGeneration()

  expect(store.currentTask.value?.status).toBe('completed')
  expect(store.history.value[0].title).toBe('智慧仓储管理系统 V1.0')
})
```

- [ ] **Step 2: Run Store tests and confirm async failures**

Run:

```bash
npm run test -- src/stores/appStore.test.ts
```

Expected: FAIL because Store actions are still synchronous and no `operation` ref exists.

- [ ] **Step 3: Refactor Store to accept runtime**

In `src/stores/appStore.ts`, change `createAppStore()` to:

```ts
import { applyTaskEvent, canCompressTask } from '../domain/generation'
import { createMockRuntime } from '../runtime/mockRuntime'
import type { GenerationRuntime } from '../runtime/types'

export function createAppStore(runtime: GenerationRuntime = createMockRuntime()) {
  const operation = ref({
    agentTesting: false,
    templateParsing: false,
    generating: false,
    regenerating: false,
    compressing: false,
    lastError: null as RuntimeErrorInfo | null
  })
}
```

Update returned properties to include `operation` and `canCompressCurrentTask`.

- [ ] **Step 4: Make Store actions async and event-driven**

Update Store actions with these signatures:

```ts
async function testAgent(): Promise<boolean>
async function parseTemplate(templateId: string): Promise<boolean>
async function startGeneration(): Promise<boolean>
async function regenerate(resourceId: string, suggestion?: string): Promise<boolean>
async function compressCurrentTask(): Promise<boolean>
function canCompressCurrentTask(): boolean
```

Implementation rules:

- Set the relevant `operation.value.*` flag before awaiting runtime.
- On success, clear `operation.value.lastError`.
- On failure, set `operation.value.lastError` and return `false`.
- For generation events, call `applyTaskEvent` for each event in order and persist after the sequence.
- Keep `addTemplate`, `saveSettings`, `saveResource`, `loadHistory`, and `deleteHistory` synchronous.

- [ ] **Step 5: Run Store verification**

Run:

```bash
npm run test -- src/stores/appStore.test.ts
npm run test -- src/domain/generation.test.ts src/runtime/mockRuntime.test.ts
npm run build
```

Expected: PASS.

- [ ] **Step 6: Commit Store runtime integration**

Run:

```bash
git add src/stores/appStore.ts src/stores/appStore.test.ts
git commit -m "feat: route app store through generation runtime"
```

## Task 4: Dashboard Runtime States

**Files:**
- Modify: `src/components/DashboardView.vue`
- Modify: `src/components/DashboardView.test.ts`
- Modify: `src/styles.css`

- [ ] **Step 1: Add dashboard tests for compression and failure visibility**

Add to `src/components/DashboardView.test.ts`:

```ts
it('disables compression before the task is completed', async () => {
  const store = createAppStore()
  const wrapper = mount(DashboardView, { props: { store } })
  const compressButton = wrapper.find('[data-test="compress-task"]')
  expect(compressButton.attributes('disabled')).toBeDefined()
})

it('shows the latest runtime error from the store', async () => {
  const store = createAppStore()
  store.operation.value.lastError = {
    code: 'mock-node-failed',
    message: '节点生成失败',
    recoverable: true
  }
  const wrapper = mount(DashboardView, { props: { store } })
  expect(wrapper.text()).toContain('节点生成失败')
})
```

- [ ] **Step 2: Run dashboard tests and confirm failure**

Run:

```bash
npm run test -- src/components/DashboardView.test.ts
```

Expected: FAIL because `data-test="compress-task"` and runtime error panel are not implemented.

- [ ] **Step 3: Update dashboard component**

In `src/components/DashboardView.vue`:

- Change `startGeneration`, `regenerate`, `regenerateResource`, `regenerateWithSuggestion`, and compression click handlers to `async` and `await` Store actions.
- Add a runtime error panel:

```vue
<section v-if="store.operation.value.lastError" class="attention-panel">
  <h2>执行异常</h2>
  <p>{{ store.operation.value.lastError.message }}</p>
</section>
```

- Add compression test hook and guard:

```vue
<button
  class="address-button"
  data-test="compress-task"
  type="button"
  :disabled="!store.canCompressCurrentTask() || store.operation.value.compressing"
  @click="store.compressCurrentTask"
>
```

- Render node failure messages:

```vue
<p v-if="node.error" class="node-error">{{ node.error.message }}</p>
```

- Show retry for failed nodes:

```vue
<button v-if="node.status === 'failed'" type="button" @click="regenerate(node)">重试</button>
```

- [ ] **Step 4: Add small CSS states**

In `src/styles.css`, add:

```css
.node-error {
  margin: 6px 0 0;
  color: #b42318;
  font-size: 12px;
}

.node-row.failed {
  border-color: #f3b5ad;
  background: #fff7f5;
}
```

- [ ] **Step 5: Run dashboard verification**

Run:

```bash
npm run test -- src/components/DashboardView.test.ts
npm run build
```

Expected: PASS.

- [ ] **Step 6: Commit dashboard runtime states**

Run:

```bash
git add src/components/DashboardView.vue src/components/DashboardView.test.ts src/styles.css
git commit -m "feat: show runtime task states on dashboard"
```

## Task 5: Settings Runtime States and JSON Import Safety

**Files:**
- Modify: `src/components/SettingsView.vue`
- Modify: `src/components/SettingsView.test.ts`
- Modify: `src/styles.css`

- [ ] **Step 1: Add settings tests**

Add to `src/components/SettingsView.test.ts`:

```ts
it('shows agent unavailable when runtime test fails', async () => {
  const store = createAppStore()
  const wrapper = mount(SettingsView, { props: { store } })
  await wrapper.find('[data-test="test-agent"]').trigger('click')
  expect(wrapper.text()).toContain('unavailable')
})

it('shows a parse status while template parsing is controlled by the store', async () => {
  const store = createAppStore()
  const wrapper = mount(SettingsView, { props: { store } })
  await wrapper.find('[data-test="add-manual-template"]').trigger('click')
  expect(wrapper.text()).toContain('pending')
  await wrapper.find('[data-test="parse-template"]').trigger('click')
  expect(wrapper.text()).toContain('completed')
})
```

- [ ] **Step 2: Run settings tests and confirm failure**

Run:

```bash
npm run test -- src/components/SettingsView.test.ts
```

Expected: FAIL because Agent test button has no test hook and component does not await Store actions.

- [ ] **Step 3: Update settings component**

In `src/components/SettingsView.vue`:

- Make template parsing call async:

```vue
<button data-test="parse-template" type="button" @click="store.parseTemplate(template.id)">
  调用 Agent 解析
</button>
```

This can stay as direct template call because Vue handles returned promises from event handlers.

- Add Agent test hook:

```vue
<button data-test="test-agent" type="button" :disabled="store.operation.value.agentTesting" @click="store.testAgent">
  测试连接
</button>
```

- Show operation error:

```vue
<p v-if="store.operation.value.lastError" class="inline-error">
  {{ store.operation.value.lastError.message }}
</p>
```

- Replace `importTemplate` with a safe parser:

```ts
function importTemplate(template: TemplateConfig): void {
  const raw = window.prompt('粘贴解析 JSON')
  if (!raw) return
  try {
    props.store.updateTemplateAnalysis(template.id, JSON.parse(raw))
  } catch {
    props.store.operation.value.lastError = {
      code: 'invalid-template-json',
      message: '解析 JSON 格式不正确，请检查后重新导入。',
      recoverable: true
    }
  }
}
```

- [ ] **Step 4: Run settings verification**

Run:

```bash
npm run test -- src/components/SettingsView.test.ts
npm run build
```

Expected: PASS.

- [ ] **Step 5: Commit settings runtime states**

Run:

```bash
git add src/components/SettingsView.vue src/components/SettingsView.test.ts src/styles.css
git commit -m "feat: show runtime states in settings"
```

## Task 6: README and Final Verification

**Files:**
- Modify: `README.md`
- Modify: `docs/superpowers/plans/2026-05-06-soft-copyright-runtime-integration.md`

- [ ] **Step 1: Update README runtime section**

Update `README.md` to include:

```md
## Runtime

当前版本默认使用 `mockRuntime`，所有 Agent 测试、模板解析、生成、资源重生成和压缩动作都经过 `src/runtime` 的运行时接口。

`mockRuntime` 不访问网络和本地文件系统，只用于浏览器演示和前端状态验证。后续接入 Tauri、本地文件系统、真实 Agent、docx 解析和 zip 输出时，应新增 runtime 实现并复用现有 Store 和组件调用边界。
```

- [ ] **Step 2: Run full verification**

Run:

```bash
npm run test
npm run build
git status --short
```

Expected:

- `npm run test` passes all test files.
- `npm run build` passes TypeScript and Vite production build.
- `git status --short` only shows README and this plan until final commit.

- [ ] **Step 3: Mark this plan complete**

Replace every unchecked checkbox in this file with `[x]` after all tasks pass.

- [ ] **Step 4: Commit final docs**

Run:

```bash
git add README.md docs/superpowers/plans/2026-05-06-soft-copyright-runtime-integration.md
git commit -m "docs: document runtime integration phase"
```

## Final Acceptance

Run:

```bash
npm run test
npm run build
git status --short --branch
```

Expected:

- Tests pass.
- Build passes.
- Worktree is clean on `feature/front-prototype`.
- Current mock demo still supports configuration, template parsing, generation, resource preview/edit, regeneration, compression, and history replay.
