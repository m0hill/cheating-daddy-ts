import { GoogleGenAI } from '@google/genai'
import type {
  AudioContent,
  ConversationTurn,
  GeminiInitParams,
  ImageContent,
  IpcResult,
  ProfileType,
  SessionData,
} from '@shared/types'
import { ChildProcess, spawn } from 'child_process'
import { BrowserWindow, ipcMain } from 'electron'
import { saveDebugAudio } from '../audio/AudioUtils'
import { getSystemPrompt } from './prompts'

interface ReconnectionParams {
  apiKey: string
  customPrompt: string
  profile: string
  language: string
}

const createGeminiService = () => {
  // State variables
  let currentSession: any = null
  let currentSessionId: string | null = null
  let currentTranscription = ''
  let conversationHistory: ConversationTurn[] = []
  let isInitializingSession = false
  let systemAudioProc: ChildProcess | null = null
  let messageBuffer = ''
  let reconnectionAttempts = 0
  const maxReconnectionAttempts = 3
  const reconnectionDelay = 2000 // 2 seconds
  let lastSessionParams: ReconnectionParams | null = null

  // Internal functions (formerly private methods)
  const sendToRenderer = (channel: string, data: any): void => {
    const windows = BrowserWindow.getAllWindows()
    if (windows.length > 0) {
      windows[0].webContents.send(channel, data)
    }
  }

  const initializeNewSession = (): void => {
    currentSessionId = Date.now().toString()
    currentTranscription = ''
    conversationHistory = []
    console.log('New conversation session started:', currentSessionId)
  }

  const saveConversationTurn = (transcription: string, aiResponse: string): void => {
    if (!currentSessionId) {
      initializeNewSession()
    }

    const conversationTurn: ConversationTurn = {
      timestamp: Date.now(),
      transcription: transcription.trim(),
      ai_response: aiResponse.trim(),
    }

    conversationHistory.push(conversationTurn)
    console.log('Saved conversation turn:', conversationTurn)

    // Send to renderer to save in IndexedDB
    sendToRenderer('save-conversation-turn', {
      sessionId: currentSessionId,
      turn: conversationTurn,
      fullHistory: conversationHistory,
    })
  }

  const getCurrentSessionData = (): SessionData => ({
    sessionId: currentSessionId,
    history: conversationHistory,
  })

  const sendReconnectionContext = async (): Promise<void> => {
    if (!currentSession || conversationHistory.length === 0) {
      return
    }

    try {
      // Gather all transcriptions from the conversation history
      const transcriptions = conversationHistory
        .map(turn => turn.transcription)
        .filter(transcription => transcription && transcription.trim().length > 0)

      if (transcriptions.length === 0) {
        return
      }

      // Create the context message
      const contextMessage = `Till now all these questions were asked in the interview, answer the last one please:\n\n${transcriptions.join('\n')}`

      console.log('Sending reconnection context with', transcriptions.length, 'previous questions')

      // Send the context message to the new session
      await currentSession.sendRealtimeInput({
        text: contextMessage,
      })
    } catch (error) {
      console.error('Error sending reconnection context:', error)
    }
  }

  const getEnabledTools = async (): Promise<any[]> => {
    const tools: any[] = []

    // Check if Google Search is enabled (default: true)
    const googleSearchEnabled = await getStoredSetting('googleSearchEnabled', 'true')
    console.log('Google Search enabled:', googleSearchEnabled)

    if (googleSearchEnabled === 'true') {
      tools.push({ googleSearch: {} })
      console.log('Added Google Search tool')
    } else {
      console.log('Google Search tool disabled')
    }

    return tools
  }

  const getStoredSetting = async (key: string, defaultValue: string): Promise<string> => {
    try {
      const windows = BrowserWindow.getAllWindows()
      if (windows.length > 0) {
        // Wait a bit for the renderer to be ready
        await new Promise(resolve => setTimeout(resolve, 100))

        // Try to get setting from renderer process localStorage
        const value = await windows[0].webContents.executeJavaScript(`
          (function() {
            try {
              if (typeof localStorage === 'undefined') {
                console.log('localStorage not available yet for ${key}');
                return '${defaultValue}';
              }
              const stored = localStorage.getItem('${key}');
              console.log('Retrieved setting ${key}:', stored);
              return stored || '${defaultValue}';
            } catch (e) {
              console.error('Error accessing localStorage for ${key}:', e);
              return '${defaultValue}';
            }
          })()
        `)
        return value
      }
    } catch (error) {
      if (error && typeof error === 'object' && 'message' in error) {
        console.error('Error getting stored setting for', key, ':', (error as any).message)
      } else {
        console.error('Error getting stored setting for', key, ':', error)
      }
    }
    console.log('Using default value for', key, ':', defaultValue)
    return defaultValue
  }

  const attemptReconnection = async (): Promise<boolean> => {
    if (!lastSessionParams || reconnectionAttempts >= maxReconnectionAttempts) {
      console.log('Max reconnection attempts reached or no session params stored')
      sendToRenderer('update-status', 'Session closed')
      return false
    }

    reconnectionAttempts++
    console.log(`Attempting reconnection ${reconnectionAttempts}/${maxReconnectionAttempts}...`)

    // Wait before attempting reconnection
    await new Promise(resolve => setTimeout(resolve, reconnectionDelay))

    try {
      const session = await initializeGeminiSession(
        lastSessionParams.apiKey,
        lastSessionParams.customPrompt,
        lastSessionParams.profile,
        lastSessionParams.language,
        true // isReconnection flag
      )

      if (session) {
        currentSession = session
        reconnectionAttempts = 0 // Reset counter on successful reconnection
        console.log('Live session reconnected')

        // Send context message with previous transcriptions
        await sendReconnectionContext()

        return true
      }
    } catch (error) {
      console.error(`Reconnection attempt ${reconnectionAttempts} failed:`, error)
    }

    // If this attempt failed, try again
    if (reconnectionAttempts < maxReconnectionAttempts) {
      return attemptReconnection()
    } else {
      console.log('All reconnection attempts failed')
      sendToRenderer('update-status', 'Session closed')
      return false
    }
  }

  const convertStereoToMono = (stereoBuffer: Buffer): Buffer => {
    const samples = stereoBuffer.length / 4
    const monoBuffer = Buffer.alloc(samples * 2)

    for (let i = 0; i < samples; i++) {
      const leftSample = stereoBuffer.readInt16LE(i * 4)
      monoBuffer.writeInt16LE(leftSample, i * 2)
    }

    return monoBuffer
  }

  const sendAudioToGemini = async (base64Data: string): Promise<void> => {
    if (!currentSession) return

    try {
      process.stdout.write('.')
      await currentSession.sendRealtimeInput({
        audio: {
          data: base64Data,
          mimeType: 'audio/pcm;rate=24000',
        },
      })
    } catch (error) {
      console.error('Error sending audio to Gemini:', error)
    }
  }

  // Public API
  const initializeGeminiSession = async (
    apiKey: string,
    customPrompt = '',
    profile = 'interview',
    language = 'en-US',
    isReconnection = false
  ): Promise<any> => {
    if (isInitializingSession) {
      console.log('Session initialization already in progress')
      return false
    }

    isInitializingSession = true
    sendToRenderer('session-initializing', true)

    // Store session parameters for reconnection (only if not already reconnecting)
    if (!isReconnection) {
      lastSessionParams = {
        apiKey,
        customPrompt,
        profile,
        language,
      }
      reconnectionAttempts = 0 // Reset counter for new session
    }

    const client = new GoogleGenAI({
      vertexai: false,
      apiKey: apiKey,
    })

    // Get enabled tools first to determine Google Search status
    const enabledTools = await getEnabledTools()
    const googleSearchEnabled = enabledTools.some(tool => tool.googleSearch)

    const systemPrompt = getSystemPrompt(profile as ProfileType, customPrompt, googleSearchEnabled)

    // Initialize new conversation session (only if not reconnecting)
    if (!isReconnection) {
      initializeNewSession()
    }

    try {
      const session = await client.live.connect({
        model: 'gemini-live-2.5-flash-preview',
        callbacks: {
          onopen: () => {
            sendToRenderer('update-status', 'Live session connected')
          },
          onmessage: (message: any) => {
            console.log('----------------', message)

            // Handle transcription input
            if (message.serverContent?.inputTranscription?.text) {
              currentTranscription += message.serverContent.inputTranscription.text
            }

            // Handle AI model response
            if (message.serverContent?.modelTurn?.parts) {
              for (const part of message.serverContent.modelTurn.parts) {
                console.log(part)
                if (part.text) {
                  messageBuffer += part.text
                }
              }
            }

            if (message.serverContent?.generationComplete) {
              sendToRenderer('update-response', messageBuffer)

              // Save conversation turn when we have both transcription and AI response
              if (currentTranscription && messageBuffer) {
                saveConversationTurn(currentTranscription, messageBuffer)
                currentTranscription = '' // Reset for next turn
              }

              messageBuffer = ''
            }

            if (message.serverContent?.turnComplete) {
              sendToRenderer('update-status', 'Listening...')
            }
          },
          onerror: (e: any) => {
            console.debug('Error:', e.message)

            // Check if the error is related to invalid API key
            const isApiKeyError =
              e.message &&
              (e.message.includes('API key not valid') ||
                e.message.includes('invalid API key') ||
                e.message.includes('authentication failed') ||
                e.message.includes('unauthorized'))

            if (isApiKeyError) {
              console.log('Error due to invalid API key - stopping reconnection attempts')
              lastSessionParams = null // Clear session params to prevent reconnection
              reconnectionAttempts = maxReconnectionAttempts // Stop further attempts
              sendToRenderer('update-status', 'Error: Invalid API key')
              return
            }

            sendToRenderer('update-status', 'Error: ' + e.message)
          },
          onclose: (e: any) => {
            console.debug('Session closed:', e.reason)

            // Check if the session closed due to invalid API key
            const isApiKeyError =
              e.reason &&
              (e.reason.includes('API key not valid') ||
                e.reason.includes('invalid API key') ||
                e.reason.includes('authentication failed') ||
                e.reason.includes('unauthorized'))

            if (isApiKeyError) {
              console.log('Session closed due to invalid API key - stopping reconnection attempts')
              lastSessionParams = null // Clear session params to prevent reconnection
              reconnectionAttempts = maxReconnectionAttempts // Stop further attempts
              sendToRenderer('update-status', 'Session closed: Invalid API key')
              return
            }

            // Attempt automatic reconnection for server-side closures
            if (lastSessionParams && reconnectionAttempts < maxReconnectionAttempts) {
              console.log('Attempting automatic reconnection...')
              attemptReconnection()
            } else {
              sendToRenderer('update-status', 'Session closed')
            }
          },
        },
        config: {
          responseModalities: ['TEXT'] as any[],
          tools: enabledTools,
          inputAudioTranscription: {},
          contextWindowCompression: { slidingWindow: {} },
          speechConfig: { languageCode: language },
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
        },
      })

      isInitializingSession = false
      sendToRenderer('session-initializing', false)
      return session
    } catch (error) {
      console.error('Failed to initialize Gemini session:', error)
      isInitializingSession = false
      sendToRenderer('session-initializing', false)
      return null
    }
  }

  const killExistingSystemAudioDump = async (): Promise<void> => {
    return new Promise(resolve => {
      console.log('Checking for existing SystemAudioDump processes...')

      // Kill any existing SystemAudioDump processes
      const killProc = spawn('pkill', ['-f', 'SystemAudioDump'], {
        stdio: 'ignore',
      })

      killProc.on('close', code => {
        if (code === 0) {
          console.log('Killed existing SystemAudioDump processes')
        } else {
          console.log('No existing SystemAudioDump processes found')
        }
        resolve()
      })

      killProc.on('error', err => {
        console.log('Error checking for existing processes (this is normal):', err.message)
        resolve()
      })

      // Timeout after 2 seconds
      setTimeout(() => {
        killProc.kill()
        resolve()
      }, 2000)
    })
  }

  const startMacOSAudioCapture = async (): Promise<boolean> => {
    if (process.platform !== 'darwin') return false

    // Kill any existing SystemAudioDump processes first
    await killExistingSystemAudioDump()

    console.log('Starting macOS audio capture with SystemAudioDump...')

    const { app } = require('electron')
    const path = require('path')

    let systemAudioPath: string
    if (app.isPackaged) {
      systemAudioPath = path.join(process.resourcesPath, 'SystemAudioDump')
    } else {
      systemAudioPath = path.join(__dirname, '../../assets', 'SystemAudioDump')
    }

    console.log('SystemAudioDump path:', systemAudioPath)

    systemAudioProc = spawn(systemAudioPath, [], {
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    if (!systemAudioProc.pid) {
      console.error('Failed to start SystemAudioDump')
      return false
    }

    console.log('SystemAudioDump started with PID:', systemAudioProc.pid)

    const CHUNK_DURATION = 0.1
    const SAMPLE_RATE = 24000
    const BYTES_PER_SAMPLE = 2
    const CHANNELS = 2
    const CHUNK_SIZE = SAMPLE_RATE * BYTES_PER_SAMPLE * CHANNELS * CHUNK_DURATION

    let audioBuffer = Buffer.alloc(0)

    systemAudioProc.stdout?.on('data', data => {
      audioBuffer = Buffer.concat([audioBuffer, data])

      while (audioBuffer.length >= CHUNK_SIZE) {
        const chunk = audioBuffer.slice(0, CHUNK_SIZE)
        audioBuffer = audioBuffer.slice(CHUNK_SIZE)

        const monoChunk = CHANNELS === 2 ? convertStereoToMono(chunk) : chunk
        const base64Data = monoChunk.toString('base64')
        sendAudioToGemini(base64Data)

        if (process.env.DEBUG_AUDIO) {
          console.log(`Processed audio chunk: ${chunk.length} bytes`)
          saveDebugAudio(monoChunk, 'system_audio')
        }
      }

      const maxBufferSize = SAMPLE_RATE * BYTES_PER_SAMPLE * 1
      if (audioBuffer.length > maxBufferSize) {
        audioBuffer = audioBuffer.slice(-maxBufferSize)
      }
    })

    systemAudioProc.stderr?.on('data', data => {
      console.error('SystemAudioDump stderr:', data.toString())
    })

    systemAudioProc.on('close', code => {
      console.log('SystemAudioDump process closed with code:', code)
      systemAudioProc = null
    })

    systemAudioProc.on('error', err => {
      console.error('SystemAudioDump process error:', err)
      systemAudioProc = null
    })

    return true
  }

  const stopMacOSAudioCapture = (): void => {
    if (systemAudioProc) {
      console.log('Stopping SystemAudioDump...')
      systemAudioProc.kill('SIGTERM')
      systemAudioProc = null
    }
  }

  const setupIpcHandlers = (): void => {
    // Initialize Gemini session
    ipcMain.handle('initialize-gemini', async (_, params: GeminiInitParams): Promise<boolean> => {
      const { apiKey, customPrompt = '', profile = 'interview', language = 'en-US' } = params
      const session = await initializeGeminiSession(apiKey, customPrompt, profile, language)
      if (session) {
        currentSession = session
        return true
      }
      return false
    })

    // Send audio content
    ipcMain.handle('send-audio-content', async (_, content: AudioContent): Promise<IpcResult> => {
      if (!currentSession) return { success: false, error: 'No active Gemini session' }
      try {
        process.stdout.write('.')
        await currentSession.sendRealtimeInput({
          audio: { data: content.data, mimeType: content.mimeType },
        })
        return { success: true }
      } catch (error) {
        console.error('Error sending audio:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      }
    })

    // Send image content
    ipcMain.handle('send-image-content', async (_, content: ImageContent): Promise<IpcResult> => {
      if (!currentSession) return { success: false, error: 'No active Gemini session' }

      try {
        if (!content.data || typeof content.data !== 'string') {
          console.error('Invalid image data received')
          return { success: false, error: 'Invalid image data' }
        }

        const buffer = Buffer.from(content.data, 'base64')

        if (buffer.length < 1000) {
          console.error(`Image buffer too small: ${buffer.length} bytes`)
          return { success: false, error: 'Image buffer too small' }
        }

        process.stdout.write('!')
        await currentSession.sendRealtimeInput({
          media: { data: content.data, mimeType: 'image/jpeg' },
        })

        return { success: true }
      } catch (error) {
        console.error('Error sending image:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      }
    })

    // Send text message
    ipcMain.handle('send-text-message', async (_, text: string): Promise<IpcResult> => {
      if (!currentSession) return { success: false, error: 'No active Gemini session' }

      try {
        if (!text || typeof text !== 'string' || text.trim().length === 0) {
          return { success: false, error: 'Invalid text message' }
        }

        console.log('Sending text message:', text)
        await currentSession.sendRealtimeInput({ text: text.trim() })
        return { success: true }
      } catch (error) {
        console.error('Error sending text:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      }
    })

    // macOS audio handlers
    ipcMain.handle('start-macos-audio', async (): Promise<IpcResult> => {
      if (process.platform !== 'darwin') {
        return {
          success: false,
          error: 'macOS audio capture only available on macOS',
        }
      }

      try {
        const success = await startMacOSAudioCapture()
        return { success }
      } catch (error) {
        console.error('Error starting macOS audio capture:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      }
    })

    ipcMain.handle('stop-macos-audio', async (): Promise<IpcResult> => {
      try {
        stopMacOSAudioCapture()
        return { success: true }
      } catch (error) {
        console.error('Error stopping macOS audio capture:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      }
    })

    // Session management
    ipcMain.handle('close-session', async (): Promise<IpcResult> => {
      try {
        stopMacOSAudioCapture()

        // Clear session params to prevent reconnection when user closes session
        lastSessionParams = null

        // Cleanup any pending resources and stop audio/video capture
        if (currentSession) {
          await currentSession.close()
          currentSession = null
        }

        return { success: true }
      } catch (error) {
        console.error('Error closing session:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      }
    })

    // Conversation history handlers
    ipcMain.handle('get-current-session', async (): Promise<IpcResult<SessionData>> => {
      try {
        return { success: true, data: getCurrentSessionData() }
      } catch (error) {
        console.error('Error getting current session:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      }
    })

    ipcMain.handle('start-new-session', async (): Promise<IpcResult<{ sessionId: string }>> => {
      try {
        initializeNewSession()
        return { success: true, data: { sessionId: currentSessionId! } }
      } catch (error) {
        console.error('Error starting new session:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      }
    })

    // Settings handlers
    ipcMain.handle(
      'update-google-search-setting',
      async (_, enabled: boolean): Promise<IpcResult> => {
        try {
          console.log('Google Search setting updated to:', enabled)
          // The setting is already saved in localStorage by the renderer
          // This is just for logging/confirmation
          return { success: true }
        } catch (error) {
          console.error('Error updating Google Search setting:', error)
          return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
        }
      }
    )
  }

  // Constructor logic
  initializeNewSession()

  return {
    initializeGeminiSession,
    killExistingSystemAudioDump,
    startMacOSAudioCapture,
    stopMacOSAudioCapture,
    setupIpcHandlers,
  }
}

export const geminiService = createGeminiService()

export type GeminiService = ReturnType<typeof createGeminiService>
