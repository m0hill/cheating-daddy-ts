import { useEffect } from 'react';
import { useAppStore } from './stores/appStore';
import { useIpc, useWindowResize } from './hooks';
import AppHeader from './components/AppHeader';
import MainView from './components/views/MainView';
import CustomizeView from './components/views/CustomizeView';
import HelpView from './components/views/HelpView';
import HistoryView from './components/views/HistoryView';
import AdvancedView from './components/views/AdvancedView';
import AssistantView from './components/views/AssistantView';
import OnboardingView from './components/views/OnboardingView';
import type { MainViewProps, OnboardingViewProps } from '@shared/types';
import './styles/App.css';

function App() {
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
    selectedLanguage
  } = useAppStore();

  const electronAPI = useIpc();
  const { resizeForCurrentView } = useWindowResize();

  // Set up IPC event listeners
  useEffect(() => {
    const unsubscribeStatus = electronAPI.on.updateStatus(setStatusText);
    const unsubscribeResponse = electronAPI.on.updateResponse(addResponse);
    const unsubscribeClickThrough = electronAPI.on.clickThroughToggled(setIsClickThrough);

    return () => {
      unsubscribeStatus();
      unsubscribeResponse();
      unsubscribeClickThrough();
    };
  }, [electronAPI.on, setStatusText, addResponse, setIsClickThrough]);

  // Apply layout mode on mount
  useEffect(() => {
    if (layoutMode === 'compact') {
      document.documentElement.classList.add('compact-layout');
    } else {
      document.documentElement.classList.remove('compact-layout');
    }
  }, [layoutMode]);

  // Notify main process of view changes and resize
  useEffect(() => {
    electronAPI.send.viewChanged(currentView);
    resizeForCurrentView();
  }, [currentView, electronAPI.send, resizeForCurrentView]);

  // Check for onboarding completion
  useEffect(() => {
    const onboardingCompleted = localStorage.getItem('onboardingCompleted');
    if (!onboardingCompleted && currentView !== 'onboarding') {
      setCurrentView('onboarding');
    }
  }, [currentView, setCurrentView]);

  // Header event handlers
  const handleCustomizeClick = () => setCurrentView('customize');
  const handleHelpClick = () => setCurrentView('help');
  const handleHistoryClick = () => setCurrentView('history');
  const handleAdvancedClick = () => setCurrentView('advanced');
  const handleBackClick = () => setCurrentView('main');

  const handleClose = async () => {
    if (['customize', 'help', 'history', 'advanced'].includes(currentView)) {
      setCurrentView('main');
    } else if (currentView === 'assistant') {
      try {
        await electronAPI.invoke.closeSession();
        setSessionActive(false);
        setCurrentView('main');
        clearResponses();
        setStartTime(null);
        console.log('Session closed');
      } catch (error) {
        console.error('Error closing session:', error);
      }
    } else {
      try {
        await electronAPI.invoke.quitApplication();
      } catch (error) {
        console.error('Error quitting application:', error);
      }
    }
  };

  const handleHideToggle = async () => {
    try {
      await electronAPI.invoke.toggleWindowVisibility();
    } catch (error) {
      console.error('Error toggling window visibility:', error);
    }
  };

  // Main view event handlers
  const handleStart: MainViewProps['onStart'] = async () => {
    const apiKey = localStorage.getItem('apiKey')?.trim();
    if (!apiKey) {
      // The error state will be triggered within the MainView component
      console.error('API Key is missing.');
      return;
    }

    try {
      const success = await electronAPI.invoke.initializeGemini(
        apiKey,
        localStorage.getItem('customPrompt') || '',
        selectedProfile,
        selectedLanguage
      );
      if (success) {
        clearResponses();
        setStartTime(Date.now());
        setCurrentView('assistant');
        setSessionActive(true);
      } else {
        setStatusText('Failed to initialize AI session');
      }
    } catch (error) {
      console.error('Error starting session:', error);
      setStatusText('Error starting session');
    }
  };

  const handleAPIKeyHelp: MainViewProps['onAPIKeyHelp'] = async () => {
    try {
      await electronAPI.invoke.openExternal('https://cheatingdaddy.com/help/api-key');
    } catch (error) {
      console.error('Error opening external URL:', error);
    }
  };

  // Onboarding event handler
  const handleOnboardingComplete: OnboardingViewProps['onComplete'] = () => {
    localStorage.setItem('onboardingCompleted', 'true');
    setCurrentView('main');
  };

  // Render current view
  const renderCurrentView = () => {
    switch (currentView) {
      case 'onboarding':
        return <OnboardingView onComplete={handleOnboardingComplete} onClose={handleClose} />;
      case 'main':
        return <MainView onStart={handleStart} onAPIKeyHelp={handleAPIKeyHelp} />;
      case 'customize':
        return <CustomizeView />;
      case 'help':
        return <HelpView />;
      case 'history':
        return <HistoryView />;
      case 'advanced':
        return <AdvancedView />;
      case 'assistant':
        return <AssistantView />;
      default:
        return <MainView onStart={handleStart} onAPIKeyHelp={handleAPIKeyHelp} />;
    }
  };

  const getMainContentClass = () => {
    const baseClass = 'main-content';
    if (currentView === 'assistant') return `${baseClass} assistant-view`;
    if (currentView === 'onboarding') return `${baseClass} onboarding-view`;
    return `${baseClass} with-border`;
  };

  return (
    <div className="window-container">
      <div className="container">
        <AppHeader
          onCustomizeClick={handleCustomizeClick}
          onHelpClick={handleHelpClick}
          onHistoryClick={handleHistoryClick}
          onAdvancedClick={handleAdvancedClick}
          onCloseClick={handleClose}
          onBackClick={handleBackClick}
          onHideToggleClick={handleHideToggle}
        />
        <div className={getMainContentClass()}>
          <div className="view-container fade-in">{renderCurrentView()}</div>
        </div>
      </div>
    </div>
  );
}

export default App;