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
