import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AppState,
  ViewType,
  ProfileType,
  LayoutMode,
  ImageQuality,
  ScreenshotInterval
} from '@shared/types';

interface AppStore extends AppState {
  // View management
  setCurrentView: (view: ViewType) => void;
  setStatusText: (text: string) => void;
  setStartTime: (time: number | null) => void;

  // Session management
  setSessionActive: (active: boolean) => void;
  setIsRecording: (recording: boolean) => void;
  setIsClickThrough: (clickThrough: boolean) => void;

  // Profile and settings
  setSelectedProfile: (profile: ProfileType) => void;
  setSelectedLanguage: (language: string) => void;
  setSelectedScreenshotInterval: (interval: ScreenshotInterval) => void;
  setSelectedImageQuality: (quality: ImageQuality) => void;
  setLayoutMode: (mode: LayoutMode) => void;
  setAdvancedMode: (enabled: boolean) => void;

  // Response management
  addResponse: (response: string) => void;
  setCurrentResponseIndex: (index: number) => void;
  clearResponses: () => void;
  navigateToPreviousResponse: () => void;
  navigateToNextResponse: () => void;

  // Utility methods
  reset: () => void;
  getProfileName: () => string;
  getLanguageName: () => string;
}

// Profile names mapping
const profileNames: Record<ProfileType, string> = {
  interview: 'Job Interview',
  sales: 'Sales Call',
  meeting: 'Business Meeting',
  presentation: 'Presentation',
  negotiation: 'Negotiation',
};

// Language names mapping (subset of most common)
const languageNames: Record<string, string> = {
  'en-US': 'English (US)',
  'en-GB': 'English (UK)',
  'en-AU': 'English (Australia)',
  'en-IN': 'English (India)',
  'de-DE': 'German (Germany)',
  'es-US': 'Spanish (United States)',
  'es-ES': 'Spanish (Spain)',
  'fr-FR': 'French (France)',
  'fr-CA': 'French (Canada)',
  'hi-IN': 'Hindi (India)',
  'pt-BR': 'Portuguese (Brazil)',
  'ar-XA': 'Arabic (Generic)',
  'id-ID': 'Indonesian (Indonesia)',
  'it-IT': 'Italian (Italy)',
  'ja-JP': 'Japanese (Japan)',
  'tr-TR': 'Turkish (Turkey)',
  'vi-VN': 'Vietnamese (Vietnam)',
  'zh-CN': 'Chinese (Mandarin)',
};

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // Initial state
      currentView: 'main',
      statusText: '',
      startTime: null,
      isRecording: false,
      sessionActive: false,
      selectedProfile: 'interview',
      selectedLanguage: 'en-US',
      responses: [],
      currentResponseIndex: -1,
      selectedScreenshotInterval: '5',
      selectedImageQuality: 'medium',
      layoutMode: 'normal',
      advancedMode: false,
      isClickThrough: false,

      // View management
      setCurrentView: (view) => set({ currentView: view }),
      setStatusText: (text) => set({ statusText: text }),
      setStartTime: (time) => set({ startTime: time }),

      // Session management
      setSessionActive: (active) => set({ sessionActive: active }),
      setIsRecording: (recording) => set({ isRecording: recording }),
      setIsClickThrough: (clickThrough) => set({ isClickThrough: clickThrough }),

      // Profile and settings
      setSelectedProfile: (profile) => set({ selectedProfile: profile }),
      setSelectedLanguage: (language) => set({ selectedLanguage: language }),
      setSelectedScreenshotInterval: (interval) => set({ selectedScreenshotInterval: interval }),
      setSelectedImageQuality: (quality) => set({ selectedImageQuality: quality }),
      setLayoutMode: (mode) => {
        set({ layoutMode: mode });
        // Apply layout mode to document root
        if (mode === 'compact') {
          document.documentElement.classList.add('compact-layout');
        } else {
          document.documentElement.classList.remove('compact-layout');
        }
      },
      setAdvancedMode: (enabled) => set({ advancedMode: enabled }),

      // Response management
      addResponse: (response) => {
        const { responses, currentResponseIndex } = get();
        const newResponses = [...responses, response];

        // Auto-navigate to new response if viewing latest or no responses
        const newIndex = currentResponseIndex === responses.length - 1 || currentResponseIndex === -1
          ? newResponses.length - 1
          : currentResponseIndex;

        set({
          responses: newResponses,
          currentResponseIndex: newIndex
        });
      },

      setCurrentResponseIndex: (index) => set({ currentResponseIndex: index }),

      clearResponses: () => set({ responses: [], currentResponseIndex: -1 }),

      navigateToPreviousResponse: () => {
        const { currentResponseIndex } = get();
        if (currentResponseIndex > 0) {
          set({ currentResponseIndex: currentResponseIndex - 1 });
        }
      },

      navigateToNextResponse: () => {
        const { currentResponseIndex, responses } = get();
        if (currentResponseIndex < responses.length - 1) {
          set({ currentResponseIndex: currentResponseIndex + 1 });
        }
      },

      // Utility methods
      reset: () => set({
        currentView: 'main',
        statusText: '',
        startTime: null,
        isRecording: false,
        sessionActive: false,
        responses: [],
        currentResponseIndex: -1,
        isClickThrough: false,
      }),

      getProfileName: () => {
        const { selectedProfile } = get();
        return profileNames[selectedProfile] || 'Unknown';
      },

      getLanguageName: () => {
        const { selectedLanguage } = get();
        return languageNames[selectedLanguage] || selectedLanguage;
      },
    }),
    {
      name: 'cheating-daddy-store',
      // Only persist certain state
      partialize: (state) => ({
        selectedProfile: state.selectedProfile,
        selectedLanguage: state.selectedLanguage,
        selectedScreenshotInterval: state.selectedScreenshotInterval,
        selectedImageQuality: state.selectedImageQuality,
        layoutMode: state.layoutMode,
        advancedMode: state.advancedMode,
      }),
    }
  )
);