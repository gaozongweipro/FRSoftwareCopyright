import { describe, expect, it } from 'vitest'
import { createInitialSettings } from '../domain/mockData'
import { createDefaultRuntime } from './runtimeFactory'
import type { TauriDesktopBridge } from './tauriBridge'

describe('runtime factory', () => {
  it('uses mock runtime when desktop bridge is unavailable', async () => {
    const runtime = createDefaultRuntime({
      isAvailable: () => false,
      checkDirectory: async () => ({ exists: false, writable: false })
    })
    const status = await runtime.getEnvironmentStatus(createInitialSettings())

    expect(status.mode).toBe('mock')
  })

  it('uses tauri runtime when desktop bridge is available', async () => {
    const bridge: TauriDesktopBridge = {
      isAvailable: () => true,
      checkDirectory: async () => ({ exists: true, writable: true })
    }
    const settings = createInitialSettings()
    settings.basic.outputDirectory = 'D:/fr-outputs'

    const runtime = createDefaultRuntime(bridge)
    const status = await runtime.getEnvironmentStatus(settings)

    expect(status.mode).toBe('tauri')
  })
})
