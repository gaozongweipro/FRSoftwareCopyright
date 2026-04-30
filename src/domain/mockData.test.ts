import { describe, expect, it } from 'vitest'
import { createDemoTemplateAnalysis, createInitialSettings } from './mockData'

describe('mock data builders', () => {
  it('creates settings with no output directory by default so validation can block generation', () => {
    const settings = createInitialSettings()
    expect(settings.basic.outputDirectory).toBe('')
    expect(settings.agent.status).toBe('untested')
  })

  it('creates agent-style template analysis with structure, dynamic fields, and Word styles', () => {
    const analysis = createDemoTemplateAnalysis('software-manual')
    expect(analysis.structureNodes.length).toBeGreaterThan(3)
    expect(analysis.dynamicFields.map((field) => field.key)).toContain('projectName')
    expect(analysis.styleRules.some((rule) => rule.fontFamily && rule.lineHeight)).toBe(true)
  })
})
