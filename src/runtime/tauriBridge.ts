import type { DirectoryCheckResult } from './types'

export interface TauriDesktopBridge {
  isAvailable(): boolean
  checkDirectory(path: string): Promise<DirectoryCheckResult>
}

export function createDefaultTauriBridge(): TauriDesktopBridge {
  return {
    isAvailable() {
      return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
    },
    async checkDirectory() {
      return {
        exists: false,
        writable: false,
        message: '桌面目录校验命令尚未接入。'
      }
    }
  }
}
