import { describe, expect, it } from 'vitest'
import { createDemoTemplate, createInitialSettings } from './mockData'
import {
  applyTaskEvent,
  canCompressTask,
  createGenerationTask,
  createInitialGenerationTask,
  regenerateResource,
  retryFailedNode,
  validateGenerationStart
} from './generation'

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

  it('progresses a generated task through running and completed node events', () => {
    const settings = createInitialSettings()
    settings.basic.outputDirectory = 'D:/fr-outputs'
    settings.agent = { baseUrl: 'https://api.example.com', apiKey: 'sk-demo', model: 'demo-model', status: 'available' }
    settings.templates = [createDemoTemplate('说明书.docx', 'software-manual')]

    const task = createInitialGenerationTask('智慧仓储管理系统 V1.0', 'web', settings)
    const running = applyTaskEvent(task, {
      type: 'node-started',
      stageId: 'analysis',
      nodeId: 'analysis-function',
      at: '2026-05-06T00:00:00.000Z'
    })
    expect(running.status).toBe('running')
    expect(running.stages[0].nodes[0].status).toBe('running')

    const completed = applyTaskEvent(running, {
      type: 'node-completed',
      stageId: 'analysis',
      nodeId: 'analysis-function',
      at: '2026-05-06T00:00:01.000Z'
    })
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

    const completedStages = task.stages.reduce(
      (current, stage) =>
        applyTaskEvent(current, {
          type: 'stage-completed',
          stageId: stage.id,
          at: '2026-05-06T00:00:03.000Z'
        }),
      task
    )
    const completed = applyTaskEvent(completedStages, {
      type: 'task-completed',
      at: '2026-05-06T00:00:04.000Z'
    })
    expect(canCompressTask(completed)).toBe(true)
  })
})
