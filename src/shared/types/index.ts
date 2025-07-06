// ============================================================================
// Core Application Types
// ============================================================================

export type ViewType =
  | 'onboarding'
  | 'main'
  | 'customize'
  | 'help'
  | 'history'
  | 'advanced'
  | 'assistant';

export type ProfileType =
  | 'interview'
  | 'sales'
  | 'meeting'
  | 'presentation'
  | 'negotiation';

export type LayoutMode = 'normal' | 'compact';

export type ImageQuality = 'high' | 'medium' | 'low';

export type ScreenshotInterval = 'manual' | '1' | '2' | '5' | '10';

// ============================================================================
// Application State
// ============================================================================

export interface AppState {
  currentView: ViewType;
  statusText: string;
  startTime: number | null;
  isRecording: boolean;
  sessionActive: boolean;
  selectedProfile: ProfileType;
  selectedLanguage: string;
  responses: string[];
  currentResponseIndex: number;
  selectedScreenshotInterval: ScreenshotInterval;
  selectedImageQuality: ImageQuality;
  layoutMode: LayoutMode;
  advancedMode: boolean;
  isClickThrough: boolean;
}

// ============================================================================
// Keybinding System
// ============================================================================

export interface KeybindConfig {
  moveUp: string;
  moveDown: string;
  moveLeft: string;
  moveRight: string;
  toggleVisibility: string;
  toggleClickThrough: string;
  nextStep: string;
  previousResponse: string;
  nextResponse: string;
  scrollUp: string;
  scrollDown: string;
}

// ============================================================================
// Session and Conversation Management
// ============================================================================

export interface ConversationTurn {
  timestamp: number;
  transcription: string;
  ai_response: string;
}

export interface ConversationSession {
  sessionId: string;
  timestamp: number;
  conversationHistory: ConversationTurn[];
  lastUpdated: number;
}

export interface SessionData {
  sessionId: string | null;
  history: ConversationTurn[];
}

// ============================================================================
// Audio and Video Configuration
// ============================================================================

export interface AudioConfig {
  sampleRate: number;
  channelCount: number;
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
}

export interface MediaCaptureConfig {
  video: {
    frameRate: number;
    width: { ideal: number };
    height: { ideal: number };
  };
  audio: AudioConfig | false;
}

// ============================================================================
// Token Tracking for Rate Limiting
// ============================================================================

export interface TokenEntry {
  timestamp: number;
  count: number;
  type: 'image' | 'audio';
}

export interface TokenTracker {
  tokens: TokenEntry[];
  audioStartTime: number | null;
}

export interface RateLimitSettings {
  throttleTokens: boolean;
  maxTokensPerMin: number;
  throttleAtPercent: number;
}

// ============================================================================
// IPC Communication Types
// ============================================================================

export interface IpcResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface AudioContent {
  data: string; // base64
  mimeType: string;
}

export interface ImageContent {
  data: string; // base64
  debug?: boolean;
}

export interface GeminiInitParams {
  apiKey: string;
  customPrompt?: string;
  profile?: ProfileType;
  language?: string;
}

// ============================================================================
// IPC Channel Definitions
// ============================================================================

export interface IpcChannels {
  // Gemini AI Service
  'initialize-gemini': (params: GeminiInitParams) => Promise<boolean>;
  'send-audio-content': (content: AudioContent) => Promise<IpcResult>;
  'send-image-content': (content: ImageContent) => Promise<IpcResult>;
  'send-text-message': (text: string) => Promise<IpcResult>;
  'close-session': () => Promise<IpcResult>;

  // Audio Capture (macOS specific)
  'start-macos-audio': () => Promise<IpcResult>;
  'stop-macos-audio': () => Promise<IpcResult>;

  // Session Management
  'get-current-session': () => Promise<IpcResult<SessionData>>;
  'start-new-session': () => Promise<IpcResult<{ sessionId: string }>>;

  // Window Management
  'toggle-window-visibility': () => Promise<IpcResult>;
  'update-sizes': () => Promise<IpcResult>;
  'window-minimize': () => Promise<void>;

  // Application Control
  'quit-application': () => Promise<IpcResult>;
  'open-external': (url: string) => Promise<IpcResult>;

  // Settings
  'update-google-search-setting': (enabled: boolean) => Promise<IpcResult>;
  'update-content-protection': () => Promise<IpcResult>;
}

// ============================================================================
// Event Channel Definitions (Main -> Renderer)
// ============================================================================

export interface IpcEvents {
  'update-response': string;
  'update-status': string;
  'session-initializing': boolean;
  'click-through-toggled': boolean;
  'view-changed': ViewType;
  'save-conversation-turn': {
    sessionId: string;
    turn: ConversationTurn;
    fullHistory: ConversationTurn[];
  };
  'navigate-previous-response': void;
  'navigate-next-response': void;
  'scroll-response-up': void;
  'scroll-response-down': void;
}

// ============================================================================
// Platform Detection
// ============================================================================

export interface PlatformInfo {
  isMacOS: boolean;
  isLinux: boolean;
  isWindows: boolean;
}

// ============================================================================
// Language Options
// ============================================================================

export interface LanguageOption {
  value: string;
  name: string;
}

export interface ProfileOption {
  value: ProfileType;
  name: string;
  description: string;
}

// ============================================================================
// Component Props Interfaces
// ============================================================================

export interface BaseViewProps {
  className?: string;
}

export interface HeaderProps {
  currentView: ViewType;
  statusText: string;
  startTime: number | null;
  advancedMode: boolean;
  isClickThrough: boolean;
  onCustomizeClick: () => void;
  onHelpClick: () => void;
  onHistoryClick: () => void;
  onAdvancedClick: () => void;
  onCloseClick: () => void;
  onBackClick: () => void;
  onHideToggleClick: () => void;
}

export interface MainViewProps extends BaseViewProps {
  onStart: () => void;
  onAPIKeyHelp: () => void;
  onLayoutModeChange: (mode: LayoutMode) => void;
}

export interface AssistantViewProps extends BaseViewProps {
  responses: string[];
  currentResponseIndex: number;
  selectedProfile: ProfileType;
  onSendText: (message: string) => void;
  onResponseIndexChanged: (index: number) => void;
}

export interface CustomizeViewProps extends BaseViewProps {
  selectedProfile: ProfileType;
  selectedLanguage: string;
  selectedScreenshotInterval: ScreenshotInterval;
  selectedImageQuality: ImageQuality;
  layoutMode: LayoutMode;
  advancedMode: boolean;
  onProfileChange: (profile: ProfileType) => void;
  onLanguageChange: (language: string) => void;
  onScreenshotIntervalChange: (interval: ScreenshotInterval) => void;
  onImageQualityChange: (quality: ImageQuality) => void;
  onLayoutModeChange: (mode: LayoutMode) => void;
  onAdvancedModeChange: (enabled: boolean) => void;
}

export interface OnboardingViewProps extends BaseViewProps {
  onComplete: () => void;
  onClose: () => void;
}

// ============================================================================
// Error Types
// ============================================================================

export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class IpcError extends AppError {
  constructor(message: string, public channel?: string) {
    super(message, 'IPC_ERROR');
    this.name = 'IpcError';
  }
}

export class MediaCaptureError extends AppError {
  constructor(message: string, public mediaType?: 'audio' | 'video') {
    super(message, 'MEDIA_CAPTURE_ERROR');
    this.name = 'MediaCaptureError';
  }
}