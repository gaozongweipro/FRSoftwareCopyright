import { buildDocumentContent } from './mockData'
import type {
  AppSettings,
  GenerationTask,
  NodeStatus,
  ResourceArtifact,
  ResourceType,
  SystemType,
  TaskEvent,
  TaskStats,
  TemplateConfig,
  ValidationIssue,
  WorkflowNode,
  WorkflowStage
} from './types'

const templateDocumentNames: Record<TemplateConfig['type'], string> = {
  'collection-form': '采集表',
  'software-manual': '软件说明书',
  'source-code': '源代码文档'
}

export function validateGenerationStart(title: string, settings: AppSettings): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  if (!title.trim()) {
    issues.push({
      code: 'missing-title',
      label: '项目标题',
      message: '请先填写系统标题。',
      targetPage: 'dashboard'
    })
  }

  if (!settings.basic.outputDirectory.trim()) {
    issues.push({
      code: 'missing-output-directory',
      label: '产出资源目录',
      message: '请在基本信息设置中配置产出资源目录。',
      targetPage: 'settings'
    })
  }

  if (!settings.templates.some((template) => template.parseStatus === 'completed')) {
    issues.push({
      code: 'missing-template',
      label: '模板配置',
      message: '请至少上传并解析一个有效模板。',
      targetPage: 'settings'
    })
  }

  if (settings.agent.status !== 'available') {
    issues.push({
      code: 'agent-unavailable',
      label: 'Agent 配置',
      message: '请完成 Agent 配置并测试连接可用。',
      targetPage: 'settings'
    })
  }

  return issues
}

export function createGenerationTask(
  title: string,
  systemType: SystemType,
  settings: AppSettings
): GenerationTask {
  const startedAt = nowText()
  const taskId = createId('task')
  const completedTemplates = settings.templates.filter((template) => template.parseStatus === 'completed')

  const stages: WorkflowStage[] = [
    createStage('analysis', '项目分析', [
      createNode('analysis-function', '项目功能设计文档', 'document', title),
      createNode('analysis-architecture', '项目架构设计及技术选型文档', 'document', title),
      createNode('analysis-flow', '项目页面流程设计文档', 'document', title)
    ]),
    createStage('code', '项目编码', [
      createNode(
        'code-html-demo',
        '演示 HTML 界面',
        'html-demo',
        title,
        '本地预览地址：http://127.0.0.1:5173/preview/demo.html'
      )
    ]),
    createStage('image', '图片截取', [
      createNode('image-architecture', '项目架构图', 'image-note', title),
      createNode('image-flow', '软件功能流程图', 'image-note', title),
      createNode('image-screenshots', '功能界面截图集', 'image-note', title)
    ]),
    createStage(
      'document',
      '文档生成',
      completedTemplates.map((template) =>
        createNode(
          `document-${template.id}`,
          templateDocumentNames[template.type],
          'template-document',
          title,
          `绑定模板：${template.name}（${template.fileName}）`,
          template.id
        )
      )
    )
  ]

  const task: GenerationTask = {
    id: taskId,
    title,
    systemType,
    status: 'completed',
    stages,
    projectUrl: `http://127.0.0.1:5173/preview/${encodeURIComponent(title)}`,
    documentDirectory: `${settings.basic.outputDirectory.replace(/[\\/]+$/, '')}/${title}/documents`,
    startedAt,
    completedAt: nowText(),
    stats: {
      durationSeconds: 0,
      resourceCount: 0,
      templateCount: completedTemplates.length,
      regenerateCount: 0,
      latestCompletedAt: startedAt
    }
  }

  return {
    ...task,
    stats: calculateTaskStats(task)
  }
}

export function createInitialGenerationTask(
  title: string,
  systemType: SystemType,
  settings: AppSettings
): GenerationTask {
  const task = createGenerationTask(title, systemType, settings)
  const pendingTask: GenerationTask = {
    ...task,
    status: 'pending',
    completedAt: undefined,
    zipPath: undefined,
    error: undefined,
    stages: task.stages.map((stage) => ({
      ...stage,
      status: 'pending',
      nodes: stage.nodes.map((node) => ({
        ...node,
        status: 'pending',
        error: undefined
      }))
    }))
  }

  return {
    ...pendingTask,
    stats: calculateTaskStats(pendingTask)
  }
}

