/* eslint-disable @typescript-eslint/no-explicit-any */
import { createStorage } from 'unstorage'
import lruCacheDriver from 'unstorage/drivers/lru-cache'

const unstorage = createStorage({
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
      return await unstorage.hasItem(`${prefix}:${key}`)
    },
    getItem: async (key: string) => {
      return await unstorage.getItem(`${prefix}:${key}`)
    },
    setItem: async (key: string, value: any) => {
      return await unstorage.setItem(`${prefix}:${key}`, value)
    },
    removeItem: async (key: string) => {
      return await unstorage.removeItem(`${prefix}:${key}`)
    },
    clear: async () => {
      const keys = await unstorage.getKeys(`${prefix}:`)
      return await Promise.all(keys.map((key) => unstorage.removeItem(key)))
    },
  }
}
