import { existsSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { IpcEvents, KeybindConfig, ViewType } from '@shared/types'
import {
  BrowserWindow,
  desktopCapturer,
  globalShortcut,
  ipcMain,
  screen,
  session,
  systemPreferences,
} from 'electron'
export const createWindowManager = () => {
  let mainWindow: BrowserWindow | null = null
  let mouseEventsIgnored = false
  let windowResizing = false
  let resizeAnimation: NodeJS.Timeout | null = null
  const RESIZE_ANIMATION_DURATION = 500 // milliseconds

  const ensureDataDirectories = (): void => {
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

  const getDefaultKeybinds = (): KeybindConfig => {
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
      toggleMicrophone: 'Space',
    }
  }

  const animateWindowResize = async (
    targetWidth: number,
    targetHeight: number,
    description: string
  ): Promise<void> => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      console.log('Cannot animate resize: window has been destroyed')
      return
    }

    // Prevent concurrent resize operations
    if (windowResizing) {
      console.log('Resize already in progress, skipping...')
      return
    }

    // Clear any existing animation
    if (resizeAnimation) {
      clearTimeout(resizeAnimation)
      resizeAnimation = null
    }

    const [startWidth, startHeight] = mainWindow.getSize()

    // If already at target size, no need to animate
    if (startWidth === targetWidth && startHeight === targetHeight) {
      console.log(`Window already at target size for ${description}`)
      return
    }

    console.log(
      `Starting animated resize from ${startWidth}x${startHeight} to ${targetWidth}x${targetHeight}`
    )

    windowResizing = true
    mainWindow.setResizable(true)

    const frameRate = 60 // 60 FPS
    const totalFrames = Math.floor(RESIZE_ANIMATION_DURATION / (1000 / frameRate))
    let currentFrame = 0

    const widthDiff = targetWidth - startWidth
    const heightDiff = targetHeight - startHeight

    const animate = () => {
      if (!mainWindow || mainWindow.isDestroyed()) {
        windowResizing = false
        return
      }

      currentFrame++
      const progress = currentFrame / totalFrames

      // Use easing function (ease-out)
      const easedProgress = 1 - Math.pow(1 - progress, 3)

      const currentWidth = Math.round(startWidth + widthDiff * easedProgress)
      const currentHeight = Math.round(startHeight + heightDiff * easedProgress)

      mainWindow.setSize(currentWidth, currentHeight)

      // Re-center the window during animation
      const primaryDisplay = screen.getPrimaryDisplay()
      const { width: screenWidth } = primaryDisplay.workAreaSize
      const x = Math.floor((screenWidth - currentWidth) / 2)
      const y = 0
      mainWindow.setPosition(x, y)

      if (currentFrame >= totalFrames) {
        windowResizing = false
        mainWindow.setResizable(false)

        // Ensure final size is exact
        mainWindow.setSize(targetWidth, targetHeight)
        const finalX = Math.floor((screenWidth - targetWidth) / 2)
        mainWindow.setPosition(finalX, 0)

        console.log(`Animation complete: ${targetWidth}x${targetHeight}`)
      } else {
        resizeAnimation = setTimeout(animate, 1000 / frameRate)
      }
    }

    animate()
  }

  const calculateWindowSize = (
    viewName: ViewType,
    layoutMode: string
  ): { targetWidth: number; targetHeight: number } => {
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

  const updateGlobalShortcuts = (keybinds: KeybindConfig): void => {
    if (!mainWindow) return

    console.log('Updating global shortcuts with:', keybinds)

    // Unregister all existing shortcuts
    globalShortcut.unregisterAll()

    const primaryDisplay = screen.getPrimaryDisplay()
    const { width, height } = primaryDisplay.workAreaSize
    const moveIncrement = Math.floor(Math.min(width, height) * 0.1)

    // Register window movement shortcuts
    const movementActions = {
      moveUp: () => {
        if (!mainWindow?.isVisible()) return
        const [currentX, currentY] = mainWindow.getPosition()
        mainWindow.setPosition(currentX, currentY - moveIncrement)
      },
      moveDown: () => {
        if (!mainWindow?.isVisible()) return
        const [currentX, currentY] = mainWindow.getPosition()
        mainWindow.setPosition(currentX, currentY + moveIncrement)
      },
      moveLeft: () => {
        if (!mainWindow?.isVisible()) return
        const [currentX, currentY] = mainWindow.getPosition()
        mainWindow.setPosition(currentX - moveIncrement, currentY)
      },
      moveRight: () => {
        if (!mainWindow?.isVisible()) return
        const [currentX, currentY] = mainWindow.getPosition()
        mainWindow.setPosition(currentX + moveIncrement, currentY)
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
          if (!mainWindow) return
          if (mainWindow.isVisible()) {
            mainWindow.hide()
          } else {
            mainWindow.showInactive()
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
          if (!mainWindow) return
          mouseEventsIgnored = !mouseEventsIgnored
          if (mouseEventsIgnored) {
            mainWindow.setIgnoreMouseEvents(true, { forward: true })
            console.log('Mouse events ignored')
          } else {
            mainWindow.setIgnoreMouseEvents(false)
            console.log('Mouse events enabled')
          }
          mainWindow.webContents.send('click-through-toggled', mouseEventsIgnored)
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
          if (!mainWindow) return
          console.log('Next step shortcut triggered')
          try {
            const isMac = process.platform === 'darwin'
            const shortcutKey = isMac ? 'cmd+enter' : 'ctrl+enter'

            mainWindow.webContents.executeJavaScript(`
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
          sendToRenderer('navigate-previous-response', undefined)
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
          sendToRenderer('navigate-next-response', undefined)
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
          sendToRenderer('scroll-response-up', undefined)
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
          sendToRenderer('scroll-response-down', undefined)
        })
        console.log(`Registered scrollDown: ${keybinds.scrollDown}`)
      } catch (error) {
        console.error(`Failed to register scrollDown (${keybinds.scrollDown}):`, error)
      }
    }
  }

  const initializeWindowSettings = async (): Promise<void> => {
    if (!mainWindow) return

    try {
      const defaultKeybinds = getDefaultKeybinds()
      let keybinds = defaultKeybinds

      const savedSettings = await mainWindow.webContents.executeJavaScript(`
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
        const contentProtection = await mainWindow.webContents.executeJavaScript(
          'localStorage.getItem("contentProtection") !== "false"'
        )
        mainWindow.setContentProtection(contentProtection)
        console.log('Content protection loaded from settings:', contentProtection)
      } catch (error) {
        console.error('Error loading content protection:', error)
        mainWindow.setContentProtection(true)
      }

      updateGlobalShortcuts(keybinds)
    } catch (error) {
      console.error('Error initializing window settings:', error)
      // Default to content protection enabled and default shortcuts
      mainWindow.setContentProtection(true)
      updateGlobalShortcuts(getDefaultKeybinds())
    }
  }

  const setupWindowEventHandlers = (): void => {
    if (!mainWindow) return

    // After window is created, check for settings and setup shortcuts
    mainWindow.webContents.once('dom-ready', () => {
      setTimeout(() => {
        initializeWindowSettings()
      }, 150)
    })
  }

  const sendToRenderer = <K extends keyof IpcEvents>(channel: K, data: IpcEvents[K]): void => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(channel, data)
    }
  }

  const requestMicrophonePermission = async (): Promise<boolean> => {
    if (process.platform === 'darwin') {
      try {
        const micStatus = systemPreferences.getMediaAccessStatus('microphone')
        console.log('Current microphone permission status:', micStatus)

        if (micStatus !== 'granted') {
          console.log('Requesting microphone permission...')
          const result = await systemPreferences.askForMediaAccess('microphone')
          console.log('Microphone permission result:', result)
          return result
        }
        return true
      } catch (error) {
        console.error('Error requesting microphone permission:', error)
        return false
      }
    }
    return true // Non-macOS platforms
  }

  // Public API
  const createMainWindow = async (): Promise<BrowserWindow> => {
    // Get layout preference (default to 'normal')
    const windowWidth = 900
    const windowHeight = 400

    mainWindow = new BrowserWindow({
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
        // Enable media permissions
        experimentalFeatures: true,
      },
      backgroundColor: '#00000000',
    })

    // Setup display media handler
    session.defaultSession.setDisplayMediaRequestHandler((_, callback) => {
      desktopCapturer.getSources({ types: ['screen'] }).then(sources => {
        callback({ video: sources[0], audio: 'loopback' })
      })
    })

    // Setup permission handler for microphone access
    session.defaultSession.setPermissionRequestHandler((_, permission, callback) => {
      console.log('Permission requested:', permission)
      if (permission === 'media') {
        // Allow media access (includes microphone and camera)
        callback(true)
      } else {
        // For other permissions, use default behavior
        callback(false)
      }
    })

    // Request microphone permission proactively
    if (process.platform === 'darwin') {
      try {
        console.log('Proactively requesting microphone permission on app startup...')
        const result = await requestMicrophonePermission()
        console.log('Startup microphone permission result:', result)
      } catch (error) {
        console.error('Error requesting microphone permission on startup:', error)
      }
    }

    mainWindow.setResizable(false)
    mainWindow.setContentProtection(true)
    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

    // Center window at the top of the screen
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width: screenWidth } = primaryDisplay.workAreaSize
    const x = Math.floor((screenWidth - windowWidth) / 2)
    const y = 0
    mainWindow.setPosition(x, y)

    // Platform-specific settings
    if (process.platform === 'win32') {
      mainWindow.setAlwaysOnTop(true, 'screen-saver', 1)
    }

    // For development, use Vite dev server
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL)
      // mainWindow.webContents.openDevTools()
    } else {
      mainWindow.loadFile(join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`))
    }

    // Setup window event handlers
    setupWindowEventHandlers()

    return mainWindow
  }

  const setupIpcHandlers = (): void => {
    // View change handler
    ipcMain.on('view-changed', (_, view: ViewType) => {
      if (view !== 'assistant' && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setIgnoreMouseEvents(false)
      }
    })

    // Window minimize handler
    ipcMain.handle('window-minimize', async () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.minimize()
      }
    })

    // Window visibility toggle
    ipcMain.handle(
      'toggle-window-visibility',
      async (): Promise<{ success: boolean; error?: string }> => {
        try {
          if (!mainWindow || mainWindow.isDestroyed()) {
            return { success: false, error: 'Window has been destroyed' }
          }

          if (mainWindow.isVisible()) {
            mainWindow.hide()
          } else {
            mainWindow.showInactive()
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

    // Microphone permission handlers
    ipcMain.handle(
      'check-microphone-permission',
      async (): Promise<{ granted: boolean; status: string }> => {
        if (process.platform === 'darwin') {
          try {
            const status = systemPreferences.getMediaAccessStatus('microphone')
            return { granted: status === 'granted', status }
          } catch (error) {
            console.error('Error checking microphone permission:', error)
            return { granted: false, status: 'error' }
          }
        }
        return { granted: true, status: 'not-applicable' }
      }
    )

    ipcMain.handle('request-microphone-permission', async (): Promise<boolean> => {
      if (process.platform === 'darwin') {
        try {
          const result = await systemPreferences.askForMediaAccess('microphone')
          console.log('Microphone permission requested, result:', result)
          return result
        } catch (error) {
          console.error('Error requesting microphone permission:', error)
          return false
        }
      }
      return true
    })

    // Window resize handler
    ipcMain.handle('update-sizes', async (): Promise<{ success: boolean; error?: string }> => {
      try {
        if (!mainWindow || mainWindow.isDestroyed()) {
          return { success: false, error: 'Window has been destroyed' }
        }

        // Get current view and layout mode from renderer
        let viewName: ViewType, layoutMode: string
        try {
          viewName = await mainWindow.webContents.executeJavaScript(
            'window.cheddar && window.cheddar.getCurrentView ? window.cheddar.getCurrentView() : "main"'
          )
          layoutMode =
            (await mainWindow.webContents.executeJavaScript(
              'window.cheddar && window.cheddar.getLayoutMode ? window.cheddar.getLayoutMode() : "normal"'
            )) || 'normal'
        } catch (error) {
          console.warn('Failed to get view/layout from renderer, using defaults:', error)
          viewName = 'main'
          layoutMode = 'normal'
        }

        console.log('Size update requested for view:', viewName, 'layout:', layoutMode)

        const { targetWidth, targetHeight } = calculateWindowSize(viewName, layoutMode)
        await animateWindowResize(targetWidth, targetHeight, `${viewName} view (${layoutMode})`)

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

  const getMainWindow = (): BrowserWindow | null => mainWindow

  const cleanup = (): void => {
    // Unregister all global shortcuts
    globalShortcut.unregisterAll()

    // Clear any pending animations
    if (resizeAnimation) {
      clearTimeout(resizeAnimation)
      resizeAnimation = null
    }

    // Close main window
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.close()
    }

    mainWindow = null
    windowResizing = false
    mouseEventsIgnored = false

    console.log('WindowManager cleanup completed')
  }

  // Constructor logic
  ensureDataDirectories()

  return {
    createMainWindow,
    updateGlobalShortcuts,
    setupIpcHandlers,
    sendToRenderer,
    getMainWindow,
    cleanup,
  }
}
