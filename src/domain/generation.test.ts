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
