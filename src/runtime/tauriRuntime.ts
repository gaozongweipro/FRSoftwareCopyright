import type { AppSettings, RuntimeErrorInfo } from '../domain/types'
import { createMockRuntime } from './mockRuntime'
import type { TauriDesktopBridge } from './tauriBridge'
import type { GenerationRuntime } from './types'

export function createTauriRuntime(bridge: TauriDesktopBridge): GenerationRuntime {
  const fallback = createMockRuntime()

  return {
    ...fallback,
    async getEnvironmentStatus(settings) {
      const issues = await validateTauriEnvironment(settings, bridge)
      return {
        mode: 'tauri',
        label: '桌面运行时',
        available: bridge.isAvailable() && issues.length === 0,
        checkedAt: nowText(),
        issues
      }
    },
    async validateEnvironment(settings) {
      return validateTauriEnvironment(settings, bridge)
    }
  }
}

async function validateTauriEnvironment(
  settings: AppSettings,
  bridge: TauriDesktopBridge
): Promise<RuntimeErrorInfo[]> {
  if (!bridge.isAvailable()) {
    return [createError('runtime-tauri-unavailable', '当前未检测到桌面运行时能力。')]
  }

  const outputDirectory = settings.basic.outputDirectory.trim()
  if (!outputDirectory) {
    return [createError('runtime-directory-empty', '请先配置产出资源目录。')]
  }

  const result = await bridge.checkDirectory(outputDirectory)
  if (!result.exists) {
    return [
      createError('runtime-directory-unavailable', result.message ?? '产出资源目录不可访问。')
    ]
  }

  if (!result.writable) {
    return [createError('runtime-directory-readonly', result.message ?? '产出资源目录不可写。')]
  }

  return []
}

function createError(code: string, message: string): RuntimeErrorInfo {
  return { code, message, recoverable: true }
}

function nowText(): string {
  return new Date().toISOString()
}
