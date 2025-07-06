import { useState, useEffect } from 'react';
import { useWindowResize, useConversationStorage } from '../../hooks';
import type { ConversationSession } from '@shared/types';
import './HistoryView.css';

export default function HistoryView() {
  const [sessions, setSessions] = useState<ConversationSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ConversationSession | null>(null);
  const [loading, setLoading] = useState(true);

  const { resizeForCurrentView } = useWindowResize();
  const { getAllConversationSessions } = useConversationStorage();

  // Resize window when component mounts
  useEffect(() => {
    resizeForCurrentView();
  }, [resizeForCurrentView]);

  // Load sessions on component mount
  useEffect(() => {
    const loadSessions = async () => {
      try {
        setLoading(true);
        const allSessions = await getAllConversationSessions();
        setSessions(allSessions);
      } catch (error) {
        console.error('Error loading conversation sessions:', error);
        setSessions([]);
      } finally {
        setLoading(false);
      }
    };

    loadSessions();
  }, [getAllConversationSessions]);

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getSessionPreview = (session: ConversationSession): string => {
    if (!session.conversationHistory || session.conversationHistory.length === 0) {
      return 'No conversation yet';
    }

    const firstTurn = session.conversationHistory[0];
    const preview = firstTurn.transcription || firstTurn.ai_response || 'Empty conversation';
    return preview.length > 100 ? preview.substring(0, 100) + '...' : preview;
  };

  const handleSessionClick = (session: ConversationSession) => {
    setSelectedSession(session);
  };

  const handleBackClick = () => {
    setSelectedSession(null);
  };

  const renderSessionsList = () => {
    if (loading) {
      return (
        <div className="loading">
          <div className="spinner" />
          Loading conversation history...
        </div>
      );
    }

    if (sessions.length === 0) {
      return (
        <div className="empty-state">
          <div className="empty-state-title">No conversations yet</div>
          <div>Start a session to see your conversation history here</div>
        </div>
      );
    }

    return (
      <div className="sessions-list">
        {sessions.map(session => (
          <div
            key={session.sessionId}
            className="session-item"
            onClick={() => handleSessionClick(session)}
          >
            <div className="session-header">
              <div className="session-date">{formatDate(session.timestamp)}</div>
              <div className="session-time">{formatTime(session.timestamp)}</div>
            </div>
            <div className="session-preview">{getSessionPreview(session)}</div>
          </div>
        ))}
      </div>
    );
  };

  const renderConversationView = () => {
    if (!selectedSession) return null;

    const { conversationHistory } = selectedSession;

    // Flatten the conversation turns into individual messages
    const messages: Array<{ type: 'user' | 'ai'; content: string; timestamp: number }> = [];

    if (conversationHistory) {
      conversationHistory.forEach(turn => {
        if (turn.transcription) {
          messages.push({
            type: 'user',
            content: turn.transcription,
            timestamp: turn.timestamp,
          });
        }
        if (turn.ai_response) {
          messages.push({
            type: 'ai',
            content: turn.ai_response,
            timestamp: turn.timestamp,
          });
        }
      });
    }

    return (
      <>
        <div className="back-header">
          <button className="back-button" onClick={handleBackClick}>
            <svg
              width="16px"
              height="16px"
              strokeWidth="1.7"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M15 6L9 12L15 18"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Back to Sessions
          </button>
          <div className="legend">
            <div className="legend-item">
              <div className="legend-dot user" />
              <span>Them</span>
            </div>
            <div className="legend-item">
              <div className="legend-dot ai" />
              <span>Suggestion</span>
            </div>
          </div>
        </div>
        <div className="conversation-view">
          {messages.length > 0 ? (
            messages.map((message, index) => (
              <div key={index} className={`message ${message.type}`}>
                {message.content}
              </div>
            ))
          ) : (
            <div className="empty-state">No conversation data available</div>
          )}
        </div>
      </>
    );
  };

  return (
    <div className="history-view">
      <div className="history-container">
        {selectedSession ? renderConversationView() : renderSessionsList()}
      </div>
    </div>
  );
}