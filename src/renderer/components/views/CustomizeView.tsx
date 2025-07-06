import type { ImageQuality, LayoutMode, ProfileType, ScreenshotInterval } from '@shared/types'
import clsx from 'clsx'
import { ChevronDown } from 'lucide-react'
import { useEffect } from 'react'
import {
  useBackgroundTransparency,
  useFontSize,
  useGoogleSearch,
  useKeybinds,
  useWindowResize,
} from '../../hooks'
import { useAppStore } from '../../stores/appStore'

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
  } = useAppStore()

  const { resizeForCurrentView } = useWindowResize()
  const { keybinds, updateKeybind, resetKeybinds } = useKeybinds()
  const [googleSearchEnabled, setGoogleSearchEnabled] = useGoogleSearch()
  const [backgroundTransparency, setBackgroundTransparency] = useBackgroundTransparency()
  const [fontSize, setFontSize] = useFontSize()

  // Resize window when component mounts
  useEffect(() => {
    resizeForCurrentView()
  }, [resizeForCurrentView])

  // Profile options
  const getProfiles = () => [
    { value: 'interview' as ProfileType, name: 'Job Interview' },
    { value: 'sales' as ProfileType, name: 'Sales Call' },
    { value: 'meeting' as ProfileType, name: 'Business Meeting' },
    { value: 'presentation' as ProfileType, name: 'Presentation' },
    { value: 'negotiation' as ProfileType, name: 'Negotiation' },
  ]

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
  ]

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
      description: 'Enable/disable click-through',
    },
    {
      key: 'nextStep' as const,
      name: 'Ask Next Step',
      description: 'Take screenshot and ask AI for suggestion',
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
  ]

  // Event handlers
  const handleProfileSelect = (e: React.ChangeEvent<HTMLSelectElement>) =>
    setSelectedProfile(e.target.value as ProfileType)
  const handleLanguageSelect = (e: React.ChangeEvent<HTMLSelectElement>) =>
    setSelectedLanguage(e.target.value)
  const handleScreenshotIntervalSelect = (e: React.ChangeEvent<HTMLSelectElement>) =>
    setSelectedScreenshotInterval(e.target.value as ScreenshotInterval)
  const handleImageQualitySelect = (e: React.ChangeEvent<HTMLSelectElement>) =>
    setSelectedImageQuality(e.target.value as ImageQuality)
  const handleLayoutModeSelect = (e: React.ChangeEvent<HTMLSelectElement>) =>
    setLayoutMode(e.target.value as LayoutMode)
  const handleCustomPromptInput = (e: React.ChangeEvent<HTMLTextAreaElement>) =>
    localStorage.setItem('customPrompt', e.target.value)
  const handleKeybindChange = (action: string, value: string) =>
    updateKeybind(action as keyof typeof keybinds, value)

  const handleKeybindInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const modifiers: string[] = []
    if (e.ctrlKey) modifiers.push('Ctrl')
    if (e.metaKey) modifiers.push('Cmd')
    if (e.altKey) modifiers.push('Alt')
    if (e.shiftKey) modifiers.push('Shift')
    let mainKey = e.key
    const specialKeys: { [key: string]: string } = {
      ArrowUp: 'Up',
      ArrowDown: 'Down',
      ArrowLeft: 'Left',
      ArrowRight: 'Right',
      Enter: 'Enter',
      Space: 'Space',
      Backslash: '\\',
    }
    mainKey = specialKeys[e.code] || (e.key.length === 1 ? e.key.toUpperCase() : mainKey)
    if (['Control', 'Meta', 'Alt', 'Shift'].includes(e.key)) return
    const keybind = [...modifiers, mainKey].join('+')
    const action = (e.target as HTMLInputElement).dataset.action
    if (action) {
      handleKeybindChange(action, keybind)
      ;(e.target as HTMLInputElement).value = keybind
      ;(e.target as HTMLInputElement).blur()
    }
  }
  const handleKeybindFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.placeholder = 'Press key combination...'
    e.target.select()
  }

  const profiles = getProfiles()
  const languages = getLanguages()
  const keybindActions = getKeybindActions()
  const currentProfile = profiles.find(p => p.value === selectedProfile)
  const currentLanguage = languages.find(l => l.value === selectedLanguage)

  // Reusable Tailwind classes
  const formControlBase =
    'min-h-[16px] w-full rounded border border-[--input-border] bg-[--input-background] px-2.5 py-2 text-xs font-normal text-[--text-color] transition-all duration-150 ease-in-out focus:border-[--focus-border-color] focus:bg-[--input-focus-background] focus:shadow-[0_0_0_2px_var(--focus-shadow)] focus:outline-none hover:border-[rgba(255,255,255,0.2)] hover:bg-[rgba(0,0,0,0.35)]'
  const formLabelBase = 'flex items-center gap-1.5 text-xs font-medium text-[--label-color]'
  const formDescriptionBase = 'mt-0.5 text-[11px] leading-tight text-[--description-color]'
  const currentSelectionBadge =
    'inline-flex items-center gap-1 rounded border border-[rgba(52,211,153,0.2)] bg-[rgba(52,211,153,0.1)] px-1.5 py-0.5 text-[10px] font-medium text-[#34d399]'
  const sectionBase = 'rounded-md border p-4 backdrop-blur-sm'
  const sectionTitleBase =
    'mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider'
  const checkboxLabelBase =
    'flex cursor-pointer select-none items-center gap-2 text-xs font-medium text-[--label-color]'
  const checkboxInputBase = 'h-3.5 w-3.5 cursor-pointer accent-[--focus-border-color]'

  const Section = ({
    title,
    isDanger,
    children,
  }: {
    title: string
    isDanger?: boolean
    children: React.ReactNode
  }) => (
    <div
      className={clsx(
        sectionBase,
        isDanger
          ? 'border-[--danger-border] bg-[--danger-background]'
          : 'border-[--card-border] bg-[--card-background]'
      )}
    >
      <div
        className={clsx(
          sectionTitleBase,
          isDanger ? 'text-[--danger-color]' : 'text-[--text-color]'
        )}
      >
        <span
          className={clsx(
            'h-[14px] w-[3px] rounded-full',
            isDanger ? 'bg-[--danger-color]' : 'bg-[--accent-color]'
          )}
        ></span>
        <span>{title}</span>
      </div>
      {children}
    </div>
  )

  const FormGroup = ({
    children,
    className,
  }: {
    children: React.ReactNode
    className?: string
  }) => <div className={clsx('flex flex-col gap-1.5', className)}>{children}</div>

  const FormRow = ({ children }: { children: React.ReactNode }) => (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{children}</div>
  )

  const Select = ({
    value,
    onChange,
    children,
    className,
  }: {
    value: string
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
    children: React.ReactNode
    className?: string
  }) => (
    <div className="relative">
      <select
        className={`${formControlBase} cursor-pointer appearance-none pr-7 ${className}`}
        value={value}
        onChange={onChange}
      >
        {children}
      </select>
      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-white/80"
      />
    </div>
  )

  return (
    <div className="select-none p-3 font-sans">
      <div className="grid gap-3 pb-5">
        <Section title="AI Profile & Behavior">
          <div className="grid gap-3">
            <FormRow>
              <FormGroup>
                <label className={formLabelBase}>
                  Profile Type{' '}
                  <span className={currentSelectionBadge}>✓ {currentProfile?.name}</span>
                </label>
                <Select value={selectedProfile} onChange={handleProfileSelect}>
                  {profiles.map(p => (
                    <option key={p.value} value={p.value}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </FormGroup>
            </FormRow>
            <FormGroup className="col-span-full">
              <label className={formLabelBase}>Custom AI Instructions</label>
              <textarea
                className={`${formControlBase} min-h-[60px] resize-y leading-snug placeholder:text-[rgba(255,255,255,0.4)]`}
                placeholder={`Add specific instructions for how you want the AI to behave...`}
                defaultValue={localStorage.getItem('customPrompt') || ''}
                rows={4}
                onChange={handleCustomPromptInput}
              />
              <div className={formDescriptionBase}>
                Personalize behavior for the {currentProfile?.name || 'selected profile'}.
              </div>
            </FormGroup>
          </div>
        </Section>

        <Section title="Language & Audio">
          <FormRow>
            <FormGroup>
              <label className={formLabelBase}>
                Speech Language{' '}
                <span className={currentSelectionBadge}>✓ {currentLanguage?.name}</span>
              </label>
              <Select value={selectedLanguage} onChange={handleLanguageSelect}>
                {languages.map(l => (
                  <option key={l.value} value={l.value}>
                    {l.name}
                  </option>
                ))}
              </Select>
              <div className={formDescriptionBase}>
                Language for speech recognition and AI responses.
              </div>
            </FormGroup>
          </FormRow>
        </Section>

        <Section title="Interface Layout">
          <div className="grid gap-3">
            <FormRow>
              <FormGroup>
                <label className={formLabelBase}>
                  Layout Mode{' '}
                  <span className={currentSelectionBadge}>
                    {layoutMode.charAt(0).toUpperCase() + layoutMode.slice(1)}
                  </span>
                </label>
                <Select value={layoutMode} onChange={handleLayoutModeSelect}>
                  <option value="normal">Normal</option>
                  <option value="compact">Compact</option>
                </Select>
                <div className={formDescriptionBase}>
                  {layoutMode === 'compact'
                    ? 'Minimal UI for smaller footprint.'
                    : 'Standard UI with comfortable spacing.'}
                </div>
              </FormGroup>
            </FormRow>
            <FormGroup className="col-span-full">
              <div className="flex items-center justify-between">
                <label className={formLabelBase}>Background Transparency</label>
                <span className={`${currentSelectionBadge} font-mono`}>
                  {Math.round(backgroundTransparency * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={backgroundTransparency}
                onChange={e => setBackgroundTransparency(parseFloat(e.target.value))}
                className="slider-input h-1 w-full cursor-pointer appearance-none rounded-sm border border-[--input-border] bg-[--input-background] outline-none"
              />
              <div className="flex justify-between text-[10px] text-[--description-color]">
                <small>Transparent</small>
                <small>Opaque</small>
              </div>
            </FormGroup>
            <FormGroup className="col-span-full">
              <div className="flex items-center justify-between">
                <label className={formLabelBase}>Response Font Size</label>
                <span className={`${currentSelectionBadge} font-mono`}>{fontSize}px</span>
              </div>
              <input
                type="range"
                min="12"
                max="32"
                step="1"
                value={fontSize}
                onChange={e => setFontSize(parseInt(e.target.value, 10))}
                className="slider-input h-1 w-full cursor-pointer appearance-none rounded-sm border border-[--input-border] bg-[--input-background] outline-none"
              />
              <div className="flex justify-between text-[10px] text-[--description-color]">
                <small>12px</small>
                <small>32px</small>
              </div>
            </FormGroup>
          </div>
        </Section>

        <Section title="Screen Capture Settings">
          <FormRow>
            <FormGroup>
              <label className={formLabelBase}>
                Capture Interval{' '}
                <span className={currentSelectionBadge}>
                  {selectedScreenshotInterval === 'manual'
                    ? 'Manual'
                    : `${selectedScreenshotInterval}s`}
                </span>
              </label>
              <Select value={selectedScreenshotInterval} onChange={handleScreenshotIntervalSelect}>
                <option value="manual">Manual (On demand)</option>
                <option value="1">Every 1 second</option>
                <option value="2">Every 2 seconds</option>
                <option value="5">Every 5 seconds</option>
                <option value="10">Every 10 seconds</option>
              </Select>
            </FormGroup>
            <FormGroup>
              <label className={formLabelBase}>
                Image Quality{' '}
                <span className={currentSelectionBadge}>
                  {selectedImageQuality.charAt(0).toUpperCase() + selectedImageQuality.slice(1)}
                </span>
              </label>
              <Select value={selectedImageQuality} onChange={handleImageQualitySelect}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </Select>
            </FormGroup>
          </FormRow>
        </Section>

        <Section title="Keyboard Shortcuts">
          <div className="w-full overflow-hidden rounded">
            <table className="w-full border-collapse">
              <thead className="bg-[rgba(255,255,255,0.04)]">
                <tr>
                  <th className="border-b border-[--table-border] p-2 text-left text-[11px] font-semibold uppercase tracking-wider text-[--label-color]">
                    Action
                  </th>
                  <th className="border-b border-[--table-border] p-2 text-left text-[11px] font-semibold uppercase tracking-wider text-[--label-color]">
                    Shortcut
                  </th>
                </tr>
              </thead>
              <tbody>
                {keybindActions.map(action => (
                  <tr key={action.key} className="hover:bg-[rgba(255,255,255,0.02)]">
                    <td className="border-b border-[--table-border] p-2 align-middle">
                      <div className="text-xs font-medium text-[--text-color]">{action.name}</div>
                      <div className="mt-px text-[10px] text-[--description-color]">
                        {action.description}
                      </div>
                    </td>
                    <td className="border-b border-[--table-border] p-2 align-middle">
                      <input
                        type="text"
                        className={`${formControlBase} m-0 min-w-28 p-1 text-center text-xs`}
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
                <tr className="border-t border-[--table-border]">
                  <td colSpan={2} className="pt-3 pb-2">
                    <button
                      className="rounded px-2 py-1 text-xs text-[--label-color] outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-blue-500"
                      onClick={resetKeybinds}
                    >
                      Reset to Defaults
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Google Search">
          <div className="rounded border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-2">
            <label htmlFor="google-search-enabled" className={checkboxLabelBase}>
              <input
                type="checkbox"
                id="google-search-enabled"
                checked={googleSearchEnabled}
                onChange={e => setGoogleSearchEnabled(e.target.checked)}
                className={checkboxInputBase}
              />
              Enable Google Search
            </label>
          </div>
          <div className={`${formDescriptionBase} pl-7`}>
            Allow the AI to search Google for up-to-date information.
          </div>
        </Section>

        <Section title="⚠️ Advanced Mode" isDanger>
          <div className="rounded border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-2">
            <label htmlFor="advanced-mode" className={checkboxLabelBase}>
              <input
                type="checkbox"
                id="advanced-mode"
                checked={advancedMode}
                onChange={e => setAdvancedMode(e.target.checked)}
                className={checkboxInputBase}
              />
              Enable Advanced Mode
            </label>
          </div>
          <div className={`${formDescriptionBase} pl-7`}>
            Unlocks experimental features and developer tools.
          </div>
        </Section>

        <div className="mt-2 text-center text-[10px] italic text-[--note-color]">
          💡 Settings are automatically saved as you change them.
        </div>
      </div>
    </div>
  )
}
