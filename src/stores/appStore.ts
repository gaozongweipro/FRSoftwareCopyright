import { ref } from 'vue'
import {
  compressTask,
  createGenerationTask,
  regenerateResource,
  validateGenerationStart
} from '../domain/generation'
import { createDemoTemplate, createDemoTemplateAnalysis, createInitialSettings } from '../domain/mockData'
import { createStorageAdapter } from '../domain/storage'
import type {
  AppSettings,
  GenerationTask,
  HistoryRecord,
  PageId,
  SystemType,
  TemplateAnalysis,
  TemplateType,
  ValidationIssue
} from '../domain/types'

const storage = createStorageAdapter('fr-software-copyright')

export function createAppStore() {
  const settings = ref<AppSettings>(storage.load('settings', createInitialSettings()))
  const currentTask = ref<GenerationTask | null>(storage.load('currentTask', null))
  const history = ref<HistoryRecord[]>(storage.load('history', []))
  const page = ref<PageId>('dashboard')
  const projectTitle = ref(currentTask.value?.title ?? '')
  const systemType = ref<SystemType>(currentTask.value?.systemType ?? 'web')
  const validationIssues = ref<ValidationIssue[]>([])

  function startGeneration(): void {
    validationIssues.value = validateGenerationStart(projectTitle.value, settings.value)
    if (validationIssues.value.length > 0) {
      currentTask.value = null
      storage.remove('currentTask')
      return
    }

    const task = createGenerationTask(projectTitle.value.trim(), systemType.value, settings.value)
    currentTask.value = task
    upsertHistory(task)
    persistAll()
  }

  function saveSettings(): void {
    storage.save('settings', settings.value)
  }

  function testAgent(): void {
    const { baseUrl, apiKey, model } = settings.value.agent
    settings.value.agent.status =
      baseUrl.trim() && apiKey.trim() && model.trim() ? 'available' : 'unavailable'
    settings.value.agent.testedAt = new Date().toISOString()
    saveSettings()
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

  function parseTemplate(templateId: string): void {
    settings.value.templates = settings.value.templates.map((template) =>
      template.id === templateId
        ? {
            ...template,
            parseStatus: 'completed',
            analysis: createDemoTemplateAnalysis(template.type),
            lastParsedAt: new Date().toISOString()
          }
        : template
    )
    saveSettings()
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

  function regenerate(resourceId: string, suggestion?: string): void {
    if (!currentTask.value) return
    currentTask.value = regenerateResource(currentTask.value, resourceId, suggestion)
    upsertHistory(currentTask.value)
    persistAll()
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

  function compressCurrentTask(): void {
    if (!currentTask.value) return
    currentTask.value = compressTask(currentTask.value)
    upsertHistory(currentTask.value)
    persistAll()
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
    startGeneration,
    saveSettings,
    testAgent,
    addTemplate,
    parseTemplate,
    updateTemplateAnalysis,
    regenerate,
    saveResource,
    compressCurrentTask,
    loadHistory,
    deleteHistory,
    persistAll
  }
}
