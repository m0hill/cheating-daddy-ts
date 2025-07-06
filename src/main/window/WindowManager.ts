import { existsSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { KeybindConfig, ViewType } from '@shared/types'
import { BrowserWindow, desktopCapturer, globalShortcut, ipcMain, screen, session } from 'electron'
import type { GeminiService } from '../gemini/GeminiService'

export class WindowManager {
  private mainWindow: BrowserWindow | null = null
  private mouseEventsIgnored = false
  private windowResizing = false
  private resizeAnimation: NodeJS.Timeout | null = null
  private readonly RESIZE_ANIMATION_DURATION = 500 // milliseconds

  constructor(private geminiService: GeminiService) {
    this.ensureDataDirectories()
  }

  private ensureDataDirectories(): void {
    const homeDir = homedir()
    const cheddarDir = join(homeDir, 'cheddar')
    const dataDir = join(cheddarDir, 'data')
    const imageDir = join(dataDir, 'image')
    const audioDir = join(dataDir, 'audio')

    ;[cheddarDir, dataDir, imageDir, audioDir].forEach(dir => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }
    })
  }

  public async createMainWindow(): Promise<BrowserWindow> {
    // Get layout preference (default to 'normal')
    const windowWidth = 900
    const windowHeight = 400

    this.mainWindow = new BrowserWindow({
      width: windowWidth,
      height: windowHeight,
      frame: false,
      transparent: true,
      hasShadow: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        backgroundThrottling: false,
        enableBlinkFeatures: 'GetDisplayMedia',
        webSecurity: true,
        allowRunningInsecureContent: false,
        preload: join(__dirname, 'index.js'),
      },
      backgroundColor: '#00000000',
    })

    // Setup display media handler
    session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
      desktopCapturer.getSources({ types: ['screen'] }).then(sources => {
        callback({ video: sources[0], audio: 'loopback' })
      })
    })

    this.mainWindow.setResizable(false)
    this.mainWindow.setContentProtection(true)
    this.mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

    // Center window at the top of the screen
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width: screenWidth } = primaryDisplay.workAreaSize
    const x = Math.floor((screenWidth - windowWidth) / 2)
    const y = 0
    this.mainWindow.setPosition(x, y)

    // Platform-specific settings
    if (process.platform === 'win32') {
      this.mainWindow.setAlwaysOnTop(true, 'screen-saver', 1)
    }

    // For development, use Vite dev server
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      this.mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL)
      // this.mainWindow.webContents.openDevTools()
    } else {
      this.mainWindow.loadFile(join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`))
    }

    // Setup window event handlers
    this.setupWindowEventHandlers()

    return this.mainWindow
  }

  private setupWindowEventHandlers(): void {
    if (!this.mainWindow) return

    // After window is created, check for settings and setup shortcuts
    this.mainWindow.webContents.once('dom-ready', () => {
      setTimeout(() => {
        this.initializeWindowSettings()
      }, 150)
    })
  }

  private async initializeWindowSettings(): Promise<void> {
    if (!this.mainWindow) return

    try {
      const defaultKeybinds = this.getDefaultKeybinds()
      let keybinds = defaultKeybinds

      const savedSettings = await this.mainWindow.webContents.executeJavaScript(`
        (function() {
          try {
            const savedKeybinds = localStorage.getItem('customKeybinds');
            return {
              keybinds: savedKeybinds ? JSON.parse(savedKeybinds) : null
            };
          } catch (e) {
            return { keybinds: null };
          }
        })()
      `)

      if (savedSettings.keybinds) {
        keybinds = { ...defaultKeybinds, ...savedSettings.keybinds }
      }

      // Apply content protection setting
      try {
        const contentProtection = await this.mainWindow.webContents.executeJavaScript(
          'localStorage.getItem("contentProtection") !== "false"'
        )
        this.mainWindow.setContentProtection(contentProtection)
        console.log('Content protection loaded from settings:', contentProtection)
      } catch (error) {
        console.error('Error loading content protection:', error)
        this.mainWindow.setContentProtection(true)
      }

      this.updateGlobalShortcuts(keybinds)
    } catch (error) {
      console.error('Error initializing window settings:', error)
      // Default to content protection enabled and default shortcuts
      this.mainWindow.setContentProtection(true)
      this.updateGlobalShortcuts(this.getDefaultKeybinds())
    }
  }

  private getDefaultKeybinds(): KeybindConfig {
    const isMac = process.platform === 'darwin'
    return {
      moveUp: isMac ? 'Alt+Up' : 'Ctrl+Up',
      moveDown: isMac ? 'Alt+Down' : 'Ctrl+Down',
      moveLeft: isMac ? 'Alt+Left' : 'Ctrl+Left',
      moveRight: isMac ? 'Alt+Right' : 'Ctrl+Right',
      toggleVisibility: isMac ? 'Cmd+\\' : 'Ctrl+\\',
      toggleClickThrough: isMac ? 'Cmd+M' : 'Ctrl+M',
      nextStep: isMac ? 'Cmd+Enter' : 'Ctrl+Enter',
      previousResponse: isMac ? 'Cmd+[' : 'Ctrl+[',
      nextResponse: isMac ? 'Cmd+]' : 'Ctrl+]',
      scrollUp: isMac ? 'Cmd+Shift+Up' : 'Ctrl+Shift+Up',
      scrollDown: isMac ? 'Cmd+Shift+Down' : 'Ctrl+Shift+Down',
    }
  }

  public updateGlobalShortcuts(keybinds: KeybindConfig): void {
    if (!this.mainWindow) return

    console.log('Updating global shortcuts with:', keybinds)

    // Unregister all existing shortcuts
    globalShortcut.unregisterAll()

    const primaryDisplay = screen.getPrimaryDisplay()
    const { width, height } = primaryDisplay.workAreaSize
    const moveIncrement = Math.floor(Math.min(width, height) * 0.1)

    // Register window movement shortcuts
    const movementActions = {
      moveUp: () => {
        if (!this.mainWindow?.isVisible()) return
        const [currentX, currentY] = this.mainWindow.getPosition()
        this.mainWindow.setPosition(currentX, currentY - moveIncrement)
      },
      moveDown: () => {
        if (!this.mainWindow?.isVisible()) return
        const [currentX, currentY] = this.mainWindow.getPosition()
        this.mainWindow.setPosition(currentX, currentY + moveIncrement)
      },
      moveLeft: () => {
        if (!this.mainWindow?.isVisible()) return
        const [currentX, currentY] = this.mainWindow.getPosition()
        this.mainWindow.setPosition(currentX - moveIncrement, currentY)
      },
      moveRight: () => {
        if (!this.mainWindow?.isVisible()) return
        const [currentX, currentY] = this.mainWindow.getPosition()
        this.mainWindow.setPosition(currentX + moveIncrement, currentY)
      },
    }

    // Register each movement shortcut
    Object.entries(movementActions).forEach(([action, handler]) => {
      const keybind = keybinds[action as keyof typeof movementActions]
      if (keybind) {
        try {
          globalShortcut.register(keybind, handler)
          console.log(`Registered ${action}: ${keybind}`)
        } catch (error) {
          console.error(`Failed to register ${action} (${keybind}):`, error)
        }
      }
    })

    // Register toggle visibility shortcut
    if (keybinds.toggleVisibility) {
      try {
        globalShortcut.register(keybinds.toggleVisibility, () => {
          if (!this.mainWindow) return
          if (this.mainWindow.isVisible()) {
            this.mainWindow.hide()
          } else {
            this.mainWindow.showInactive()
          }
        })
        console.log(`Registered toggleVisibility: ${keybinds.toggleVisibility}`)
      } catch (error) {
        console.error(`Failed to register toggleVisibility (${keybinds.toggleVisibility}):`, error)
      }
    }

    // Register toggle click-through shortcut
    if (keybinds.toggleClickThrough) {
      try {
        globalShortcut.register(keybinds.toggleClickThrough, () => {
          if (!this.mainWindow) return
          this.mouseEventsIgnored = !this.mouseEventsIgnored
          if (this.mouseEventsIgnored) {
            this.mainWindow.setIgnoreMouseEvents(true, { forward: true })
            console.log('Mouse events ignored')
          } else {
            this.mainWindow.setIgnoreMouseEvents(false)
            console.log('Mouse events enabled')
          }
          this.mainWindow.webContents.send('click-through-toggled', this.mouseEventsIgnored)
        })
        console.log(`Registered toggleClickThrough: ${keybinds.toggleClickThrough}`)
      } catch (error) {
        console.error(
          `Failed to register toggleClickThrough (${keybinds.toggleClickThrough}):`,
          error
        )
      }
    }

    // Register next step shortcut
    if (keybinds.nextStep) {
      try {
        globalShortcut.register(keybinds.nextStep, async () => {
          if (!this.mainWindow) return
          console.log('Next step shortcut triggered')
          try {
            const isMac = process.platform === 'darwin'
            const shortcutKey = isMac ? 'cmd+enter' : 'ctrl+enter'

            this.mainWindow.webContents.executeJavaScript(`
              if (window.electronAPI && window.cheddar && window.cheddar.handleShortcut) {
                window.cheddar.handleShortcut('${shortcutKey}');
              } else {
                console.log('handleShortcut function not available');
              }
            `)
          } catch (error) {
            console.error('Error handling next step shortcut:', error)
          }
        })
        console.log(`Registered nextStep: ${keybinds.nextStep}`)
      } catch (error) {
        console.error(`Failed to register nextStep (${keybinds.nextStep}):`, error)
      }
    }

    // Register response navigation shortcuts
    if (keybinds.previousResponse) {
      try {
        globalShortcut.register(keybinds.previousResponse, () => {
          console.log('Previous response shortcut triggered')
          this.sendToRenderer('navigate-previous-response', undefined)
        })
        console.log(`Registered previousResponse: ${keybinds.previousResponse}`)
      } catch (error) {
        console.error(`Failed to register previousResponse (${keybinds.previousResponse}):`, error)
      }
    }

    if (keybinds.nextResponse) {
      try {
        globalShortcut.register(keybinds.nextResponse, () => {
          console.log('Next response shortcut triggered')
          this.sendToRenderer('navigate-next-response', undefined)
        })
        console.log(`Registered nextResponse: ${keybinds.nextResponse}`)
      } catch (error) {
        console.error(`Failed to register nextResponse (${keybinds.nextResponse}):`, error)
      }
    }

    // Register scroll shortcuts
    if (keybinds.scrollUp) {
      try {
        globalShortcut.register(keybinds.scrollUp, () => {
          console.log('Scroll up shortcut triggered')
          this.sendToRenderer('scroll-response-up', undefined)
        })
        console.log(`Registered scrollUp: ${keybinds.scrollUp}`)
      } catch (error) {
        console.error(`Failed to register scrollUp (${keybinds.scrollUp}):`, error)
      }
    }

    if (keybinds.scrollDown) {
      try {
        globalShortcut.register(keybinds.scrollDown, () => {
          console.log('Scroll down shortcut triggered')
          this.sendToRenderer('scroll-response-down', undefined)
        })
        console.log(`Registered scrollDown: ${keybinds.scrollDown}`)
      } catch (error) {
        console.error(`Failed to register scrollDown (${keybinds.scrollDown}):`, error)
      }
    }
  }

  public setupIpcHandlers(): void {
    // View change handler
    ipcMain.on('view-changed', (_, view: ViewType) => {
      if (view !== 'assistant' && this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.setIgnoreMouseEvents(false)
      }
    })

    // Window minimize handler
    ipcMain.handle('window-minimize', async () => {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.minimize()
      }
    })

    // Window visibility toggle
    ipcMain.handle(
      'toggle-window-visibility',
      async (): Promise<{ success: boolean; error?: string }> => {
        try {
          if (!this.mainWindow || this.mainWindow.isDestroyed()) {
            return { success: false, error: 'Window has been destroyed' }
          }

          if (this.mainWindow.isVisible()) {
            this.mainWindow.hide()
          } else {
            this.mainWindow.showInactive()
          }
          return { success: true }
        } catch (error) {
          console.error('Error toggling window visibility:', error)
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          }
        }
      }
    )

    // Window resize handler
    ipcMain.handle('update-sizes', async (): Promise<{ success: boolean; error?: string }> => {
      try {
        if (!this.mainWindow || this.mainWindow.isDestroyed()) {
          return { success: false, error: 'Window has been destroyed' }
        }

        // Get current view and layout mode from renderer
        let viewName: ViewType, layoutMode: string
        try {
          viewName = await this.mainWindow.webContents.executeJavaScript(
            'window.cheddar && window.cheddar.getCurrentView ? window.cheddar.getCurrentView() : "main"'
          )
          layoutMode =
            (await this.mainWindow.webContents.executeJavaScript(
              'window.cheddar && window.cheddar.getLayoutMode ? window.cheddar.getLayoutMode() : "normal"'
            )) || 'normal'
        } catch (error) {
          console.warn('Failed to get view/layout from renderer, using defaults:', error)
          viewName = 'main'
          layoutMode = 'normal'
        }

        console.log('Size update requested for view:', viewName, 'layout:', layoutMode)

        const { targetWidth, targetHeight } = this.calculateWindowSize(viewName, layoutMode)
        await this.animateWindowResize(
          targetWidth,
          targetHeight,
          `${viewName} view (${layoutMode})`
        )

        return { success: true }
      } catch (error) {
        console.error('Error updating sizes:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    })
  }

  private calculateWindowSize(
    viewName: ViewType,
    layoutMode: string
  ): { targetWidth: number; targetHeight: number } {
    // Determine base size from layout mode
    const baseWidth = layoutMode === 'compact' ? 700 : 900
    const baseHeight = layoutMode === 'compact' ? 300 : 400

    let targetWidth: number, targetHeight: number

    // Adjust height based on view
    switch (viewName) {
      case 'customize':
        targetWidth = baseWidth
        targetHeight = layoutMode === 'compact' ? 500 : 600
        break
      case 'help':
        targetWidth = baseWidth
        targetHeight = layoutMode === 'compact' ? 450 : 550
        break
      case 'history':
        targetWidth = baseWidth
        targetHeight = layoutMode === 'compact' ? 450 : 550
        break
      case 'advanced':
        targetWidth = baseWidth
        targetHeight = layoutMode === 'compact' ? 400 : 500
        break
      case 'main':
      case 'assistant':
      case 'onboarding':
      default:
        targetWidth = baseWidth
        targetHeight = baseHeight
        break
    }

    return { targetWidth, targetHeight }
  }

  private async animateWindowResize(
    targetWidth: number,
    targetHeight: number,
    description: string
  ): Promise<void> {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      console.log('Cannot animate resize: window has been destroyed')
      return
    }

    // Clear any existing animation
    if (this.resizeAnimation) {
      clearTimeout(this.resizeAnimation)
      this.resizeAnimation = null
    }

    const [startWidth, startHeight] = this.mainWindow.getSize()

    // If already at target size, no need to animate
    if (startWidth === targetWidth && startHeight === targetHeight) {
      console.log(`Window already at target size for ${description}`)
      return
    }

    console.log(
      `Starting animated resize from ${startWidth}x${startHeight} to ${targetWidth}x${targetHeight}`
    )

    this.windowResizing = true
    this.mainWindow.setResizable(true)

    const frameRate = 60 // 60 FPS
    const totalFrames = Math.floor(this.RESIZE_ANIMATION_DURATION / (1000 / frameRate))
    let currentFrame = 0

    const widthDiff = targetWidth - startWidth
    const heightDiff = targetHeight - startHeight

    const animate = () => {
      if (!this.mainWindow || this.mainWindow.isDestroyed()) {
        this.windowResizing = false
        return
      }

      currentFrame++
      const progress = currentFrame / totalFrames

      // Use easing function (ease-out)
      const easedProgress = 1 - Math.pow(1 - progress, 3)

      const currentWidth = Math.round(startWidth + widthDiff * easedProgress)
      const currentHeight = Math.round(startHeight + heightDiff * easedProgress)

      this.mainWindow.setSize(currentWidth, currentHeight)

      // Re-center the window during animation
      const primaryDisplay = screen.getPrimaryDisplay()
      const { width: screenWidth } = primaryDisplay.workAreaSize
      const x = Math.floor((screenWidth - currentWidth) / 2)
      const y = 0
      this.mainWindow.setPosition(x, y)

      if (currentFrame >= totalFrames) {
        this.windowResizing = false
        this.mainWindow.setResizable(false)

        // Ensure final size is exact
        this.mainWindow.setSize(targetWidth, targetHeight)
        const finalX = Math.floor((screenWidth - targetWidth) / 2)
        this.mainWindow.setPosition(finalX, 0)

        console.log(`Animation complete: ${targetWidth}x${targetHeight}`)
      } else {
        this.resizeAnimation = setTimeout(animate, 1000 / frameRate)
      }
    }

    animate()
  }

  public sendToRenderer(channel: string, data: any): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data)
    }
  }

  public getMainWindow(): BrowserWindow | null {
    return this.mainWindow
  }

  public cleanup(): void {
    // Unregister all global shortcuts
    globalShortcut.unregisterAll()

    // Clear any pending animations
    if (this.resizeAnimation) {
      clearTimeout(this.resizeAnimation)
      this.resizeAnimation = null
    }

    // Close main window
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.close()
    }

    this.mainWindow = null
    this.windowResizing = false
    this.mouseEventsIgnored = false

    console.log('WindowManager cleanup completed')
  }
}
