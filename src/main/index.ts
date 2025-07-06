import { app, BrowserWindow, ipcMain, session, shell } from 'electron'
import started from 'electron-squirrel-startup'
import { GeminiService } from './gemini/GeminiService'
import { WindowManager } from './window/WindowManager'

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (started) {
  process.exit(0)
}

class Application {
  private windowManager: WindowManager | null = null
  private geminiService: GeminiService | null = null

  constructor() {
    this.setupAppEventListeners()
  }

  private setupAppEventListeners(): void {
    app.whenReady().then(() => {
      this.initialize()
    })

    app.on('window-all-closed', () => {
      this.cleanup()
      if (process.platform !== 'darwin') {
        app.quit()
      }
    })

    app.on('before-quit', () => {
      this.cleanup()
    })

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createMainWindow()
      }
    })
  }

  /**
   * Clears all runtime cache and storage data for the application.
   */
  private async clearCacheAndStorage(): Promise<void> {
    try {
      const defaultSession = session.defaultSession
      await defaultSession.clearCache()
      await defaultSession.clearStorageData({
        storages: [
          'cookies',
          'filesystem',
          'indexdb',
          'localstorage',
          'shadercache',
          'websql',
          'serviceworkers',
          'cachestorage',
        ],
      })
      console.log('✅ Cache and storage cleared successfully.')
    } catch (error) {
      console.error('❌ Failed to clear cache and storage:', error)
    }
  }

  private async initialize(): Promise<void> {
    // Clear cache and storage every time the app starts
    await this.clearCacheAndStorage()

    try {
      // Initialize services
      this.geminiService = new GeminiService()
      this.windowManager = new WindowManager(this.geminiService)

      // Create main window
      await this.createMainWindow()

      // Setup IPC handlers
      this.setupIpcHandlers()

      console.log('Application initialized successfully')
    } catch (error) {
      console.error('Failed to initialize application:', error)
      app.quit()
    }
  }

  private async createMainWindow(): Promise<void> {
    if (!this.windowManager) {
      throw new Error('WindowManager not initialized')
    }

    try {
      await this.windowManager.createMainWindow()
      console.log('Main window created')
    } catch (error) {
      console.error('Failed to create main window:', error)
      throw error
    }
  }

  private setupIpcHandlers(): void {
    if (!this.geminiService || !this.windowManager) {
      throw new Error('Services not initialized')
    }

    // Setup Gemini IPC handlers
    this.geminiService.setupIpcHandlers()

    // Setup general application IPC handlers
    this.setupGeneralIpcHandlers()

    // Setup window management IPC handlers
    this.windowManager.setupIpcHandlers()
  }

  private setupGeneralIpcHandlers(): void {
    // Application control handlers
    ipcMain.handle('quit-application', async (): Promise<{ success: boolean; error?: string }> => {
      try {
        this.cleanup()
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

    // External link handler
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

    // Keybinds update handler
    ipcMain.on('update-keybinds', (_, newKeybinds: any) => {
      if (this.windowManager) {
        this.windowManager.updateGlobalShortcuts(newKeybinds)
      }
    })

    // Content protection handler
    ipcMain.handle(
      'update-content-protection',
      async (): Promise<{ success: boolean; error?: string }> => {
        try {
          if (this.windowManager) {
            const contentProtection = await this.windowManager
              .getMainWindow()
              ?.webContents.executeJavaScript(
                'window.electronAPI ? localStorage.getItem("contentProtection") !== "false" : true'
              )
            this.windowManager.getMainWindow()?.setContentProtection(contentProtection)
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

  private cleanup(): void {
    try {
      // Stop any audio capture
      this.geminiService?.stopMacOSAudioCapture()

      // Cleanup window manager
      this.windowManager?.cleanup()

      console.log('Application cleanup completed')
    } catch (error) {
      console.error('Error during cleanup:', error)
    }
  }

  // Public method to send messages to renderer
  public sendToRenderer(channel: string, data: any): void {
    if (this.windowManager) {
      this.windowManager.sendToRenderer(channel, data)
    }
  }
}

// Create and start the application
const application = new Application()

// Export for potential external access
export default application
