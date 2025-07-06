import { Command, CornerDownLeft } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useEventListener, useIpc, useWindowResize } from '../../hooks'
import { useAppStore } from '../../stores/appStore'

interface MainViewProps {
  onStart: () => void
  onAPIKeyHelp: () => void
}

export default function MainView({ onStart, onAPIKeyHelp }: MainViewProps) {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('apiKey') || '')
  const [isInitializing, setIsInitializing] = useState(false)
  const [showApiKeyError, setShowApiKeyError] = useState(false)

  const { setLayoutMode } = useAppStore()
  const electronAPI = useIpc()
  const { resizeForCurrentView } = useWindowResize()

  // Load layout mode and resize window on mount
  useEffect(() => {
    const savedLayoutMode = localStorage.getItem('layoutMode')
    if (savedLayoutMode && savedLayoutMode !== 'normal') {
      setLayoutMode(savedLayoutMode as 'normal' | 'compact')
    }
    resizeForCurrentView()
  }, [setLayoutMode, resizeForCurrentView])

  // Listen for session initialization status
  useEffect(() => {
    const unsubscribe = electronAPI.on.sessionInitializing(setIsInitializing)
    return unsubscribe
  }, [electronAPI.on])

  // Handle keyboard shortcuts
  const handleKeydown = useCallback(
    (e: KeyboardEvent) => {
      const isMac = electronAPI.platform.isMacOS
      const isStartShortcut = isMac
        ? e.metaKey && e.key === 'Enter'
        : e.ctrlKey && e.key === 'Enter'

      if (isStartShortcut) {
        e.preventDefault()
        handleStartClick()
      }
    },
    [electronAPI.platform.isMacOS]
  )

  useEventListener('keydown', handleKeydown)

  const handleApiKeyInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setApiKey(value)
    localStorage.setItem('apiKey', value)

    // Clear error state when user starts typing
    if (showApiKeyError) {
      setShowApiKeyError(false)
    }
  }

  const handleStartClick = () => {
    if (isInitializing) return

    // Check if API key is empty
    const trimmedApiKey = apiKey.trim()
    if (!trimmedApiKey) {
      triggerApiKeyError()
      return
    }

    onStart()
  }

  const handleAPIKeyHelpClick = () => {
    onAPIKeyHelp()
  }

  // Method to trigger the red blink animation
  const triggerApiKeyError = () => {
    setShowApiKeyError(true)
    setTimeout(() => {
      setShowApiKeyError(false)
    }, 1000)
  }

  const getStartButtonContent = () => {
    const isMac = electronAPI.platform.isMacOS

    if (isMac) {
      return (
        <>
          Start Session
          <span className="flex items-center gap-0.5 ml-1 cursor-pointer">
            <Command size={14} />
            <CornerDownLeft size={14} />
          </span>
        </>
      )
    } else {
      return (
        <>
          Start Session
          <span className="flex items-center gap-0.5 ml-1 cursor-pointer">
            Ctrl
            <CornerDownLeft size={14} />
          </span>
        </>
      )
    }
  }

  const apiKeyInputClasses = `flex-1 rounded-lg border p-2.5 text-sm transition-all duration-200 ease-in-out placeholder:text-[--placeholder-color] focus:outline-none focus:border-[--focus-border-color] focus:ring-2 focus:ring-[--focus-box-shadow] focus:bg-[--input-focus-background] bg-[--input-background] text-[--text-color] border-[--button-border]`

  return (
    <div className="flex h-full w-full max-w-lg flex-col p-5 font-sans select-none mx-auto">
      <div className="mt-auto mb-2 text-2xl font-semibold text-[--text-color]">Welcome</div>

      <div className="mb-5 flex items-stretch gap-3">
        <input
          type="password"
          placeholder="Enter your Gemini API Key"
          value={apiKey}
          onChange={handleApiKeyInput}
          className={`${apiKeyInputClasses} ${showApiKeyError ? 'animate-[blink-red_1s_ease-in-out]' : ''}`}
        />
        <button
          onClick={handleStartClick}
          className="flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-4 py-2 text-[13px] font-medium transition-all duration-150 ease-in-out hover:bg-[--start-button-hover-background] hover:border-[--start-button-hover-border] disabled:cursor-not-allowed bg-[--start-button-background] text-[--start-button-color] border-[--start-button-border]"
          disabled={isInitializing}
        >
          {getStartButtonContent()}
        </button>
      </div>

      <p className="mb-6 text-sm leading-normal text-[--description-color]">
        don't have an api key?{' '}
        <span
          onClick={handleAPIKeyHelpClick}
          className="cursor-pointer text-[--link-color] underline transition-colors duration-150 ease-in-out hover:opacity-80"
        >
          get one here
        </span>
      </p>
    </div>
  )
}