export function applyTaskEvent(task: GenerationTask, event: TaskEvent): GenerationTask {
  const updated = applyEventWithoutStats(task, event)
  return {
    ...updated,
    stats: calculateTaskStats(updated)
  }
}

export function retryFailedNode(task: GenerationTask, resourceId: string): GenerationTask {
  const updatedTask: GenerationTask = {
    ...task,
    status: 'running',
    error: undefined,
    completedAt: undefined,
    stages: task.stages.map((stage) => {
      const hasResource = stage.nodes.some((node) => node.resource.id === resourceId)
      return {
        ...stage,
        status: hasResource ? 'running' : stage.status,
        nodes: stage.nodes.map((node) =>
          node.resource.id === resourceId
            ? {
                ...node,
                status: 'pending',
                error: undefined
              }
            : node
        )
      }
    })
  }

  return {
    ...updatedTask,
    stats: calculateTaskStats(updatedTask)
  }
}

export function canCompressTask(task: GenerationTask | null): boolean {
  if (!task || task.zipPath) return false
  const documentStage = task.stages.find((stage) => stage.id === 'document')
  return task.status === 'completed' && documentStage?.status === 'completed'
}

export function regenerateResource(
  task: GenerationTask,
  resourceId: string,
  suggestion?: string
): GenerationTask {
  const updatedStages = task.stages.map((stage) => ({
    ...stage,
    nodes: stage.nodes.map((node) => {
      if (node.resource.id !== resourceId) return node

      const generatedAt = nowText()
      const suggestionRecord = suggestion?.trim()
        ? [{ text: suggestion.trim(), createdAt: generatedAt }, ...node.resource.suggestions]
        : node.resource.suggestions

      return {
        ...node,
        status: 'completed' as NodeStatus,
        resource: {
          ...node.resource,
          content: `${node.resource.content}\n\n---\n第 ${node.resource.regenerateCount + 1} 次重新生成：${suggestion?.trim() || '按当前资源上下文重新生成。'}`,
          generatedAt,
          regenerateCount: node.resource.regenerateCount + 1,
          suggestions: suggestionRecord
        }
      }
    })
  }))

  const updatedTask = {
    ...task,
    stages: updatedStages,
    completedAt: nowText()
  }

  return {
    ...updatedTask,
    stats: calculateTaskStats(updatedTask)
  }
}

export function compressTask(task: GenerationTask): GenerationTask {
  const compressedAt = nowText()
  const updatedTask = {
    ...task,
    zipPath: `${task.documentDirectory.replace(/[\\/]+$/, '')}/${task.title}_交付包.zip`,
    completedAt: compressedAt
  }

  return {
    ...updatedTask,
    stats: calculateTaskStats(updatedTask)
  }
}

