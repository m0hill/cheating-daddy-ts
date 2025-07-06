import type { IpcEvents, KeybindConfig } from '@shared/types'
import { app, BrowserWindow, ipcMain, shell } from 'electron'
import started from 'electron-squirrel-startup'
import { geminiService } from './gemini/GeminiService'
import { createWindowManager } from './window/WindowManager'

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (started) {
  process.exit(0)
}

// Keep a reference to the window manager to prevent it from being garbage collected
let windowManagerInstance: ReturnType<typeof createWindowManager> | null = null

const setupGeneralIpcHandlers = (manager: ReturnType<typeof createWindowManager>): void => {
  ipcMain.handle('quit-application', async (): Promise<{ success: boolean; error?: string }> => {
    try {
      cleanup()
      app.quit()
      return { success: true }
    } catch (error) {
      console.error('Error quitting application:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  ipcMain.handle(
    'open-external',
    async (_, url: string): Promise<{ success: boolean; error?: string }> => {
      try {
        await shell.openExternal(url)
        return { success: true }
      } catch (error) {
        console.error('Error opening external URL:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to open URL',
        }
      }
    }
  )

  ipcMain.on('update-keybinds', (_, newKeybinds: KeybindConfig) => {
    manager.updateGlobalShortcuts(newKeybinds)
  })

  ipcMain.handle(
    'update-content-protection',
    async (): Promise<{ success: boolean; error?: string }> => {
      try {
        const mainWindow = manager.getMainWindow()
        if (mainWindow) {
          const contentProtection = await mainWindow.webContents.executeJavaScript(
            'window.electronAPI ? localStorage.getItem("contentProtection") !== "false" : true'
          )
          mainWindow.setContentProtection(contentProtection)
          console.log('Content protection updated:', contentProtection)
        }
        return { success: true }
      } catch (error) {
        console.error('Error updating content protection:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update content protection',
        }
      }
    }
  )
}

const initialize = async (): Promise<void> => {
  try {
    // Initialize services and managers
    windowManagerInstance = createWindowManager()
    await windowManagerInstance.createMainWindow()

    // Setup IPC handlers
    geminiService.setupIpcHandlers()
    windowManagerInstance.setupIpcHandlers()
    setupGeneralIpcHandlers(windowManagerInstance)

    console.log('Application initialized successfully')
  } catch (error) {
    console.error('Failed to initialize application:', error)
    app.quit()
  }
}

const cleanup = (): void => {
  try {
    geminiService.stopMacOSAudioCapture()
    windowManagerInstance?.cleanup()
    console.log('Application cleanup completed')
  } catch (error) {
    console.error('Error during cleanup:', error)
  }
}

//function to send messages to renderer
export const sendToRenderer = <K extends keyof IpcEvents>(channel: K, data: IpcEvents[K]): void => {
  if (windowManagerInstance) {
    windowManagerInstance.sendToRenderer(channel, data)
  }
}

// App Event Listeners
app.whenReady().then(initialize)

app.on('window-all-closed', () => {
  cleanup()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', cleanup)

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    windowManagerInstance?.createMainWindow()
  }
})

// Export the cleanup function for potential external use
export { cleanup }
