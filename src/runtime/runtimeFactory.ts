import { createMockRuntime } from './mockRuntime'
import { createDefaultTauriBridge, type TauriDesktopBridge } from './tauriBridge'
import { createTauriRuntime } from './tauriRuntime'
import type { GenerationRuntime } from './types'

export function createDefaultRuntime(
  bridge: TauriDesktopBridge = createDefaultTauriBridge()
): GenerationRuntime {
  if (bridge.isAvailable()) {
    return createTauriRuntime(bridge)
  }
  return createMockRuntime()
}
