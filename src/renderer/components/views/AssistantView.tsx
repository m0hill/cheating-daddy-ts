import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../../stores/appStore';
import { useIpc, useMediaCapture, useFontSize } from '../../hooks';
import type { ProfileType } from '@shared/types';
import './AssistantView.css';

export default function AssistantView() {
  const {
    responses,
    currentResponseIndex,
    selectedProfile,
    setCurrentResponseIndex,
  } = useAppStore();

  const [textInput, setTextInput] = useState('');
  const responseContainerRef = useRef<HTMLDivElement>(null);
  const electronAPI = useIpc();
  const { sendTextMessage, startCapture, stopCapture } = useMediaCapture();
  const [fontSize] = useFontSize();

  // Profile names mapping
  const getProfileNames = (): Record<ProfileType, string> => ({
    interview: 'Job Interview',
    sales: 'Sales Call',
    meeting: 'Business Meeting',
    presentation: 'Presentation',
    negotiation: 'Negotiation',
  });

  // Get current response
  const getCurrentResponse = (): string => {
    const profileNames = getProfileNames();
    return responses.length > 0 && currentResponseIndex >= 0
      ? responses[currentResponseIndex]
      : `Hey, I'm listening to your ${profileNames[selectedProfile] || 'session'}?`;
  };

  // Render markdown content
  const renderMarkdown = useCallback((content: string): string => {
    // Check if marked is available globally
    if (typeof (window as any).marked !== 'undefined') {
      try {
        // Configure marked for better security and formatting
        (window as any).marked.setOptions({
          breaks: true,
          gfm: true,
          sanitize: false, // We trust the AI responses
        });
        const rendered = (window as any).marked.parse(content);
        console.log('Markdown rendered successfully');
        return rendered;
      } catch (error) {
        console.warn('Error parsing markdown:', error);
        return content; // Fallback to plain text
      }
    }
    console.log('Marked not available, using plain text');
    return content; // Fallback if marked is not available
  }, []);

  // Get response counter
  const getResponseCounter = (): string => {
    return responses.length > 0 ? `${currentResponseIndex + 1}/${responses.length}` : '';
  };

  // Navigation functions
  const handlePreviousResponse = useCallback(() => {
    if (currentResponseIndex > 0) {
      setCurrentResponseIndex(currentResponseIndex - 1);
    }
  }, [currentResponseIndex, setCurrentResponseIndex]);

  const handleNextResponse = useCallback(() => {
    if (currentResponseIndex < responses.length - 1) {
      setCurrentResponseIndex(currentResponseIndex + 1);
    }
  }, [currentResponseIndex, responses.length, setCurrentResponseIndex]);

  // Scroll functions
  const scrollResponseUp = useCallback(() => {
    if (responseContainerRef.current) {
      const container = responseContainerRef.current;
      const scrollAmount = container.clientHeight * 0.3; // Scroll 30% of container height
      container.scrollTop = Math.max(0, container.scrollTop - scrollAmount);
    }
  }, []);

  const scrollResponseDown = useCallback(() => {
    if (responseContainerRef.current) {
      const container = responseContainerRef.current;
      const scrollAmount = container.clientHeight * 0.3; // Scroll 30% of container height
      container.scrollTop = Math.min(
        container.scrollHeight - container.clientHeight,
        container.scrollTop + scrollAmount
      );
    }
  }, []);

  // Set up IPC listeners for keyboard shortcuts
  useEffect(() => {
    const unsubscribePrevious = electronAPI.on.navigatePreviousResponse(handlePreviousResponse);
    const unsubscribeNext = electronAPI.on.navigateNextResponse(handleNextResponse);
    const unsubscribeScrollUp = electronAPI.on.scrollResponseUp(scrollResponseUp);
    const unsubscribeScrollDown = electronAPI.on.scrollResponseDown(scrollResponseDown);

    return () => {
      unsubscribePrevious();
      unsubscribeNext();
      unsubscribeScrollUp();
      unsubscribeScrollDown();
    };
  }, [electronAPI.on, handlePreviousResponse, handleNextResponse, scrollResponseUp, scrollResponseDown]);

  // Update response content when it changes
  useEffect(() => {
    if (responseContainerRef.current) {
      const currentResponse = getCurrentResponse();
      const renderedResponse = renderMarkdown(currentResponse);
      responseContainerRef.current.innerHTML = renderedResponse;
    }
  }, [responses, currentResponseIndex, selectedProfile, renderMarkdown, getCurrentResponse]);

  // Handle text input
  const handleSendText = async () => {
    if (textInput.trim()) {
      const message = textInput.trim();
      setTextInput(''); // Clear input

      try {
        const result = await sendTextMessage(message);
        if (!result.success) {
          console.error('Failed to send message:', result.error);
        }
      } catch (error) {
        console.error('Error sending text message:', error);
      }
    }
  };

  const handleTextKeydown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  // Start media capture when component mounts
  useEffect(() => {
    const initializeCapture = async () => {
      try {
        const screenshotInterval = localStorage.getItem('selectedScreenshotInterval') || '5';
        const imageQuality = localStorage.getItem('selectedImageQuality') || 'medium';

        await startCapture(
          screenshotInterval as any,
          imageQuality as any
        );
      } catch (error) {
        console.error('Failed to start media capture:', error);
      }
    };

    initializeCapture();

    // Cleanup on unmount
    return () => {
      stopCapture();
    };
  }, [startCapture, stopCapture]);

  const responseCounter = getResponseCounter();

  return (
    <div className="assistant-view">
      <div
        className="response-container"
        ref={responseContainerRef}
        style={{ fontSize: `${fontSize}px` }}
      />

      <div className="text-input-container">
        <button
          className="nav-button"
          onClick={handlePreviousResponse}
          disabled={currentResponseIndex <= 0}
          title="Previous response"
        >
          <svg width="24px" height="24px" strokeWidth="1.7" viewBox="0 0 24 24" fill="none">
            <path
              d="M15 6L9 12L15 18"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {responses.length > 0 && (
          <span className="response-counter">{responseCounter}</span>
        )}

        <input
          type="text"
          placeholder="Type a message to the AI..."
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          onKeyDown={handleTextKeydown}
          className="text-input"
        />

        <button
          className="nav-button"
          onClick={handleNextResponse}
          disabled={currentResponseIndex >= responses.length - 1}
          title="Next response"
        >
          <svg width="24px" height="24px" strokeWidth="1.7" viewBox="0 0 24 24" fill="none">
            <path
              d="M9 6L15 12L9 18"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}