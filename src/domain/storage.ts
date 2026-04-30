export function createStorageAdapter(namespace: string) {
  return {
    load<T>(key: string, fallback: T): T {
      const raw = localStorage.getItem(`${namespace}:v1:${key}`)
      if (!raw) return fallback
      try {
        return JSON.parse(raw) as T
      } catch {
        return fallback
      }
    },
    save<T>(key: string, value: T): void {
      localStorage.setItem(`${namespace}:v1:${key}`, JSON.stringify(value))
    },
    remove(key: string): void {
      localStorage.removeItem(`${namespace}:v1:${key}`)
    }
  }
}
