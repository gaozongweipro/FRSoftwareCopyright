import { createInitialGenerationTask, regenerateResource } from '../domain/generation'
import { createDemoTemplateAnalysis } from '../domain/mockData'
import type { GenerationTask, RuntimeErrorInfo, TaskEvent } from '../domain/types'
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
      } satisfies AgentTestResult
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
      const resource = updated.stages
        .flatMap((stage) => stage.nodes)
        .find((node) => node.resource.id === resourceId)?.resource

      return {
        events: resource ? [{ type: 'resource-updated', resourceId, resource, at: nowText() }] : [],
        error: resource
          ? undefined
          : createError('mock-resource-not-found', '未找到要重新生成的资源。')
      } satisfies RuntimeResourceResult
    },
    async compressTask(task) {
      return {
        events: [
          {
            type: 'archive-created',
            at: nowText(),
            zipPath: `${task.documentDirectory.replace(/[\\/]+$/, '')}/${task.title}_交付包.zip`
          }
        ]
      } satisfies RuntimeArchiveResult
    }
  }
}

function createCompletionEvents(task: GenerationTask): TaskEvent[] {
  const events: TaskEvent[] = [{ type: 'task-started', at: nowText() }]

  for (const stage of task.stages) {
    events.push({ type: 'stage-started', stageId: stage.id, at: nowText() })
    for (const node of stage.nodes) {
      events.push({ type: 'node-started', stageId: stage.id, nodeId: node.id, at: nowText() })
      events.push({
        type: 'node-completed',
        stageId: stage.id,
        nodeId: node.id,
        at: nowText(),
        resource: node.resource
      })
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
