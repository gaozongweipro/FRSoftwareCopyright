import { buildDocumentContent } from './mockData'
import type {
  AppSettings,
  GenerationTask,
  NodeStatus,
  ResourceArtifact,
  ResourceType,
  SystemType,
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
