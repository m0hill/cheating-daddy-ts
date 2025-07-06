// Core Application Types

export type ViewType =
  | 'onboarding'
  | 'main'
  | 'customize'
  | 'help'
  | 'history'
  | 'advanced'
  | 'assistant'

export type ProfileType = 'interview' | 'sales' | 'meeting' | 'presentation' | 'negotiation'

export type LayoutMode = 'normal' | 'compact'

export type ImageQuality = 'high' | 'medium' | 'low'

export type ScreenshotInterval = 'manual' | '1' | '2' | '5' | '10'

// Application State
export interface AppState {
  currentView: ViewType
  statusText: string
  startTime: number | null
  isRecording: boolean
  sessionActive: boolean
  selectedProfile: ProfileType
  selectedLanguage: string
  responses: string[]
  currentResponseIndex: number
  selectedScreenshotInterval: ScreenshotInterval
  selectedImageQuality: ImageQuality
  layoutMode: LayoutMode
  advancedMode: boolean
  isClickThrough: boolean
  currentAudioSource: AudioSourceType
  microphoneEnabled: boolean
}

// Keybinding System
export interface KeybindConfig {
  moveUp: string
  moveDown: string
  moveLeft: string
  moveRight: string
  toggleVisibility: string
  toggleClickThrough: string
  nextStep: string
  previousResponse: string
  nextResponse: string
  scrollUp: string
  scrollDown: string
  toggleMicrophone: string
}

// Session and Conversation Management
export interface ConversationTurn {
  timestamp: number
  transcription: string
  ai_response: string
}

export interface ConversationSession {
  sessionId: string
  timestamp: number
  conversationHistory: ConversationTurn[]
  lastUpdated: number
}

export interface SessionData {
  sessionId: string | null
  history: ConversationTurn[]
}

// IPC Communication Types
export interface IpcResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export type AudioSourceType = 'system' | 'microphone'

export interface AudioContent {
  data: string // base64
  mimeType: string
  source?: AudioSourceType
}

export interface ImageContent {
  data: string // base64
  debug?: boolean
}

export interface GeminiInitParams {
  apiKey: string
  customPrompt?: string
  profile?: ProfileType
  language?: string
}

// Event Channel Definitions (Main -> Renderer)
export interface SaveConversationTurnPayload {
  sessionId: string
  turn: ConversationTurn
  fullHistory: ConversationTurn[]
}

export interface IpcEvents {
  'update-response': string
  'update-status': string
  'session-initializing': boolean
  'click-through-toggled': boolean
  'view-changed': ViewType
  'save-conversation-turn': SaveConversationTurnPayload
  'navigate-previous-response': void
  'navigate-next-response': void
  'scroll-response-up': void
  'scroll-response-down': void
}

// Platform Detection
export interface PlatformInfo {
  isMacOS: boolean
  isLinux: boolean
  isWindows: boolean
}

// Component Props Interfaces
export interface BaseViewProps {
  className?: string
}

export interface HeaderProps {
  currentView: ViewType
  statusText: string
  startTime: number | null
  advancedMode: boolean
  isClickThrough: boolean
  onCustomizeClick: () => void
  onHelpClick: () => void
  onHistoryClick: () => void
  onAdvancedClick: () => void
  onCloseClick: () => void
  onBackClick: () => void
  onHideToggleClick: () => void
}

export interface MainViewProps extends BaseViewProps {
  onStart: () => void
  onAPIKeyHelp: () => void
  onLayoutModeChange: (mode: LayoutMode) => void
}

export interface OnboardingViewProps extends BaseViewProps {
  onComplete: () => void
  onClose: () => void
}
