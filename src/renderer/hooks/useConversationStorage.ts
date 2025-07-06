import type { ConversationSession, ConversationTurn } from '@shared/types'
import { useCallback, useEffect, useState } from 'react'
import { useIpc } from './index'

interface ConversationStorageState {
  isInitialized: boolean
  error: string | null
}

let conversationDB: IDBDatabase | null = null

export const useConversationStorage = () => {
  const [state, setState] = useState<ConversationStorageState>({
    isInitialized: false,
    error: null,
  })

  const electronAPI = useIpc()

  // Initialize IndexedDB
  const initConversationStorage = useCallback(async (): Promise<void> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('ConversationHistory', 1)

      request.onerror = () => {
        const error = 'Failed to open conversation database'
        setState(prev => ({ ...prev, error }))
        reject(new Error(error))
      }

      request.onsuccess = () => {
        conversationDB = request.result
        setState(prev => ({ ...prev, isInitialized: true, error: null }))
        resolve()
      }

      request.onupgradeneeded = event => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create sessions store
        if (!db.objectStoreNames.contains('sessions')) {
          const sessionStore = db.createObjectStore('sessions', { keyPath: 'sessionId' })
          sessionStore.createIndex('timestamp', 'timestamp', { unique: false })
        }
      }
    })
  }, [])

  // Save conversation session
  const saveConversationSession = useCallback(
    async (sessionId: string, conversationHistory: ConversationTurn[]): Promise<void> => {
      if (!conversationDB) {
        await initConversationStorage()
      }

      if (!conversationDB) {
        throw new Error('Database not initialized')
      }

      const transaction = conversationDB.transaction(['sessions'], 'readwrite')
      const store = transaction.objectStore('sessions')

      const sessionData: ConversationSession = {
        sessionId: sessionId,
        timestamp: parseInt(sessionId),
        conversationHistory: conversationHistory,
        lastUpdated: Date.now(),
      }

      return new Promise((resolve, reject) => {
        const request = store.put(sessionData)
        request.onerror = () => reject(new Error('Failed to save conversation session'))
        request.onsuccess = () => resolve()
      })
    },
    [initConversationStorage]
  )

  // Get conversation session
  const getConversationSession = useCallback(
    async (sessionId: string): Promise<ConversationSession | null> => {
      if (!conversationDB) {
        await initConversationStorage()
      }

      if (!conversationDB) {
        throw new Error('Database not initialized')
      }

      const transaction = conversationDB.transaction(['sessions'], 'readonly')
      const store = transaction.objectStore('sessions')

      return new Promise((resolve, reject) => {
        const request = store.get(sessionId)
        request.onerror = () => reject(new Error('Failed to get conversation session'))
        request.onsuccess = () => resolve(request.result || null)
      })
    },
    [initConversationStorage]
  )

  // Get all conversation sessions
  const getAllConversationSessions = useCallback(async (): Promise<ConversationSession[]> => {
    if (!conversationDB) {
      await initConversationStorage()
    }

    if (!conversationDB) {
      throw new Error('Database not initialized')
    }

    const transaction = conversationDB.transaction(['sessions'], 'readonly')
    const store = transaction.objectStore('sessions')
    const index = store.index('timestamp')

    return new Promise((resolve, reject) => {
      const request = index.getAll()
      request.onerror = () => reject(new Error('Failed to get conversation sessions'))
      request.onsuccess = () => {
        // Sort by timestamp descending (newest first)
        const sessions = request.result.sort((a, b) => b.timestamp - a.timestamp)
        resolve(sessions)
      }
    })
  }, [initConversationStorage])

  // Delete conversation session
  const deleteConversationSession = useCallback(
    async (sessionId: string): Promise<void> => {
      if (!conversationDB) {
        await initConversationStorage()
      }

      if (!conversationDB) {
        throw new Error('Database not initialized')
      }

      const transaction = conversationDB.transaction(['sessions'], 'readwrite')
      const store = transaction.objectStore('sessions')

      return new Promise((resolve, reject) => {
        const request = store.delete(sessionId)
        request.onerror = () => reject(new Error('Failed to delete conversation session'))
        request.onsuccess = () => resolve()
      })
    },
    [initConversationStorage]
  )

  // Clear all conversation sessions
  const clearAllConversationSessions = useCallback(async (): Promise<void> => {
    if (!conversationDB) {
      await initConversationStorage()
    }

    if (!conversationDB) {
      throw new Error('Database not initialized')
    }

    const transaction = conversationDB.transaction(['sessions'], 'readwrite')
    const store = transaction.objectStore('sessions')

    return new Promise((resolve, reject) => {
      const request = store.clear()
      request.onerror = () => reject(new Error('Failed to clear conversation sessions'))
      request.onsuccess = () => resolve()
    })
  }, [initConversationStorage])

  // Initialize on mount and set up IPC listener
  useEffect(() => {
    const initialize = async () => {
      try {
        await initConversationStorage()
      } catch (error) {
        console.error('Failed to initialize conversation storage:', error)
      }
    }

    initialize()

    // Listen for conversation data from main process
    const unsubscribe = electronAPI.on.saveConversationTurn(async data => {
      try {
        await saveConversationSession(data.sessionId, data.fullHistory)
        console.log('Conversation session saved:', data.sessionId)
      } catch (error) {
        console.error('Error saving conversation session:', error)
      }
    })

    return unsubscribe
  }, [initConversationStorage, saveConversationSession, electronAPI.on])

  return {
    ...state,
    saveConversationSession,
    getConversationSession,
    getAllConversationSessions,
    deleteConversationSession,
    clearAllConversationSessions,
    initConversationStorage,
  }
}
