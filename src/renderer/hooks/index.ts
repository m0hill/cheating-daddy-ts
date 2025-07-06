import type { KeybindConfig } from '@shared/types'
import { useCallback, useEffect, useRef, useState } from 'react'

export { useConversationStorage } from './useConversationStorage'
export { useMediaCapture } from './useMediaCapture'

// ============================================================================
// Local Storage Hook
// ============================================================================

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error)
      return initialValue
    }
  })

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value
        setStoredValue(valueToStore)
        window.localStorage.setItem(key, JSON.stringify(valueToStore))
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error)
      }
    },
    [key, storedValue]
  )

  return [storedValue, setValue]
}

// ============================================================================
// IPC Hook for Electron Communication
// ============================================================================

export function useIpc() {
  const electronAPI = window.electronAPI

  if (!electronAPI) {
    throw new Error('Electron API not available. Make sure preload script is loaded.')
  }

  return electronAPI
}

// ============================================================================
// Event Listener Hook
// ============================================================================

export function useEventListener<T extends keyof WindowEventMap>(
  eventName: T,
  handler: (event: WindowEventMap[T]) => void,
  element: EventTarget = window
) {
  const savedHandler = useRef(handler)

  useEffect(() => {
    savedHandler.current = handler
  }, [handler])

  useEffect(() => {
    const eventListener = (event: Event) => savedHandler.current(event as WindowEventMap[T])
    element.addEventListener(eventName, eventListener)
    return () => element.removeEventListener(eventName, eventListener)
  }, [eventName, element])
}

// ============================================================================
// Keyboard Shortcut Hook
// ============================================================================

export function useKeyboard(keybind: string, callback: () => void, enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      const keys = keybind.split('+').map(k => k.toLowerCase())
      const pressedKeys: string[] = []

      if (event.ctrlKey) pressedKeys.push('ctrl')
      if (event.metaKey) pressedKeys.push('cmd')
      if (event.altKey) pressedKeys.push('alt')
      if (event.shiftKey) pressedKeys.push('shift')

      // Add main key
      const mainKey = event.key.toLowerCase()
      if (!['control', 'meta', 'alt', 'shift'].includes(mainKey)) {
        pressedKeys.push(mainKey === ' ' ? 'space' : mainKey)
      }

      // Check if pressed keys match the keybind
      if (keys.length === pressedKeys.length && keys.every(key => pressedKeys.includes(key))) {
        event.preventDefault()
        callback()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [keybind, callback, enabled])
}

// ============================================================================
// Keybinds Hook for Managing Multiple Shortcuts
// ============================================================================

// Helper function to get default keybinds
function getDefaultKeybinds(isMacOS: boolean): KeybindConfig {
  return {
    moveUp: isMacOS ? 'Alt+Up' : 'Ctrl+Up',
    moveDown: isMacOS ? 'Alt+Down' : 'Ctrl+Down',
    moveLeft: isMacOS ? 'Alt+Left' : 'Ctrl+Left',
    moveRight: isMacOS ? 'Alt+Right' : 'Ctrl+Right',
    toggleVisibility: isMacOS ? 'Cmd+\\' : 'Ctrl+\\',
    toggleClickThrough: isMacOS ? 'Cmd+M' : 'Ctrl+M',
    nextStep: isMacOS ? 'Cmd+Enter' : 'Ctrl+Enter',
    previousResponse: isMacOS ? 'Cmd+[' : 'Ctrl+[',
    nextResponse: isMacOS ? 'Cmd+]' : 'Ctrl+]',
    scrollUp: isMacOS ? 'Cmd+Shift+Up' : 'Ctrl+Shift+Up',
    scrollDown: isMacOS ? 'Cmd+Shift+Down' : 'Ctrl+Shift+Down',
  }
}

export function useKeybinds() {
  const electronAPI = useIpc()
  const [keybinds, setKeybinds] = useLocalStorage<KeybindConfig>(
    'customKeybinds',
    getDefaultKeybinds(electronAPI.platform.isMacOS)
  )

  const getDefaultKeybindsCallback = useCallback((): KeybindConfig => {
    return getDefaultKeybinds(electronAPI.platform.isMacOS)
  }, [electronAPI.platform.isMacOS])

  const updateKeybind = useCallback(
    (action: keyof KeybindConfig, keybind: string) => {
      const newKeybinds = { ...keybinds, [action]: keybind }
      setKeybinds(newKeybinds)
      electronAPI.send.updateKeybinds(newKeybinds)
    },
    [keybinds, setKeybinds, electronAPI.send]
  )

  const resetKeybinds = useCallback(() => {
    const defaultKeybinds = getDefaultKeybindsCallback()
    setKeybinds(defaultKeybinds)
    electronAPI.send.updateKeybinds(defaultKeybinds)
  }, [getDefaultKeybindsCallback, setKeybinds, electronAPI.send])

  return {
    keybinds,
    updateKeybind,
    resetKeybinds,
    getDefaultKeybinds: getDefaultKeybindsCallback,
  }
}

