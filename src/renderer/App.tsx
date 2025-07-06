import type { MainViewProps, OnboardingViewProps } from '@shared/types'
import clsx from 'clsx'
import { useEffect } from 'react'
import AppHeader from './components/AppHeader'
import AdvancedView from './components/views/AdvancedView'
import AssistantView from './components/views/AssistantView'
import CustomizeView from './components/views/CustomizeView'
import HelpView from './components/views/HelpView'
import HistoryView from './components/views/HistoryView'
import MainView from './components/views/MainView'
import OnboardingView from './components/views/OnboardingView'
import { useConversationStorage, useIpc, useWindowResize } from './hooks'
import { useAppStore } from './stores/appStore'

const App = () => {
  const {
    currentView,
    setCurrentView,
    setStatusText,
    addResponse,
    setIsClickThrough,
    setSessionActive,
    setStartTime,
    clearResponses,
    layoutMode,
    selectedProfile,
    selectedLanguage,
  } = useAppStore()

  const electronAPI = useIpc()
  const { resizeForCurrentView } = useWindowResize()

  useConversationStorage()

  // Set up IPC event listeners
  useEffect(() => {
    const unsubscribeStatus = electronAPI.on.updateStatus(setStatusText)
    const unsubscribeResponse = electronAPI.on.updateResponse(addResponse)
    const unsubscribeClickThrough = electronAPI.on.clickThroughToggled(setIsClickThrough)

    return () => {
      unsubscribeStatus()
      unsubscribeResponse()
      unsubscribeClickThrough()
    }
  }, [electronAPI.on, setStatusText, addResponse, setIsClickThrough])

  // Apply layout mode on mount
  useEffect(() => {
    if (layoutMode === 'compact') {
      document.documentElement.classList.add('compact-layout')
    } else {
      document.documentElement.classList.remove('compact-layout')
    }
  }, [layoutMode])

  // Notify main process of view changes and resize
  useEffect(() => {
    electronAPI.send.viewChanged(currentView)
    resizeForCurrentView()
  }, [currentView, electronAPI.send, resizeForCurrentView])

  // Check for onboarding completion
  useEffect(() => {
    const onboardingCompleted = localStorage.getItem('onboardingCompleted')
    if (!onboardingCompleted && currentView !== 'onboarding') {
      setCurrentView('onboarding')
    }
  }, [currentView, setCurrentView])

  // Header event handlers
  const handleCustomizeClick = () => setCurrentView('customize')
  const handleHelpClick = () => setCurrentView('help')
  const handleHistoryClick = () => setCurrentView('history')
  const handleAdvancedClick = () => setCurrentView('advanced')
  const handleBackClick = () => setCurrentView('main')

  const handleClose = async () => {
    if (['customize', 'help', 'history', 'advanced'].includes(currentView)) {
      setCurrentView('main')
    } else if (currentView === 'assistant') {
      try {
        await electronAPI.invoke.closeSession()
        setSessionActive(false)
        setCurrentView('main')
        clearResponses()
        setStartTime(null)
        console.log('Session closed')
      } catch (error) {
        console.error('Error closing session:', error)
      }
    } else {
      try {
        await electronAPI.invoke.quitApplication()
      } catch (error) {
        console.error('Error quitting application:', error)
      }
    }
  }

  const handleHideToggle = async () => {
    try {
      await electronAPI.invoke.toggleWindowVisibility()
    } catch (error) {
      console.error('Error toggling window visibility:', error)
    }
  }

  // Main view event handlers
  const handleStart: MainViewProps['onStart'] = async () => {
    const apiKey = localStorage.getItem('apiKey')?.trim()
    if (!apiKey) {
      // The error state will be triggered within the MainView component
      console.error('API Key is missing.')
      return
    }

    try {
      const success = await electronAPI.invoke.initializeGemini(
        apiKey,
        localStorage.getItem('customPrompt') || '',
        selectedProfile,
        selectedLanguage
      )
      if (success) {
        clearResponses()
        setStartTime(Date.now())
        setCurrentView('assistant')
        setSessionActive(true)
      } else {
        setStatusText('Failed to initialize AI session')
      }
    } catch (error) {
      console.error('Error starting session:', error)
      setStatusText('Error starting session')
    }
  }

  const handleAPIKeyHelp: MainViewProps['onAPIKeyHelp'] = async () => {
    try {
      await electronAPI.invoke.openExternal('https://aistudio.google.com/app/apikey')
    } catch (error) {
      console.error('Error opening external URL:', error)
    }
  }

  // Onboarding event handler
  const handleOnboardingComplete: OnboardingViewProps['onComplete'] = () => {
    localStorage.setItem('onboardingCompleted', 'true')
    setCurrentView('main')
  }

  // Render current view
  const renderCurrentView = () => {
    switch (currentView) {
      case 'onboarding':
        return <OnboardingView onComplete={handleOnboardingComplete} onClose={handleClose} />
      case 'main':
        return <MainView onStart={handleStart} onAPIKeyHelp={handleAPIKeyHelp} />
      case 'customize':
        return <CustomizeView />
      case 'help':
        return <HelpView />
      case 'history':
        return <HistoryView />
      case 'advanced':
        return <AdvancedView />
      case 'assistant':
        return <AssistantView />
      default:
        return <MainView onStart={handleStart} onAPIKeyHelp={handleAPIKeyHelp} />
    }
  }

  const mainContentClass = clsx(
    'flex-1 overflow-y-auto [background:var(--main-content-background)] transition-all duration-150 ease-out',
    {
      'p-2.5 [margin-top:var(--main-content-margin-top)] [border-radius:var(--content-border-radius)]':
        currentView !== 'onboarding',
      'border border-[--border-color]': currentView !== 'assistant' && currentView !== 'onboarding',
      'p-0 border-none bg-transparent': currentView === 'onboarding',
    }
  )

  return (
    <div className="h-screen overflow-hidden rounded-lg">
      <div className="flex h-full flex-col">
        <AppHeader
          onCustomizeClick={handleCustomizeClick}
          onHelpClick={handleHelpClick}
          onHistoryClick={handleHistoryClick}
          onAdvancedClick={handleAdvancedClick}
          onCloseClick={handleClose}
          onBackClick={handleBackClick}
          onHideToggleClick={handleHideToggle}
        />
        <div className={mainContentClass}>
          <div className="h-full animate-[fadeIn_0.15s_ease-out]">{renderCurrentView()}</div>
        </div>
      </div>
    </div>
  )
}

export default App
