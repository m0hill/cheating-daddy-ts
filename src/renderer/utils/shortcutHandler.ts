import type { ImageQuality, LayoutMode, ViewType } from '@shared/types'
import { useAppStore } from '../stores/appStore'

interface CheddarApi {
  handleShortcut: (shortcutKey: string) => void
  getCurrentView: () => ViewType
  getLayoutMode: () => LayoutMode
}

declare global {
  interface Window {
    cheddar: CheddarApi
    captureManualScreenshot: (imageQuality?: ImageQuality) => Promise<void>
  }
}

// Global shortcut handler function
export const handleShortcut = (shortcutKey: string): void => {
  console.log('Handling shortcut:', shortcutKey)

  // Get current view from the app store
  const currentView = useAppStore.getState().currentView
  console.log('Current view:', currentView)

  if (shortcutKey === 'ctrl+enter' || shortcutKey === 'cmd+enter') {
    if (currentView === 'main') {
      // Trigger the start session from main view
      console.log('Triggering start session from main view')

      // Try to find and trigger the start button
      const mainView = document.querySelector('.main-view')
      if (mainView) {
        const startButton = mainView.querySelector(
          '.start-button:not(.initializing)'
        ) as HTMLButtonElement
        if (startButton) {
          startButton.click()
        } else {
          console.warn('Start button not available or initializing')
        }
      } else {
        console.warn('Could not find main-view element')
      }
    } else if (currentView === 'assistant') {
      // In assistant view, take manual screenshot
      console.log('Taking manual screenshot from assistant view')

      // Trigger manual screenshot via global function if available
      if (typeof window.captureManualScreenshot === 'function') {
        void window.captureManualScreenshot()
      } else {
        console.warn('captureManualScreenshot function not available on AssistantView.')
      }
    }
  }
}

// Set up global window functions for backward compatibility
export const setupGlobalShortcuts = (): void => {
  // Make shortcut handler available globally
  window.cheddar = {
    handleShortcut,
    getCurrentView: () => useAppStore.getState().currentView,
    getLayoutMode: () => useAppStore.getState().layoutMode,
  }

  console.log('Global shortcut handlers initialized')
}
