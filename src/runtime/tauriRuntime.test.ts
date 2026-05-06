import { describe, expect, it } from 'vitest'
import { createInitialSettings } from '../domain/mockData'
import { createTauriRuntime } from './tauriRuntime'
import type { TauriDesktopBridge } from './tauriBridge'

function createBridge(
  result: { exists: boolean; writable: boolean; message?: string },
  available = true
): TauriDesktopBridge {
  return {
    isAvailable: () => available,
    checkDirectory: async () => result
  }
}

describe('tauri runtime', () => {
  it('reports unavailable when the desktop bridge is missing', async () => {
    const runtime = createTauriRuntime(createBridge({ exists: false, writable: false }, false))
    const status = await runtime.getEnvironmentStatus(createInitialSettings())

    expect(status.mode).toBe('tauri')
    expect(status.available).toBe(false)
    expect(status.issues[0].code).toBe('runtime-tauri-unavailable')
  })

  it('blocks validation when output directory is empty', async () => {
    const runtime = createTauriRuntime(createBridge({ exists: true, writable: true }))
    const issues = await runtime.validateEnvironment(createInitialSettings())

    expect(issues[0].code).toBe('runtime-directory-empty')
  })

  it('blocks validation when output directory is readonly', async () => {
    const settings = createInitialSettings()
    settings.basic.outputDirectory = 'D:/readonly'
    const runtime = createTauriRuntime(
      createBridge({ exists: true, writable: false, message: 'readonly' })
    )

    const issues = await runtime.validateEnvironment(settings)

    expect(issues[0].code).toBe('runtime-directory-readonly')
  })

  it('allows validation when output directory exists and is writable', async () => {
    const settings = createInitialSettings()
    settings.basic.outputDirectory = 'D:/fr-outputs'
    const runtime = createTauriRuntime(createBridge({ exists: true, writable: true }))

    await expect(runtime.validateEnvironment(settings)).resolves.toEqual([])
  })
})
