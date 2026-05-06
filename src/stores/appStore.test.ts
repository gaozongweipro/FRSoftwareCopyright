import { beforeEach, describe, expect, it } from 'vitest'
import { createAppStore } from './appStore'

describe('app store', () => {
  beforeEach(() => localStorage.clear())

  it('keeps generation blocked until required settings are configured', async () => {
    const store = createAppStore()
    store.projectTitle.value = ''
    await store.startGeneration()
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
})
