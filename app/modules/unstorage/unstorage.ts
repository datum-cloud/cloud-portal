/* eslint-disable @typescript-eslint/no-explicit-any */
import { createStorage } from 'unstorage'
import lruCacheDriver from 'unstorage/drivers/lru-cache'

export const cacheStorage = createStorage({
  driver: lruCacheDriver({
    ttl: 1000 * 60 * 60 * 1, // 1 hour TTL
    allowStale: false,
    ttlAutopurge: true, // Automatically purge expired items
    max: 1000, // Maximum number of items in cache
  }),
})

export const createCacheClient = (prefix: string) => {
  return {
    hasItem: async (key: string) => {
      return await cacheStorage.hasItem(`${prefix}:${key}`)
    },
    getItem: async (key: string) => {
      return await cacheStorage.getItem(`${prefix}:${key}`)
    },
    setItem: async (key: string, value: any) => {
      return await cacheStorage.setItem(`${prefix}:${key}`, value)
    },
    removeItem: async (key: string) => {
      return await cacheStorage.removeItem(`${prefix}:${key}`)
    },
    clear: async () => {
      const keys = await cacheStorage.getKeys(`${prefix}:`)
      return await Promise.all(keys.map((key) => cacheStorage.removeItem(key)))
    },
  }
}
