import type { ConversationSession } from '@shared/types'
import clsx from 'clsx'
import { ArrowLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useConversationStorage, useWindowResize } from '../../hooks'

export default function HistoryView() {
  const [sessions, setSessions] = useState<ConversationSession[]>([])
  const [selectedSession, setSelectedSession] = useState<ConversationSession | null>(null)
  const [loading, setLoading] = useState(true)

  const { resizeForCurrentView } = useWindowResize()
  const { getAllConversationSessions } = useConversationStorage()

  // Resize window when component mounts
  useEffect(() => {
    resizeForCurrentView()
  }, [resizeForCurrentView])

  // Load sessions on component mount
  useEffect(() => {
    const loadSessions = async () => {
      try {
        setLoading(true)
        const allSessions = await getAllConversationSessions()
        setSessions(allSessions)
      } catch (error) {
        console.error('Error loading conversation sessions:', error)
        setSessions([])
      } finally {
        setLoading(false)
      }
    }

    loadSessions()
  }, [getAllConversationSessions])

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getSessionPreview = (session: ConversationSession): string => {
    if (!session.conversationHistory || session.conversationHistory.length === 0) {
      return 'No conversation yet'
    }

    const firstTurn = session.conversationHistory[0]
    const preview = firstTurn.transcription || firstTurn.ai_response || 'Empty conversation'
    return preview.length > 100 ? preview.substring(0, 100) + '...' : preview
  }

  const handleSessionClick = (session: ConversationSession) => {
    setSelectedSession(session)
  }

  const handleBackClick = () => {
    setSelectedSession(null)
  }

  const renderSessionsList = () => {
    if (loading) {
      return (
        <div className="mt-8 text-center text-xs text-[--description-color]">
          <div className="spinner mx-auto mb-2" />
          Loading conversation history...
        </div>
      )
    }

    if (sessions.length === 0) {
      return (
        <div className="mt-8 text-center text-xs text-[--description-color]">
          <div className="mb-1.5 text-base font-semibold text-[--text-color]">
            No conversations yet
          </div>
          <div>Start a session to see your conversation history here</div>
        </div>
      )
    }

    return (
      <div className="h-full overflow-y-auto pb-5">
        {sessions.map(session => (
          <div
            key={session.sessionId}
            className={clsx(
              'mb-2 cursor-pointer rounded-md border border-[--button-border] bg-[--input-background] p-3 transition-all',
              'hover:border-[--focus-border-color] hover:bg-[--hover-background]',
              {
                'border-[--focus-border-color] bg-[--focus-box-shadow]':
                  selectedSession?.sessionId === session.sessionId,
              }
            )}
            onClick={() => handleSessionClick(session)}
          >
            <div className="mb-1.5 flex items-center justify-between">
              <div className="text-xs font-semibold text-[--text-color]">
                {formatDate(session.timestamp)}
              </div>
              <div className="text-[11px] text-[--description-color]">
                {formatTime(session.timestamp)}
              </div>
            </div>
            <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[11px] leading-tight text-[--description-color]">
              {getSessionPreview(session)}
            </div>
          </div>
        ))}
      </div>
    )
  }

  const renderConversationView = () => {
    if (!selectedSession) return null

    const { conversationHistory } = selectedSession
    const messages: Array<{ type: 'user' | 'ai'; content: string; timestamp: number }> = []

    if (conversationHistory) {
      conversationHistory.forEach(turn => {
        if (turn.transcription) {
          messages.push({ type: 'user', content: turn.transcription, timestamp: turn.timestamp })
        }
        if (turn.ai_response) {
          messages.push({ type: 'ai', content: turn.ai_response, timestamp: turn.timestamp })
        }
      })
    }

    return (
      <>
        <div className="mb-3 flex items-center justify-between">
          <button
            className="flex cursor-pointer items-center gap-1.5 rounded border border-[--button-border] bg-[--button-background] px-3 py-1.5 text-xs font-medium text-[--text-color] transition-all hover:bg-[--hover-background]"
            onClick={handleBackClick}
          >
            <ArrowLeft size={16} strokeWidth={1.7} />
            Back to Sessions
          </button>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-xs text-[--description-color]">
              <div className="h-1.5 w-1.5 rounded-full bg-[#5865f2]" />
              <span>Them</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-[--description-color]">
              <div className="h-1.5 w-1.5 rounded-full bg-[#ed4245]" />
              <span>Suggestion</span>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto rounded-md border border-[--button-border] bg-[--main-content-background] p-3 pb-5">
          {messages.length > 0 ? (
            messages.map((message, index) => (
              <div
                key={index}
                className={clsx(
                  'mb-1.5 rounded-r-md border-l-[3px] bg-[--input-background] px-2.5 py-1.5 text-xs leading-normal',
                  {
                    'border-l-[#5865f2]': message.type === 'user',
                    'border-l-[#ed4245]': message.type === 'ai',
                  }
                )}
              >
                {message.content}
              </div>
            ))
          ) : (
            <div className="text-center text-xs text-[--description-color]">
              No conversation data available
            </div>
          )}
        </div>
      </>
    )
  }

  return (
    <div className="flex h-full w-full flex-col font-sans select-none">
      <div className="flex h-full flex-col">
        {selectedSession ? renderConversationView() : renderSessionsList()}
      </div>
    </div>
  )
}
