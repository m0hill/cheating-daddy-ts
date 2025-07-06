import type { ProfileType } from '@shared/types'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useFontSize, useIpc, useMediaCapture } from '../../hooks'
import { useAppStore } from '../../stores/appStore'

declare global {
  interface Window {
    marked: {
      setOptions: (options: Record<string, unknown>) => void
      parse: (markdown: string) => string
    }
  }
}

const AssistantView = () => {
  const {
    responses,
    currentResponseIndex,
    selectedProfile,
    selectedScreenshotInterval,
    selectedImageQuality,
    setCurrentResponseIndex,
  } = useAppStore()

  const [textInput, setTextInput] = useState('')
  const responseContainerRef = useRef<HTMLDivElement>(null)
  const electronAPI = useIpc()
  const {
    sendTextMessage,
    startCapture,
    stopCapture,
    currentAudioSource,
    microphoneEnabled,
    toggleAudioSource,
  } = useMediaCapture()
  const [fontSize] = useFontSize()

  // Profile names mapping
  const getProfileNames = (): Record<ProfileType, string> => ({
    interview: 'Job Interview',
    sales: 'Sales Call',
    meeting: 'Business Meeting',
    presentation: 'Presentation',
    negotiation: 'Negotiation',
  })

  // Get current response
  const getCurrentResponse = (): string => {
    const profileNames = getProfileNames()
    return responses.length > 0 && currentResponseIndex >= 0
      ? responses[currentResponseIndex]
      : `Hey, I'm listening to your ${profileNames[selectedProfile] || 'session'}?`
  }

  // Render markdown content
  const renderMarkdown = useCallback((content: string): string => {
    // Check if marked is available globally
    if (typeof window.marked !== 'undefined') {
      try {
        // Configure marked for better security and formatting
        window.marked.setOptions({
          breaks: true,
          gfm: true,
          sanitize: false, // We trust the AI responses
        })
        const rendered = window.marked.parse(content)
        console.log('Markdown rendered successfully')
        return rendered
      } catch (error) {
        console.warn('Error parsing markdown:', error)
        return content // Fallback to plain text
      }
    }
    console.log('Marked not available, using plain text')
    return content // Fallback if marked is not available
  }, [])

  // Get response counter
  const getResponseCounter = (): string => {
    return responses.length > 0 ? `${currentResponseIndex + 1}/${responses.length}` : ''
  }

  // Navigation functions
  const handlePreviousResponse = useCallback(() => {
    if (currentResponseIndex > 0) {
      setCurrentResponseIndex(currentResponseIndex - 1)
    }
  }, [currentResponseIndex, setCurrentResponseIndex])

  const handleNextResponse = useCallback(() => {
    if (currentResponseIndex < responses.length - 1) {
      setCurrentResponseIndex(currentResponseIndex + 1)
    }
  }, [currentResponseIndex, responses.length, setCurrentResponseIndex])

  // Scroll functions
  const scrollResponseUp = useCallback(() => {
    if (responseContainerRef.current) {
      const container = responseContainerRef.current
      const scrollAmount = container.clientHeight * 0.3 // Scroll 30% of container height
      container.scrollTop = Math.max(0, container.scrollTop - scrollAmount)
    }
  }, [])

  const scrollResponseDown = useCallback(() => {
    if (responseContainerRef.current) {
      const container = responseContainerRef.current
      const scrollAmount = container.clientHeight * 0.3 // Scroll 30% of container height
      container.scrollTop = Math.min(
        container.scrollHeight - container.clientHeight,
        container.scrollTop + scrollAmount
      )
    }
  }, [])

  // Set up IPC listeners for keyboard shortcuts
  useEffect(() => {
    const unsubscribePrevious = electronAPI.on.navigatePreviousResponse(handlePreviousResponse)
    const unsubscribeNext = electronAPI.on.navigateNextResponse(handleNextResponse)
    const unsubscribeScrollUp = electronAPI.on.scrollResponseUp(scrollResponseUp)
    const unsubscribeScrollDown = electronAPI.on.scrollResponseDown(scrollResponseDown)

    return () => {
      unsubscribePrevious()
      unsubscribeNext()
      unsubscribeScrollUp()
      unsubscribeScrollDown()
    }
  }, [
    electronAPI.on,
    handlePreviousResponse,
    handleNextResponse,
    scrollResponseUp,
    scrollResponseDown,
  ])

  // Update response content when it changes
  useEffect(() => {
    if (responseContainerRef.current) {
      const currentResponse = getCurrentResponse()
      const renderedResponse = renderMarkdown(currentResponse)
      responseContainerRef.current.innerHTML = renderedResponse
    }
  }, [responses, currentResponseIndex, selectedProfile, renderMarkdown, getCurrentResponse])

  // Handle text input
  const handleSendText = async () => {
    if (textInput.trim()) {
      const message = textInput.trim()
      setTextInput('') // Clear input

      try {
        const result = await sendTextMessage(message)
        if (!result.success) {
          console.error('Failed to send message:', result.error)
        }
      } catch (error) {
        console.error('Error sending text message:', error)
      }
    }
  }

  const handleTextKeydown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendText()
    }
  }

  // Start media capture when component mounts
  useEffect(() => {
    const initializeCapture = async () => {
      try {
        await startCapture(selectedScreenshotInterval, selectedImageQuality)
      } catch (error) {
        console.error('Failed to start media capture:', error)
      }
    }

    initializeCapture()

    // Cleanup on unmount
    return () => {
      stopCapture()
    }
  }, [startCapture, stopCapture, selectedScreenshotInterval, selectedImageQuality])

  const navButtonClasses =
    'flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-white transition-all duration-150 ease-in-out hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent'

  return (
    <div className="flex h-full flex-col font-sans">
      <div
        className="response-container h-[calc(100%-60px)] overflow-y-auto rounded-lg [background:var(--main-content-background)] p-4"
        ref={responseContainerRef}
        style={{ fontSize: `${fontSize}px`, lineHeight: 1.6, scrollBehavior: 'smooth' }}
      />

      <div className="mt-2.5 flex items-center gap-2.5">
        <button
          className={navButtonClasses}
          onClick={handlePreviousResponse}
          disabled={currentResponseIndex <= 0}
          title="Previous response"
        >
          <ChevronLeft size={24} strokeWidth={1.7} />
        </button>

        {responses.length > 0 && (
          <span className="min-w-16 flex-shrink-0 text-center text-xs text-[--description-color]">
            {getResponseCounter()}
          </span>
        )}

        {/* Audio Source Indicator */}
        {microphoneEnabled && (
          <div className="flex items-center gap-1.5">
            <div
              className={`h-2 w-2 rounded-full ${
                currentAudioSource === 'system' ? 'bg-blue-500' : 'bg-green-500'
              }`}
              title={`Audio source: ${currentAudioSource === 'system' ? 'System (Interviewer)' : 'Microphone (You)'}`}
            />
            <span className="text-xs text-[--description-color]">
              {currentAudioSource === 'system' ? 'SYS' : 'MIC'}
            </span>
            <button
              onClick={toggleAudioSource}
              className="text-xs text-[--description-color] hover:text-[--text-color] transition-colors"
              title="Press Cmd+Shift+M to toggle audio source"
            >
              (⌘⇧M)
            </button>
          </div>
        )}

        <input
          type="text"
          placeholder="Type a message to the AI..."
          value={textInput}
          onChange={e => setTextInput(e.target.value)}
          onKeyDown={handleTextKeydown}
          className="flex-1 rounded-lg border border-[--button-border] bg-[--input-background] px-3.5 py-2.5 text-sm text-[--text-color] transition-all duration-150 ease-in-out placeholder:text-[--placeholder-color] focus:border-[--focus-border-color] focus:bg-[--input-focus-background] focus:shadow-[0_0_0_3px_var(--focus-box-shadow)] focus:outline-none"
        />

        <button
          className={navButtonClasses}
          onClick={handleNextResponse}
          disabled={currentResponseIndex >= responses.length - 1}
          title="Next response"
        >
          <ChevronRight size={24} strokeWidth={1.7} />
        </button>
      </div>
    </div>
  )
}

export default AssistantView
