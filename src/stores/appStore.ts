import { ref } from 'vue'
import {
  applyTaskEvent,
  canCompressTask,
  validateGenerationStart
} from '../domain/generation'
import { createDemoTemplate, createInitialSettings } from '../domain/mockData'
import { createStorageAdapter } from '../domain/storage'
import { createMockRuntime } from '../runtime/mockRuntime'
import type { GenerationRuntime } from '../runtime/types'
import type {
  AppSettings,
  GenerationTask,
  HistoryRecord,
  PageId,
  RuntimeErrorInfo,
  SystemType,
  TemplateAnalysis,
  TemplateType,
  ValidationIssue
} from '../domain/types'

const storage = createStorageAdapter('fr-software-copyright')

export function createAppStore(runtime: GenerationRuntime = createMockRuntime()) {
  const settings = ref<AppSettings>(storage.load('settings', createInitialSettings()))
  const currentTask = ref<GenerationTask | null>(storage.load('currentTask', null))
  const history = ref<HistoryRecord[]>(storage.load('history', []))
  const page = ref<PageId>('dashboard')
  const projectTitle = ref(currentTask.value?.title ?? '')
  const systemType = ref<SystemType>(currentTask.value?.systemType ?? 'web')
  const validationIssues = ref<ValidationIssue[]>([])
  const operation = ref({
    agentTesting: false,
    templateParsing: false,
    generating: false,
    regenerating: false,
    compressing: false,
    lastError: null as RuntimeErrorInfo | null
  })

  async function startGeneration(): Promise<boolean> {
    validationIssues.value = validateGenerationStart(projectTitle.value, settings.value)
    if (validationIssues.value.length > 0) {
      currentTask.value = null
      storage.remove('currentTask')
      return false
    }

    operation.value.generating = true
    operation.value.lastError = null
    try {
      const result = await runtime.startGeneration(
        { title: projectTitle.value.trim(), systemType: systemType.value },
        settings.value
      )
      currentTask.value = result.events.reduce(
        (task, event) => applyTaskEvent(task, event),
        result.task
      )
      upsertHistory(currentTask.value)
      persistAll()
      return true
    } catch (error) {
      operation.value.lastError = toRuntimeError(error, 'generation-failed', '生成任务启动失败。')
      return false
    } finally {
      operation.value.generating = false
    }
  }

  function saveSettings(): void {
    storage.save('settings', settings.value)
  }

  async function testAgent(): Promise<boolean> {
    operation.value.agentTesting = true
    operation.value.lastError = null
    try {
      const result = await runtime.testAgent(settings.value.agent)
      settings.value.agent.status = result.status
      settings.value.agent.testedAt = result.testedAt
      operation.value.lastError = result.error ?? null
      saveSettings()
      return result.status === 'available'
    } catch (error) {
      operation.value.lastError = toRuntimeError(error, 'agent-test-failed', 'Agent 测试失败。')
      settings.value.agent.status = 'unavailable'
      settings.value.agent.testedAt = new Date().toISOString()
      saveSettings()
      return false
    } finally {
      operation.value.agentTesting = false
    }
  }

  function addTemplate(fileName: string, type: TemplateType): void {
    const template = createDemoTemplate(fileName, type)
    settings.value.templates = [
      ...settings.value.templates,
      {
        ...template,
        parseStatus: 'pending',
        lastParsedAt: undefined
      }
    ]
    saveSettings()
  }

  async function parseTemplate(templateId: string): Promise<boolean> {
    const template = settings.value.templates.find((item) => item.id === templateId)
    if (!template) {
      operation.value.lastError = {
        code: 'template-not-found',
        message: '未找到要解析的模板。',
        recoverable: true
      }
      return false
    }

    operation.value.templateParsing = true
    operation.value.lastError = null
    settings.value.templates = settings.value.templates.map((item) =>
      item.id === templateId ? { ...item, parseStatus: 'parsing', error: undefined } : item
    )
    saveSettings()

    try {
      const result = await runtime.parseTemplate(template, settings.value)
      settings.value.templates = settings.value.templates.map((item) =>
        item.id === templateId
          ? {
              ...item,
              parseStatus: result.error ? 'failed' : 'completed',
              analysis: result.analysis,
              lastParsedAt: result.parsedAt,
              error: result.error
            }
          : item
      )
      operation.value.lastError = result.error ?? null
      saveSettings()
      return !result.error
    } catch (error) {
      const runtimeError = toRuntimeError(error, 'template-parse-failed', '模板解析失败。')
      settings.value.templates = settings.value.templates.map((item) =>
        item.id === templateId ? { ...item, parseStatus: 'failed', error: runtimeError } : item
      )
      operation.value.lastError = runtimeError
      saveSettings()
      return false
    } finally {
      operation.value.templateParsing = false
    }
  }

  function updateTemplateAnalysis(templateId: string, analysis: TemplateAnalysis): void {
    settings.value.templates = settings.value.templates.map((template) =>
      template.id === templateId
        ? {
            ...template,
            analysis,
            parseStatus: 'completed',
            lastParsedAt: new Date().toISOString()
          }
        : template
    )
    saveSettings()
  }

  async function regenerate(resourceId: string, suggestion?: string): Promise<boolean> {
    if (!currentTask.value) return false

    operation.value.regenerating = true
    operation.value.lastError = null
    try {
      const result = await runtime.regenerateResource(currentTask.value, resourceId, suggestion)
      currentTask.value = result.events.reduce(
        (task, event) => applyTaskEvent(task, event),
        currentTask.value
      )
      operation.value.lastError = result.error ?? null
      upsertHistory(currentTask.value)
      persistAll()
      return !result.error
    } catch (error) {
      operation.value.lastError = toRuntimeError(error, 'resource-regenerate-failed', '资源重新生成失败。')
      return false
    } finally {
      operation.value.regenerating = false
    }
  }

  function saveResource(resourceId: string, content: string): void {
    if (!currentTask.value) return

    currentTask.value = {
      ...currentTask.value,
      stages: currentTask.value.stages.map((stage) => ({
        ...stage,
        nodes: stage.nodes.map((node) =>
          node.resource.id === resourceId
            ? { ...node, resource: { ...node.resource, content } }
            : node
        )
      }))
    }
    upsertHistory(currentTask.value)
    persistAll()
  }

  async function compressCurrentTask(): Promise<boolean> {
    if (!currentTask.value || !canCompressCurrentTask()) return false

    operation.value.compressing = true
    operation.value.lastError = null
    try {
      const result = await runtime.compressTask(currentTask.value)
      currentTask.value = result.events.reduce(
        (task, event) => applyTaskEvent(task, event),
        currentTask.value
      )
      operation.value.lastError = result.error ?? null
      upsertHistory(currentTask.value)
      persistAll()
      return !result.error
    } catch (error) {
      operation.value.lastError = toRuntimeError(error, 'archive-create-failed', '压缩包生成失败。')
      return false
    } finally {
      operation.value.compressing = false
    }
  }

  function canCompressCurrentTask(): boolean {
    return canCompressTask(currentTask.value)
  }

  function loadHistory(recordId: string): void {
    const record = history.value.find((item) => item.id === recordId)
    if (!record) return

    currentTask.value = record.task
    projectTitle.value = record.task.title
    systemType.value = record.task.systemType
    validationIssues.value = []
    page.value = 'dashboard'
    persistAll()
  }

  function deleteHistory(recordId: string): void {
    history.value = history.value.filter((record) => record.id !== recordId)
    if (currentTask.value?.id === recordId) {
      currentTask.value = null
      storage.remove('currentTask')
    }
    storage.save('history', history.value)
  }

  function persistAll(): void {
    storage.save('settings', settings.value)
    storage.save('history', history.value)
    if (currentTask.value) {
      storage.save('currentTask', currentTask.value)
    } else {
      storage.remove('currentTask')
    }
  }

  function upsertHistory(task: GenerationTask): void {
    const record: HistoryRecord = {
      id: task.id,
      title: task.title,
      systemType: task.systemType,
      status: task.status,
      generatedAt: task.completedAt ?? task.startedAt,
      templateCount: task.stats.templateCount,
      resourceCount: task.stats.resourceCount,
      durationSeconds: task.stats.durationSeconds,
      task
    }

    history.value = [record, ...history.value.filter((item) => item.id !== task.id)]
  }

  return {
    settings,
    currentTask,
    history,
    page,
    projectTitle,
    systemType,
    validationIssues,
    operation,
    startGeneration,
    saveSettings,
    testAgent,
    addTemplate,
    parseTemplate,
    updateTemplateAnalysis,
    regenerate,
    saveResource,
    compressCurrentTask,
    canCompressCurrentTask,
    loadHistory,
    deleteHistory,
    persistAll
  }
}

function toRuntimeError(error: unknown, code: string, message: string): RuntimeErrorInfo {
  if (isRuntimeError(error)) return error
  return {
    code,
    message,
    detail: error instanceof Error ? error.message : String(error),
    recoverable: true
  }
}

function isRuntimeError(error: unknown): error is RuntimeErrorInfo {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    'recoverable' in error
  )
}