// ============================================================================
// Font Size Hook
// ============================================================================

export function useFontSize() {
  const [fontSize, setFontSizeState] = useLocalStorage('fontSize', 18)

  const setFontSize = useCallback(
    (size: number) => {
      setFontSizeState(size)
      document.documentElement.style.setProperty('--response-font-size', `${size}px`)
    },
    [setFontSizeState]
  )

  // Apply font size on mount
  useEffect(() => {
    document.documentElement.style.setProperty('--response-font-size', `${fontSize}px`)
  }, [fontSize])

  return [fontSize, setFontSize] as const
}

// ============================================================================
// Background Transparency Hook
// ============================================================================

export function useBackgroundTransparency() {
  const [transparency, setTransparencyState] = useLocalStorage('backgroundTransparency', 0.8)

  const setTransparency = useCallback(
    (value: number) => {
      setTransparencyState(value)

      // Update CSS custom properties
      const root = document.documentElement
      root.style.setProperty('--header-background', `rgba(0, 0, 0, ${value})`)
      root.style.setProperty('--main-content-background', `rgba(0, 0, 0, ${value})`)
      root.style.setProperty('--card-background', `rgba(255, 255, 255, ${value * 0.05})`)
      root.style.setProperty('--input-background', `rgba(0, 0, 0, ${value * 0.375})`)
      root.style.setProperty('--input-focus-background', `rgba(0, 0, 0, ${value * 0.625})`)
      root.style.setProperty('--button-background', `rgba(0, 0, 0, ${value * 0.625})`)
    },
    [setTransparencyState]
  )

  // Apply transparency on mount
  useEffect(() => {
    setTransparency(transparency)
  }, [transparency, setTransparency])

  return [transparency, setTransparency] as const
}

// ============================================================================
// Google Search Setting Hook
// ============================================================================

export function useGoogleSearch() {
  const [enabled, setEnabledState] = useLocalStorage('googleSearchEnabled', true)
  const electronAPI = useIpc()

  const setEnabled = useCallback(
    async (value: boolean) => {
      setEnabledState(value)
      try {
        await electronAPI.invoke.updateGoogleSearchSetting(value)
      } catch (error) {
        console.error('Failed to update Google Search setting:', error)
      }
    },
    [setEnabledState, electronAPI.invoke]
  )

  return [enabled, setEnabled] as const
}

// ============================================================================
// Rate Limiting Hook
// ============================================================================

export function useRateLimit() {
  const [throttleTokens, setThrottleTokens] = useLocalStorage('throttleTokens', true)
  const [maxTokensPerMin, setMaxTokensPerMin] = useLocalStorage('maxTokensPerMin', 1000000)
  const [throttleAtPercent, setThrottleAtPercent] = useLocalStorage('throttleAtPercent', 75)

  const resetToDefaults = useCallback(() => {
    setThrottleTokens(true)
    setMaxTokensPerMin(1000000)
    setThrottleAtPercent(75)
  }, [setThrottleTokens, setMaxTokensPerMin, setThrottleAtPercent])

  return {
    throttleTokens,
    setThrottleTokens,
    maxTokensPerMin,
    setMaxTokensPerMin,
    throttleAtPercent,
    setThrottleAtPercent,
    resetToDefaults,
  }
}

// ============================================================================
// Window Resize Hook
// ============================================================================

export function useWindowResize() {
  const electronAPI = useIpc()

  const resizeForCurrentView = useCallback(async () => {
    try {
      const result = await electronAPI.invoke.updateSizes()
      if (!result.success) {
        console.error('Failed to resize window:', result.error)
      }
    } catch (error) {
      console.error('Error resizing window:', error)
    }
  }, [electronAPI.invoke])

  return { resizeForCurrentView }
}

// ============================================================================
// Debounce Hook
// ============================================================================

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// ============================================================================
// Previous Value Hook
// ============================================================================

export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>()

  useEffect(() => {
    ref.current = value
  }, [value])

  return ref.current
}
