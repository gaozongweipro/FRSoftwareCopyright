import { beforeEach, describe, expect, it } from 'vitest'
import { createAppStore } from './appStore'

describe('app store', () => {
  beforeEach(() => localStorage.clear())

  it('keeps generation blocked until required settings are configured', () => {
    const store = createAppStore()
    store.projectTitle.value = ''
    store.startGeneration()
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
})