function applyEventWithoutStats(task: GenerationTask, event: TaskEvent): GenerationTask {
  switch (event.type) {
    case 'task-started':
      return {
        ...task,
        status: 'running',
        startedAt: event.at,
        completedAt: undefined,
        error: undefined
      }
    case 'stage-started':
      return {
        ...task,
        status: 'running',
        stages: updateStage(task.stages, event.stageId, (stage) => ({
          ...stage,
          status: 'running'
        }))
      }
    case 'node-started':
      return {
        ...task,
        status: 'running',
        stages: updateStage(task.stages, event.stageId, (stage) => ({
          ...stage,
          status: 'running',
          nodes: updateNode(stage.nodes, event.nodeId, (node) => ({
            ...node,
            status: 'running',
            error: undefined
          }))
        }))
      }
    case 'node-completed':
      return {
        ...task,
        stages: updateStage(task.stages, event.stageId, (stage) => ({
          ...stage,
          nodes: updateNode(stage.nodes, event.nodeId, (node) => ({
            ...node,
            status: 'completed',
            resource: event.resource ?? node.resource,
            error: undefined
          }))
        }))
      }
    case 'node-failed':
      return {
        ...task,
        status: event.error.recoverable ? 'needs-attention' : 'failed',
        completedAt: event.at,
        error: event.error,
        stages: updateStage(task.stages, event.stageId, (stage) => ({
          ...stage,
          status: event.error.recoverable ? 'needs-attention' : 'failed',
          nodes: updateNode(stage.nodes, event.nodeId, (node) => ({
            ...node,
            status: 'failed',
            error: event.error
          }))
        }))
      }
    case 'stage-completed':
      return {
        ...task,
        stages: updateStage(task.stages, event.stageId, (stage) => ({
          ...stage,
          status: 'completed',
          nodes: stage.nodes.map((node) => ({
            ...node,
            status: node.status === 'failed' ? node.status : 'completed'
          }))
        }))
      }
    case 'task-completed':
      return {
        ...task,
        status: 'completed',
        completedAt: event.at,
        error: undefined
      }
    case 'task-failed':
      return {
        ...task,
        status: 'failed',
        completedAt: event.at,
        error: event.error
      }
    case 'resource-updated':
      return {
        ...task,
        completedAt: event.at,
        stages: task.stages.map((stage) => ({
          ...stage,
          nodes: stage.nodes.map((node) =>
            node.resource.id === event.resourceId
              ? {
                  ...node,
                  status: 'completed',
                  resource: event.resource,
                  error: undefined
                }
              : node
          )
        }))
      }
    case 'archive-created':
      return {
        ...task,
        zipPath: event.zipPath,
        completedAt: event.at
      }
  }
}

export function calculateTaskStats(task: GenerationTask): TaskStats {
  const resources = task.stages.flatMap((stage) => stage.nodes.map((node) => node.resource))
  const regenerateCount = resources.reduce((sum, resource) => sum + resource.regenerateCount, 0)
  const latestCompletedAt = resources
    .map((resource) => resource.generatedAt)
    .sort()
    .at(-1)

  return {
    durationSeconds: task.completedAt ? secondsBetween(task.startedAt, task.completedAt) : 0,
    resourceCount: resources.length,
    templateCount: task.stages.find((stage) => stage.id === 'document')?.nodes.length ?? 0,
    regenerateCount,
    latestCompletedAt: latestCompletedAt ?? task.startedAt
  }
}

function createStage(id: WorkflowStage['id'], name: string, nodes: WorkflowNode[]): WorkflowStage {
  return {
    id,
    name,
    status: 'completed',
    nodes
  }
}

function updateStage(
  stages: WorkflowStage[],
  stageId: WorkflowStage['id'],
  update: (stage: WorkflowStage) => WorkflowStage
): WorkflowStage[] {
  return stages.map((stage) => (stage.id === stageId ? update(stage) : stage))
}

function updateNode(
  nodes: WorkflowNode[],
  nodeId: string,
  update: (node: WorkflowNode) => WorkflowNode
): WorkflowNode[] {
  return nodes.map((node) => (node.id === nodeId ? update(node) : node))
}

function createNode(
  id: string,
  name: string,
  type: ResourceType,
  title: string,
  content?: string,
  templateId?: string
): WorkflowNode {
  return {
    id,
    name,
    status: 'completed',
    resource: createResource(id, name, type, title, content, templateId)
  }
}

function createResource(
  id: string,
  name: string,
  type: ResourceType,
  title: string,
  content?: string,
  templateId?: string
): ResourceArtifact {
  return {
    id: `resource-${id}`,
    type,
    name,
    content: content ?? buildDocumentContent(title, name),
    previewLabel: type === 'html-demo' ? '预览演示界面' : '查看资源',
    generatedAt: nowText(),
    regenerateCount: 0,
    suggestions: [],
    templateId
  }
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
}

function nowText(): string {
  return new Date().toISOString()
}

function secondsBetween(start: string, end: string): number {
  const diff = new Date(end).getTime() - new Date(start).getTime()
  return Math.max(1, Math.round(diff / 1000))
}
