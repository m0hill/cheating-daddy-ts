import type { ViewType } from '@shared/types'
import { Beaker, HelpCircle, History, Settings, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useIpc } from '../hooks'
import { useAppStore } from '../stores/appStore'

interface AppHeaderProps {
  onCustomizeClick: () => void
  onHelpClick: () => void
  onHistoryClick: () => void
  onAdvancedClick: () => void
  onCloseClick: () => void
  onBackClick: () => void
  onHideToggleClick: () => void
}

const AppHeader = ({
  onCustomizeClick,
  onHelpClick,
  onHistoryClick,
  onAdvancedClick,
  onCloseClick,
  onBackClick,
  onHideToggleClick,
}: AppHeaderProps) => {
  const { currentView, statusText, startTime, advancedMode, isClickThrough } = useAppStore()
  const electronAPI = useIpc()
  const [elapsedTime, setElapsedTime] = useState('')

  // Timer for elapsed time in assistant view
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (currentView === 'assistant' && startTime) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000)
        setElapsedTime(`${elapsed}s`)
      }, 1000)
    } else {
      setElapsedTime('')
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [currentView, startTime])

  const getViewTitle = (): string => {
    const titles: Record<ViewType, string> = {
      onboarding: 'Welcome to HOPE',
      main: 'H O P E',
      customize: 'Customize',
      help: 'Help & Shortcuts',
      history: 'Conversation History',
      advanced: 'Advanced Tools',
      assistant: 'Hope',
    }
    return titles[currentView] || 'Hope'
  }

  const isNavigationView = (): boolean => {
    const navigationViews: ViewType[] = ['customize', 'help', 'history', 'advanced']
    return navigationViews.includes(currentView)
  }

  const iconButtonClasses =
    'bg-none p-0 border-none rounded-lg opacity-60 hover:bg-[--hover-background] hover:opacity-100 transition-opacity [color:var(--icon-button-color)] [padding:var(--header-icon-padding)] cursor-pointer'
  const iconProps = {
    className: '[width:var(--icon-size)] [height:var(--icon-size)]',
    strokeWidth: 1.7,
  }

  const renderMainViewActions = () => (
    <>
      <button className={iconButtonClasses} onClick={onHistoryClick} title="Conversation History">
        <History {...iconProps} />
      </button>
      {advancedMode && (
        <button className={iconButtonClasses} onClick={onAdvancedClick} title="Advanced Tools">
          <Beaker {...iconProps} />
        </button>
      )}
      <button className={iconButtonClasses} onClick={onCustomizeClick} title="Customize">
        <Settings {...iconProps} />
      </button>
      <button className={iconButtonClasses} onClick={onHelpClick} title="Help">
        <HelpCircle {...iconProps} />
      </button>
      <div className="h-4 w-px bg-[rgba(255,255,255,0.2)] mx-1"></div>
      <button className={iconButtonClasses} onClick={onCloseClick} title="Close Application">
        <X {...iconProps} />
      </button>
    </>
  )

  const renderAssistantViewActions = () => (
    <>
      <span className="text-[color:var(--header-actions-color)] [font-size:var(--header-font-size-small)]">
        {elapsedTime}
      </span>
      <span className="text-[color:var(--header-actions-color)] [font-size:var(--header-font-size-small)]">
        {statusText}
      </span>
      <button
        onClick={onHideToggleClick}
        className="flex items-center gap-1 font-medium border rounded-lg cursor-pointer transition-all duration-150 ease-in-out hover:bg-[--hover-background] [background:var(--button-background)] [color:var(--text-color)] [border-color:var(--button-border)] [padding:var(--header-button-padding)] [font-size:var(--header-font-size-small)]"
      >
        Hide
        <span className="px-1.5 py-0.5 rounded text-xs font-mono [background:var(--key-background)] pointer-events-none">
          {electronAPI.platform.isMacOS ? 'Cmd' : 'Ctrl'}
        </span>
        <span className="px-1.5 py-0.5 rounded text-xs font-mono [background:var(--key-background)]">
          \
        </span>
      </button>
      <button onClick={onCloseClick} className={iconButtonClasses} title="Close Session">
        <X {...iconProps} />
      </button>
    </>
  )

  const renderCloseButton = () => (
    <button
      onClick={isNavigationView() ? onBackClick : onCloseClick}
      className={iconButtonClasses}
      title={isNavigationView() ? 'Back' : 'Close'}
    >
      <X {...iconProps} />
    </button>
  )

  const headerClasses = `flex items-center border select-none [padding:var(--header-padding)] [border-color:var(--border-color)] [background:var(--header-background)] [border-radius:var(--border-radius)]`
  const clickThroughClasses = 'pointer-events-none'
  const clickThroughActionsClasses = 'pointer-events-auto'

  return (
    <div
      className={`${headerClasses} ${isClickThrough ? clickThroughClasses : ''}`}
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <div
        className="flex-1 font-semibold text-[color:var(--text-color)] [font-size:var(--header-font-size)]"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        {getViewTitle()}
      </div>
      <div
        className={`flex items-center [gap:var(--header-gap)] ${isClickThrough ? clickThroughActionsClasses : ''}`}
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {currentView === 'assistant' && renderAssistantViewActions()}
        {currentView === 'main' && renderMainViewActions()}
        {currentView !== 'assistant' && currentView !== 'main' && renderCloseButton()}
      </div>
    </div>
  )
}

export default AppHeader
