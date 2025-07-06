import type {
  KeybindConfig,
  PlatformInfo,
  ProfileType,
  SaveConversationTurnPayload,
} from '@shared/types'
import { contextBridge, ipcRenderer } from 'electron'

// Platform detection
const platformInfo: PlatformInfo = {
  isMacOS: process.platform === 'darwin',
  isLinux: process.platform === 'linux',
  isWindows: process.platform === 'win32',
}

// Create a type-safe IPC API
const electronAPI = {
  // Platform info
  platform: platformInfo,

  // IPC invoke methods (main process handlers)
  invoke: {
    initializeGemini: (
      apiKey: string,
      customPrompt?: string,
      profile?: ProfileType,
      language?: string
    ) => ipcRenderer.invoke('initialize-gemini', { apiKey, customPrompt, profile, language }),

    sendAudioContent: (content: { data: string; mimeType: string; source?: string }) =>
      ipcRenderer.invoke('send-audio-content', content),

    sendImageContent: (content: { data: string; debug?: boolean }) =>
      ipcRenderer.invoke('send-image-content', content),

    sendTextMessage: (text: string) => ipcRenderer.invoke('send-text-message', text),

    closeSession: () => ipcRenderer.invoke('close-session'),

    startMacOSAudio: () => ipcRenderer.invoke('start-macos-audio'),

    stopMacOSAudio: () => ipcRenderer.invoke('stop-macos-audio'),

    getCurrentSession: () => ipcRenderer.invoke('get-current-session'),

    startNewSession: () => ipcRenderer.invoke('start-new-session'),

    toggleWindowVisibility: () => ipcRenderer.invoke('toggle-window-visibility'),

    updateSizes: () => ipcRenderer.invoke('update-sizes'),

    minimizeWindow: () => ipcRenderer.invoke('window-minimize'),

    quitApplication: () => ipcRenderer.invoke('quit-application'),

    openExternal: (url: string) => ipcRenderer.invoke('open-external', url),

    updateGoogleSearchSetting: (enabled: boolean) =>
      ipcRenderer.invoke('update-google-search-setting', enabled),

    updateContentProtection: () => ipcRenderer.invoke('update-content-protection'),

    checkMicrophonePermission: () => ipcRenderer.invoke('check-microphone-permission'),

    requestMicrophonePermission: () => ipcRenderer.invoke('request-microphone-permission'),
  },

  // IPC send methods (fire and forget)
  send: {
    viewChanged: (view: string) => ipcRenderer.send('view-changed', view),

    updateKeybinds: (keybinds: KeybindConfig) => ipcRenderer.send('update-keybinds', keybinds),
  },

  // Event listeners (main -> renderer)
  on: {
    updateResponse: (callback: (response: string) => void) => {
      const listener = (_: unknown, response: string) => callback(response)
      ipcRenderer.on('update-response', listener)
      return () => {
        ipcRenderer.removeListener('update-response', listener)
      }
    },

    updateStatus: (callback: (status: string) => void) => {
      const listener = (_: unknown, status: string) => callback(status)
      ipcRenderer.on('update-status', listener)
      return () => {
        ipcRenderer.removeListener('update-status', listener)
      }
    },

    sessionInitializing: (callback: (isInitializing: boolean) => void) => {
      const listener = (_: unknown, isInitializing: boolean) => callback(isInitializing)
      ipcRenderer.on('session-initializing', listener)
      return () => {
        ipcRenderer.removeListener('session-initializing', listener)
      }
    },

    clickThroughToggled: (callback: (isEnabled: boolean) => void) => {
      const listener = (_: unknown, isEnabled: boolean) => callback(isEnabled)
      ipcRenderer.on('click-through-toggled', listener)
      return () => {
        ipcRenderer.removeListener('click-through-toggled', listener)
      }
    },

    saveConversationTurn: (callback: (data: SaveConversationTurnPayload) => void) => {
      const listener = (_: unknown, data: SaveConversationTurnPayload) => callback(data)
      ipcRenderer.on('save-conversation-turn', listener)
      return () => {
        ipcRenderer.removeListener('save-conversation-turn', listener)
      }
    },

    navigatePreviousResponse: (callback: () => void) => {
      const listener = () => callback()
      ipcRenderer.on('navigate-previous-response', listener)
      return () => {
        ipcRenderer.removeListener('navigate-previous-response', listener)
      }
    },

    navigateNextResponse: (callback: () => void) => {
      const listener = () => callback()
      ipcRenderer.on('navigate-next-response', listener)
      return () => {
        ipcRenderer.removeListener('navigate-next-response', listener)
      }
    },

    scrollResponseUp: (callback: () => void) => {
      const listener = () => callback()
      ipcRenderer.on('scroll-response-up', listener)
      return () => {
        ipcRenderer.removeListener('scroll-response-up', listener)
      }
    },

    scrollResponseDown: (callback: () => void) => {
      const listener = () => callback()
      ipcRenderer.on('scroll-response-down', listener)
      return () => {
        ipcRenderer.removeListener('scroll-response-down', listener)
      }
    },
  },

  // Utility methods
  executeJavaScript: (code: string) => ipcRenderer.invoke('execute-javascript', code),
}

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI)

// Type declarations for the global window object
declare global {
  interface Window {
    electronAPI: typeof electronAPI
  }
}
