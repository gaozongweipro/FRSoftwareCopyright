import { beforeEach, describe, expect, it } from 'vitest'
import { createStorageAdapter } from './storage'

describe('storage adapter', () => {
  beforeEach(() => localStorage.clear())

  it('returns fallback data when no value exists', () => {
    const storage = createStorageAdapter('fr-test')
    expect(storage.load('settings', { name: 'fallback' })).toEqual({ name: 'fallback' })
  })

  it('round-trips JSON values under a versioned namespace', () => {
    const storage = createStorageAdapter('fr-test')
    storage.save('settings', { outputDirectory: 'D:/outputs' })
    expect(storage.load('settings', null)).toEqual({ outputDirectory: 'D:/outputs' })
  })
})
