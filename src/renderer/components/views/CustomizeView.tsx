import { useEffect } from 'react';
import { useAppStore } from '../../stores/appStore';
import {
  useWindowResize,
  useKeybinds,
  useGoogleSearch,
  useBackgroundTransparency,
  useFontSize
} from '../../hooks';
import type { ProfileType, ScreenshotInterval, ImageQuality, LayoutMode } from '@shared/types';
import './CustomizeView.css';

export default function CustomizeView() {
  const {
    selectedProfile,
    selectedLanguage,
    selectedScreenshotInterval,
    selectedImageQuality,
    layoutMode,
    advancedMode,
    setSelectedProfile,
    setSelectedLanguage,
    setSelectedScreenshotInterval,
    setSelectedImageQuality,
    setLayoutMode,
    setAdvancedMode,
  } = useAppStore();

  const { resizeForCurrentView } = useWindowResize();
  const { keybinds, updateKeybind, resetKeybinds } = useKeybinds();
  const [googleSearchEnabled, setGoogleSearchEnabled] = useGoogleSearch();
  const [backgroundTransparency, setBackgroundTransparency] = useBackgroundTransparency();
  const [fontSize, setFontSize] = useFontSize();

  // Resize window when component mounts
  useEffect(() => {
    resizeForCurrentView();
  }, [resizeForCurrentView]);

  // Profile options
  const getProfiles = () => [
    {
      value: 'interview' as ProfileType,
      name: 'Job Interview',
      description: 'Get help with answering interview questions',
    },
    {
      value: 'sales' as ProfileType,
      name: 'Sales Call',
      description: 'Assist with sales conversations and objection handling',
    },
    {
      value: 'meeting' as ProfileType,
      name: 'Business Meeting',
      description: 'Support for professional meetings and discussions',
    },
    {
      value: 'presentation' as ProfileType,
      name: 'Presentation',
      description: 'Help with presentations and public speaking',
    },
    {
      value: 'negotiation' as ProfileType,
      name: 'Negotiation',
      description: 'Guidance for business negotiations and deals',
    },
  ];

  // Language options
  const getLanguages = () => [
    { value: 'en-US', name: 'English (US)' },
    { value: 'en-GB', name: 'English (UK)' },
    { value: 'en-AU', name: 'English (Australia)' },
    { value: 'en-IN', name: 'English (India)' },
    { value: 'de-DE', name: 'German (Germany)' },
    { value: 'es-US', name: 'Spanish (United States)' },
    { value: 'es-ES', name: 'Spanish (Spain)' },
    { value: 'fr-FR', name: 'French (France)' },
    { value: 'fr-CA', name: 'French (Canada)' },
    { value: 'hi-IN', name: 'Hindi (India)' },
    { value: 'pt-BR', name: 'Portuguese (Brazil)' },
    { value: 'ar-XA', name: 'Arabic (Generic)' },
    { value: 'id-ID', name: 'Indonesian (Indonesia)' },
    { value: 'it-IT', name: 'Italian (Italy)' },
    { value: 'ja-JP', name: 'Japanese (Japan)' },
    { value: 'tr-TR', name: 'Turkish (Turkey)' },
    { value: 'vi-VN', name: 'Vietnamese (Vietnam)' },
    { value: 'bn-IN', name: 'Bengali (India)' },
    { value: 'gu-IN', name: 'Gujarati (India)' },
    { value: 'kn-IN', name: 'Kannada (India)' },
    { value: 'ml-IN', name: 'Malayalam (India)' },
    { value: 'mr-IN', name: 'Marathi (India)' },
    { value: 'ta-IN', name: 'Tamil (India)' },
    { value: 'te-IN', name: 'Telugu (India)' },
    { value: 'nl-NL', name: 'Dutch (Netherlands)' },
    { value: 'ko-KR', name: 'Korean (South Korea)' },
    { value: 'cmn-CN', name: 'Mandarin Chinese (China)' },
    { value: 'pl-PL', name: 'Polish (Poland)' },
    { value: 'ru-RU', name: 'Russian (Russia)' },
    { value: 'th-TH', name: 'Thai (Thailand)' },
  ];

  // Keybind actions
  const getKeybindActions = () => [
    {
      key: 'moveUp' as const,
      name: 'Move Window Up',
      description: 'Move the application window up',
    },
    {
      key: 'moveDown' as const,
      name: 'Move Window Down',
      description: 'Move the application window down',
    },
    {
      key: 'moveLeft' as const,
      name: 'Move Window Left',
      description: 'Move the application window left',
    },
    {
      key: 'moveRight' as const,
      name: 'Move Window Right',
      description: 'Move the application window right',
    },
    {
      key: 'toggleVisibility' as const,
      name: 'Toggle Window Visibility',
      description: 'Show/hide the application window',
    },
    {
      key: 'toggleClickThrough' as const,
      name: 'Toggle Click-through Mode',
      description: 'Enable/disable click-through functionality',
    },
    {
      key: 'nextStep' as const,
      name: 'Ask Next Step',
      description: 'Take screenshot and ask AI for the next step suggestion',
    },
    {
      key: 'previousResponse' as const,
      name: 'Previous Response',
      description: 'Navigate to the previous AI response',
    },
    {
      key: 'nextResponse' as const,
      name: 'Next Response',
      description: 'Navigate to the next AI response',
    },
    {
      key: 'scrollUp' as const,
      name: 'Scroll Response Up',
      description: 'Scroll the AI response content up',
    },
    {
      key: 'scrollDown' as const,
      name: 'Scroll Response Down',
      description: 'Scroll the AI response content down',
    },
  ];

  // Event handlers
  const handleProfileSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedProfile(e.target.value as ProfileType);
  };

  const handleLanguageSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedLanguage(e.target.value);
  };

  const handleScreenshotIntervalSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedScreenshotInterval(e.target.value as ScreenshotInterval);
  };

  const handleImageQualitySelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedImageQuality(e.target.value as ImageQuality);
  };

  const handleLayoutModeSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLayoutMode(e.target.value as LayoutMode);
  };

  const handleCustomPromptInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    localStorage.setItem('customPrompt', e.target.value);
  };

  const handleKeybindChange = (action: string, value: string) => {
    updateKeybind(action as keyof typeof keybinds, value);
  };

  const handleKeybindInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.preventDefault();

    const modifiers = [];

    // Check modifiers
    if (e.ctrlKey) modifiers.push('Ctrl');
    if (e.metaKey) modifiers.push('Cmd');
    if (e.altKey) modifiers.push('Alt');
    if (e.shiftKey) modifiers.push('Shift');

    // Get the main key
    let mainKey = e.key;

    // Handle special keys
    switch (e.code) {
      case 'ArrowUp':
        mainKey = 'Up';
        break;
      case 'ArrowDown':
        mainKey = 'Down';
        break;
      case 'ArrowLeft':
        mainKey = 'Left';
        break;
      case 'ArrowRight':
        mainKey = 'Right';
        break;
      case 'Enter':
        mainKey = 'Enter';
        break;
      case 'Space':
        mainKey = 'Space';
        break;
      case 'Backslash':
        mainKey = '\\';
        break;
      default:
        if (e.key.length === 1) {
          mainKey = e.key.toUpperCase();
        }
        break;
    }

    // Skip if only modifier keys are pressed
    if (['Control', 'Meta', 'Alt', 'Shift'].includes(e.key)) {
      return;
    }

    // Construct keybind string
    const keybind = [...modifiers, mainKey].join('+');

    // Get the action from the input's data attribute
    const action = (e.target as HTMLInputElement).dataset.action;
    if (action) {
      handleKeybindChange(action, keybind);
      (e.target as HTMLInputElement).value = keybind;
      (e.target as HTMLInputElement).blur();
    }
  };

  const handleKeybindFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.placeholder = 'Press key combination...';
    e.target.select();
  };

  const profiles = getProfiles();
  const languages = getLanguages();
  const currentProfile = profiles.find(p => p.value === selectedProfile);
  const currentLanguage = languages.find(l => l.value === selectedLanguage);

  return (
    <div className="customize-view">
      <div className="settings-container">
        {/* AI Profile & Behavior Section */}
        <div className="settings-section">
          <div className="section-title">
            <span>AI Profile & Behavior</span>
          </div>

          <div className="form-grid">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">
                  Profile Type
                  <span className="current-selection">{currentProfile?.name || 'Unknown'}</span>
                </label>
                <select className="form-control" value={selectedProfile} onChange={handleProfileSelect}>
                  {profiles.map(profile => (
                    <option key={profile.value} value={profile.value}>
                      {profile.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group full-width">
              <label className="form-label">Custom AI Instructions</label>
              <textarea
                className="form-control"
                placeholder={`Add specific instructions for how you want the AI to behave during ${currentProfile?.name || 'this interaction'}...`}
                defaultValue={localStorage.getItem('customPrompt') || ''}
                rows={4}
                onChange={handleCustomPromptInput}
              />
              <div className="form-description">
                Personalize the AI's behavior with specific instructions that will be added to the{' '}
                {currentProfile?.name || 'selected profile'} base prompts
              </div>
            </div>
          </div>
        </div>

        {/* Language & Audio Section */}
        <div className="settings-section">
          <div className="section-title">
            <span>Language & Audio</span>
          </div>

          <div className="form-grid">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">
                  Speech Language
                  <span className="current-selection">{currentLanguage?.name || 'Unknown'}</span>
                </label>
                <select className="form-control" value={selectedLanguage} onChange={handleLanguageSelect}>
                  {languages.map(language => (
                    <option key={language.value} value={language.value}>
                      {language.name}
                    </option>
                  ))}
                </select>
                <div className="form-description">Language for speech recognition and AI responses</div>
              </div>
            </div>
          </div>
        </div>

        {/* Interface Layout Section */}
        <div className="settings-section">
          <div className="section-title">
            <span>Interface Layout</span>
          </div>

          <div className="form-grid">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">
                  Layout Mode
                  <span className="current-selection">{layoutMode === 'compact' ? 'Compact' : 'Normal'}</span>
                </label>
                <select className="form-control" value={layoutMode} onChange={handleLayoutModeSelect}>
                  <option value="normal">Normal</option>
                  <option value="compact">Compact</option>
                </select>
                <div className="form-description">
                  {layoutMode === 'compact'
                    ? 'Smaller window size with reduced padding and font sizes for minimal screen footprint'
                    : 'Standard layout with comfortable spacing and font sizes'}
                </div>
              </div>
            </div>

            <div className="form-group full-width">
              <div className="slider-container">
                <div className="slider-header">
                  <label className="form-label">Background Transparency</label>
                  <span className="slider-value">{Math.round(backgroundTransparency * 100)}%</span>
                </div>
                <input
                  type="range"
                  className="slider-input"
                  min="0"
                  max="1"
                  step="0.01"
                  value={backgroundTransparency}
                  onChange={(e) => setBackgroundTransparency(parseFloat(e.target.value))}
                />
                <div className="slider-labels">
                  <span>Transparent</span>
                  <span>Opaque</span>
                </div>
                <div className="form-description">
                  Adjust the transparency of the interface background elements
                </div>
              </div>
            </div>

            <div className="form-group full-width">
              <div className="slider-container">
                <div className="slider-header">
                  <label className="form-label">Response Font Size</label>
                  <span className="slider-value">{fontSize}px</span>
                </div>
                <input
                  type="range"
                  className="slider-input"
                  min="12"
                  max="32"
                  step="1"
                  value={fontSize}
                  onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
                />
                <div className="slider-labels">
                  <span>12px</span>
                  <span>32px</span>
                </div>
                <div className="form-description">
                  Adjust the font size of AI response text in the assistant view
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Screen Capture Section */}
        <div className="settings-section">
          <div className="section-title">
            <span>Screen Capture Settings</span>
          </div>

          <div className="form-grid">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">
                  Capture Interval
                  <span className="current-selection">
                    {selectedScreenshotInterval === 'manual' ? 'Manual' : selectedScreenshotInterval + 's'}
                  </span>
                </label>
                <select className="form-control" value={selectedScreenshotInterval} onChange={handleScreenshotIntervalSelect}>
                  <option value="manual">Manual (On demand)</option>
                  <option value="1">Every 1 second</option>
                  <option value="2">Every 2 seconds</option>
                  <option value="5">Every 5 seconds</option>
                  <option value="10">Every 10 seconds</option>
                </select>
                <div className="form-description">
                  {selectedScreenshotInterval === 'manual'
                    ? 'Screenshots will only be taken when you use the "Ask Next Step" shortcut'
                    : 'Automatic screenshots will be taken at the specified interval'}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Image Quality
                  <span className="current-selection">
                    {selectedImageQuality.charAt(0).toUpperCase() + selectedImageQuality.slice(1)}
                  </span>
                </label>
                <select className="form-control" value={selectedImageQuality} onChange={handleImageQualitySelect}>
                  <option value="high">High Quality</option>
                  <option value="medium">Medium Quality</option>
                  <option value="low">Low Quality</option>
                </select>
                <div className="form-description">
                  {selectedImageQuality === 'high'
                    ? 'Best quality, uses more tokens'
                    : selectedImageQuality === 'medium'
                      ? 'Balanced quality and token usage'
                      : 'Lower quality, uses fewer tokens'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Keyboard Shortcuts Section */}
        <div className="settings-section">
          <div className="section-title">
            <span>Keyboard Shortcuts</span>
          </div>

          <table className="keybinds-table">
            <thead>
              <tr>
                <th>Action</th>
                <th>Shortcut</th>
              </tr>
            </thead>
            <tbody>
              {getKeybindActions().map(action => (
                <tr key={action.key}>
                  <td>
                    <div className="action-name">{action.name}</div>
                    <div className="action-description">{action.description}</div>
                  </td>
                  <td>
                    <input
                      type="text"
                      className="form-control keybind-input"
                      value={keybinds[action.key]}
                      placeholder="Press keys..."
                      data-action={action.key}
                      onKeyDown={handleKeybindInput}
                      onFocus={handleKeybindFocus}
                      readOnly
                    />
                  </td>
                </tr>
              ))}
              <tr className="table-reset-row">
                <td colSpan={2}>
                  <button className="reset-keybinds-button" onClick={resetKeybinds}>
                    Reset to Defaults
                  </button>
                  <div className="form-description" style={{ marginTop: '8px' }}>
                    Restore all keyboard shortcuts to their default values
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Google Search Section */}
        <div className="settings-section">
          <div className="section-title">
            <span>Google Search</span>
          </div>

          <div className="form-grid">
            <div className="checkbox-group">
              <input
                type="checkbox"
                className="checkbox-input"
                id="google-search-enabled"
                checked={googleSearchEnabled}
                onChange={(e) => setGoogleSearchEnabled(e.target.checked)}
              />
              <label htmlFor="google-search-enabled" className="checkbox-label">
                Enable Google Search
              </label>
            </div>
            <div className="form-description" style={{ marginLeft: '24px', marginTop: '-8px' }}>
              Allow the AI to search Google for up-to-date information and facts during conversations
              <br />
              <strong>Note:</strong> Changes take effect when starting a new AI session
            </div>
          </div>
        </div>

        {/* Advanced Mode Section */}
        <div className="settings-section danger-section">
          <div className="section-title danger">
            <span>⚠️ Advanced Mode</span>
          </div>

          <div className="form-grid">
            <div className="checkbox-group">
              <input
                type="checkbox"
                className="checkbox-input"
                id="advanced-mode"
                checked={advancedMode}
                onChange={(e) => setAdvancedMode(e.target.checked)}
              />
              <label htmlFor="advanced-mode" className="checkbox-label">
                Enable Advanced Mode
              </label>
            </div>
            <div className="form-description" style={{ marginLeft: '24px', marginTop: '-8px' }}>
              Unlock experimental features, developer tools, and advanced configuration options
              <br />
              <strong>Note:</strong> Advanced mode adds a new icon to the main navigation bar
            </div>
          </div>
        </div>

        <div className="settings-note">
          💡 Settings are automatically saved as you change them. Changes will take effect immediately or on the next session start.
        </div>
      </div>
    </div>
  );
}