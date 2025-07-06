import type { ImageQuality, ScreenshotInterval, AudioSourceType } from '@shared/types'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useIpc } from './index'

declare global {
  interface Window {
    captureManualScreenshot: (imageQuality?: ImageQuality) => Promise<void>
  }
}
interface TokenEntry {
  timestamp: number
  count: number
  type: 'image' | 'audio'
}

interface TokenTracker {
  tokens: TokenEntry[]
  audioStartTime: number | null
}

interface MediaCaptureState {
  isCapturing: boolean
  error: string | null
  currentImageQuality: ImageQuality
  currentAudioSource: AudioSourceType
  microphoneEnabled: boolean
}

export const useMediaCapture = () => {
  const [state, setState] = useState<MediaCaptureState>({
    isCapturing: false,
    error: null,
    currentImageQuality: 'medium',
    currentAudioSource: 'system',
    microphoneEnabled: false,
  })
  const electronAPI = useIpc()
  const mediaStreamRef = useRef<MediaStream | null>(null) // For system audio
  const videoStreamRef = useRef<MediaStream | null>(null) // For screenshots
  const micStreamRef = useRef<MediaStream | null>(null)
  const screenshotIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const micAudioContextRef = useRef<AudioContext | null>(null)
  const audioProcessorRef = useRef<ScriptProcessorNode | null>(null)
  const micProcessorRef = useRef<ScriptProcessorNode | null>(null)
  const hiddenVideoRef = useRef<HTMLVideoElement | null>(null)
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const offscreenContextRef = useRef<CanvasRenderingContext2D | null>(null)

  const tokenTrackerRef = useRef<TokenTracker>({
    tokens: [],
    audioStartTime: null,
  })

  // Add a ref to track the current audio source to avoid stale state in callbacks
  const audioSourceRef = useRef(state.currentAudioSource)

  const isLinux = electronAPI.platform.isLinux
  const isMacOS = electronAPI.platform.isMacOS

  const SAMPLE_RATE = 24000
  const AUDIO_CHUNK_DURATION = 0.1
  const BUFFER_SIZE = 4096

  // Keep the ref in sync with the state
  useEffect(() => {
    audioSourceRef.current = state.currentAudioSource
  }, [state.currentAudioSource])

  // This effect will manage the macOS system audio capture
  useEffect(() => {
    if (!isMacOS || !state.isCapturing) return

    if (state.currentAudioSource === 'system') {
      console.log('IPC: Starting macOS audio capture')
      electronAPI.invoke.startMacOSAudio()
    } else {
      console.log('IPC: Stopping macOS audio capture')
      electronAPI.invoke.stopMacOSAudio()
    }
  }, [isMacOS, state.isCapturing, state.currentAudioSource, electronAPI.invoke])

  const cleanOldTokens = useCallback(() => {
    const oneMinuteAgo = Date.now() - 60 * 1000
    tokenTrackerRef.current.tokens = tokenTrackerRef.current.tokens.filter(
      token => token.timestamp > oneMinuteAgo
    )
  }, [])

  const addTokens = useCallback(
    (count: number, type: 'image' | 'audio' = 'image') => {
      const now = Date.now()
      tokenTrackerRef.current.tokens.push({ timestamp: now, count, type })
      cleanOldTokens()
    },
    [cleanOldTokens]
  )

  const calculateImageTokens = useCallback((width: number, height: number): number => {
    if (width <= 384 && height <= 384) return 258
    const tilesX = Math.ceil(width / 768)
    const tilesY = Math.ceil(height / 768)
    return tilesX * tilesY * 258
  }, [])

  const shouldThrottle = useCallback((): boolean => {
    const throttleEnabled = localStorage.getItem('throttleTokens') === 'true'
    if (!throttleEnabled) return false

    const maxTokensPerMin = parseInt(localStorage.getItem('maxTokensPerMin') || '1000000', 10)
    const throttleAtPercent = parseInt(localStorage.getItem('throttleAtPercent') || '75', 10)

    cleanOldTokens()
    const currentTokens = tokenTrackerRef.current.tokens.reduce(
      (total, token) => total + token.count,
      0
    )
    const throttleThreshold = Math.floor((maxTokensPerMin * throttleAtPercent) / 100)

    console.log(
      `Token check: ${currentTokens}/${maxTokensPerMin} (throttle at ${throttleThreshold})`
    )
    return currentTokens >= throttleThreshold
  }, [cleanOldTokens])

  const convertFloat32ToInt16 = useCallback((float32Array: Float32Array): Int16Array => {
    const int16Array = new Int16Array(float32Array.length)
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]))
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff
    }
    return int16Array
  }, [])

  const arrayBufferToBase64 = useCallback((buffer: ArrayBuffer): string => {
    let binary = ''
    const bytes = new Uint8Array(buffer)
    const len = bytes.byteLength
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }, [])

  const setupMicrophoneProcessing = useCallback(
    async (micStream: MediaStream) => {
      const micAudioContext = new AudioContext({ sampleRate: SAMPLE_RATE })
      const micSource = micAudioContext.createMediaStreamSource(micStream)
      const micProcessor = micAudioContext.createScriptProcessor(BUFFER_SIZE, 1, 1)
      let audioBuffer: number[] = []
      const samplesPerChunk = SAMPLE_RATE * AUDIO_CHUNK_DURATION

      micProcessor.onaudioprocess = async e => {
        // Use the ref here instead of state to avoid stale state
        if (audioSourceRef.current !== 'microphone') return

        const inputData = e.inputBuffer.getChannelData(0)
        audioBuffer.push(...inputData)
        while (audioBuffer.length >= samplesPerChunk) {
          const chunk = audioBuffer.splice(0, samplesPerChunk)
          const pcmData16 = convertFloat32ToInt16(new Float32Array(chunk))
          const base64Data = arrayBufferToBase64(pcmData16.buffer as ArrayBuffer)
          await electronAPI.invoke.sendAudioContent({
            data: base64Data,
            mimeType: 'audio/pcm;rate=24000',
            source: 'microphone',
          })
        }
      }
      micSource.connect(micProcessor)
      micProcessor.connect(micAudioContext.destination)
      micAudioContextRef.current = micAudioContext
      micProcessorRef.current = micProcessor
    },
    [electronAPI.invoke, convertFloat32ToInt16, arrayBufferToBase64]
  )

  const setupSystemAudioProcessing = useCallback(async () => {
    if (!mediaStreamRef.current) return
    const audioContext = new AudioContext({ sampleRate: SAMPLE_RATE })
    const source = audioContext.createMediaStreamSource(mediaStreamRef.current)
    const processor = audioContext.createScriptProcessor(BUFFER_SIZE, 1, 1)
    let audioBuffer: number[] = []
    const samplesPerChunk = SAMPLE_RATE * AUDIO_CHUNK_DURATION

    processor.onaudioprocess = async e => {
      // Use the ref here instead of state to avoid stale state
      if (audioSourceRef.current !== 'system') return

      const inputData = e.inputBuffer.getChannelData(0)
      audioBuffer.push(...inputData)
      while (audioBuffer.length >= samplesPerChunk) {
        const chunk = audioBuffer.splice(0, samplesPerChunk)
        const pcmData16 = convertFloat32ToInt16(new Float32Array(chunk))
        const base64Data = arrayBufferToBase64(pcmData16.buffer as ArrayBuffer)
        await electronAPI.invoke.sendAudioContent({
          data: base64Data,
          mimeType: 'audio/pcm;rate=24000',
          source: 'system',
        })
      }
    }
    source.connect(processor)
    processor.connect(audioContext.destination)
    audioContextRef.current = audioContext
    audioProcessorRef.current = processor
  }, [electronAPI.invoke, convertFloat32ToInt16, arrayBufferToBase64])

  const captureScreenshot = useCallback(
    async (imageQuality: ImageQuality = 'medium', isManual = false): Promise<void> => {
      // Use video stream for screenshots, fallback to media stream
      const streamToUse = videoStreamRef.current || mediaStreamRef.current
      const hasActiveVideoTrack = streamToUse
        ?.getVideoTracks()
        .some(track => track.readyState === 'live')

      if (!streamToUse || !hasActiveVideoTrack) {
        console.warn('Video stream not available or no active video track. Skipping screenshot.')
        return
      }
      console.log(`Capturing ${isManual ? 'manual' : 'automated'} screenshot...`)
      if (!isManual && shouldThrottle()) {
        console.log('⚠️ Automated screenshot skipped due to rate limiting')
        return
      }

      if (!hiddenVideoRef.current) {
        hiddenVideoRef.current = document.createElement('video')
        hiddenVideoRef.current.srcObject = streamToUse
        hiddenVideoRef.current.muted = true
        hiddenVideoRef.current.playsInline = true
        await hiddenVideoRef.current.play()
        await new Promise<void>(resolve => {
          if (hiddenVideoRef.current!.readyState >= 2) return resolve()
          hiddenVideoRef.current!.onloadedmetadata = () => resolve()
        })
        offscreenCanvasRef.current = document.createElement('canvas')
        offscreenCanvasRef.current.width = hiddenVideoRef.current.videoWidth
        offscreenCanvasRef.current.height = hiddenVideoRef.current.videoHeight
        offscreenContextRef.current = offscreenCanvasRef.current.getContext('2d')
      }

      if (
        hiddenVideoRef.current.readyState < 2 ||
        !offscreenContextRef.current ||
        !offscreenCanvasRef.current
      ) {
        console.warn('Video or canvas not ready, skipping screenshot')
        return
      }

      offscreenContextRef.current.drawImage(
        hiddenVideoRef.current,
        0,
        0,
        offscreenCanvasRef.current.width,
        offscreenCanvasRef.current.height
      )
      const qualityValue = imageQuality === 'high' ? 0.9 : imageQuality === 'low' ? 0.5 : 0.7

      offscreenCanvasRef.current.toBlob(
        async blob => {
          if (!blob) return console.error('Failed to create blob from canvas')
          const reader = new FileReader()
          reader.onloadend = async () => {
            const base64data = (reader.result as string).split(',')[1]
            if (!base64data || base64data.length < 100)
              return console.error('Invalid base64 data generated')

            const result = await electronAPI.invoke.sendImageContent({ data: base64data })
            if (result.success) {
              const imageTokens = calculateImageTokens(
                offscreenCanvasRef.current!.width,
                offscreenCanvasRef.current!.height
              )
              addTokens(imageTokens, 'image')
              console.log(`📊 Image sent successfully - ${imageTokens} tokens used`)
            } else {
              console.error('Failed to send image:', result.error)
            }
          }
          reader.readAsDataURL(blob)
        },
        'image/jpeg',
        qualityValue
      )
    },
    [shouldThrottle, electronAPI.invoke, calculateImageTokens, addTokens]
  )

  const stopCapture = useCallback(async () => {
    try {
      if (screenshotIntervalRef.current) {
        clearInterval(screenshotIntervalRef.current)
        screenshotIntervalRef.current = null
      }
      if (audioProcessorRef.current) {
        audioProcessorRef.current.disconnect()
        audioProcessorRef.current = null
      }
      if (micProcessorRef.current) {
        micProcessorRef.current.disconnect()
        micProcessorRef.current = null
      }
      if (audioContextRef.current) {
        await audioContextRef.current.close()
        audioContextRef.current = null
      }
      if (micAudioContextRef.current) {
        await micAudioContextRef.current.close()
        micAudioContextRef.current = null
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop())
        mediaStreamRef.current = null
      }
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach(track => track.stop())
        videoStreamRef.current = null
      }
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(track => track.stop())
        micStreamRef.current = null
      }
      if (isMacOS) {
        await electronAPI.invoke.stopMacOSAudio()
      }
      if (hiddenVideoRef.current) {
        hiddenVideoRef.current.srcObject = null
        hiddenVideoRef.current = null
      }
      offscreenCanvasRef.current = null
      offscreenContextRef.current = null
      setState(prev => ({
        ...prev,
        isCapturing: false,
        error: null,
        currentAudioSource: 'system',
        microphoneEnabled: false,
      }))
      console.log('Media capture stopped')
    } catch (error) {
      console.error('Error stopping capture:', error)
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to stop capture',
      }))
    }
  }, [isMacOS, electronAPI.invoke])

  const sendTextMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return { success: false, error: 'Empty message' }
      return electronAPI.invoke.sendTextMessage(text)
    },
    [electronAPI.invoke]
  )

  const captureManualScreenshot = useCallback(
    async (imageQuality?: ImageQuality) => {
      console.log('Manual screenshot triggered')
      const quality = imageQuality || state.currentImageQuality
      await captureScreenshot(quality, true)
      await new Promise(resolve => setTimeout(resolve, 2000))
      await sendTextMessage(
        `Help me on this page, give me the answer no bs, complete answer.
      So if its a code question, give me the approach in few bullet points, then the entire code. Also if theres anything else i need to know, tell me.
      If its a question about the website, give me the answer no bs, complete answer.
      If its a mcq question, give me the answer no bs, complete answer.`
      )
    },
    [state.currentImageQuality, captureScreenshot, sendTextMessage]
  )

  const toggleAudioSource = useCallback(() => {
    if (!state.microphoneEnabled) {
      console.warn('Microphone not available')
      return
    }

    setState(prev => ({
      ...prev,
      currentAudioSource: prev.currentAudioSource === 'system' ? 'microphone' : 'system',
    }))

    console.log(
      `Switched to ${state.currentAudioSource === 'system' ? 'microphone' : 'system'} audio`
    )
  }, [state.microphoneEnabled, state.currentAudioSource])

  const setAudioSource = useCallback(
    (source: AudioSourceType) => {
      if (source === 'microphone' && !state.microphoneEnabled) {
        console.warn('Microphone not available')
        return
      }

      setState(prev => ({ ...prev, currentAudioSource: source }))
      console.log(`Audio source set to: ${source}`)
    },
    [state.microphoneEnabled]
  )

  const startCapture = useCallback(
    async (
      screenshotIntervalSeconds: ScreenshotInterval = '5',
      imageQuality: ImageQuality = 'medium'
    ) => {
      setState(prev => ({
        ...prev,
        isCapturing: true,
        error: null,
        currentImageQuality: imageQuality,
      }))
      tokenTrackerRef.current = { tokens: [], audioStartTime: null }

      try {
        // First get video stream for screenshots
        const videoDisplayOptions: DisplayMediaStreamOptions = {
          video: { frameRate: 1, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        }

        // Audio options for system audio (Windows only)
        const audioDisplayOptions: DisplayMediaStreamOptions = {
          video: false,
          audio: {
            sampleRate: SAMPLE_RATE,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        }

        // Setup microphone access for all platforms
        try {
          // First check if we have permission (macOS specific)
          if (isMacOS) {
            const permissionCheck = await electronAPI.invoke.checkMicrophonePermission()
            console.log('Microphone permission check:', permissionCheck)

            if (!permissionCheck.granted) {
              console.log('Requesting microphone permission...')
              const permissionGranted = await electronAPI.invoke.requestMicrophonePermission()
              console.log('Microphone permission result:', permissionGranted)

              if (!permissionGranted) {
                console.warn('Microphone permission denied by user')
                setState(prev => ({ ...prev, microphoneEnabled: false }))
                // Don't return here, still try to get video stream
              } else {
                // Permission granted, now try to get microphone stream
                try {
                  const micStream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                      sampleRate: SAMPLE_RATE,
                      channelCount: 1,
                      echoCancellation: true,
                      noiseSuppression: true,
                      autoGainControl: true,
                    },
                    video: false,
                  })
                  micStreamRef.current = micStream
                  await setupMicrophoneProcessing(micStream)
                  setState(prev => ({ ...prev, microphoneEnabled: true }))
                  console.log('Microphone access granted')
                } catch (micStreamError) {
                  console.warn(
                    'Failed to get microphone stream after permission granted:',
                    micStreamError
                  )
                  setState(prev => ({ ...prev, microphoneEnabled: false }))
                }
              }
            } else {
              // Permission already granted, get microphone stream
              const micStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                  sampleRate: SAMPLE_RATE,
                  channelCount: 1,
                  echoCancellation: true,
                  noiseSuppression: true,
                  autoGainControl: true,
                },
                video: false,
              })
              micStreamRef.current = micStream
              await setupMicrophoneProcessing(micStream)
              setState(prev => ({ ...prev, microphoneEnabled: true }))
              console.log('Microphone access granted (permission already granted)')
            }
          } else {
            // Non-macOS platforms - directly try to get microphone access
            const micStream = await navigator.mediaDevices.getUserMedia({
              audio: {
                sampleRate: SAMPLE_RATE,
                channelCount: 1,
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              },
              video: false,
            })
            micStreamRef.current = micStream
            await setupMicrophoneProcessing(micStream)
            setState(prev => ({ ...prev, microphoneEnabled: true }))
            console.log('Microphone access granted')
          }
        } catch (micError) {
          console.warn('Failed to get microphone access:', micError)
          setState(prev => ({ ...prev, microphoneEnabled: false }))
        }

        // Get video stream for screenshots
        videoStreamRef.current = await navigator.mediaDevices.getDisplayMedia(videoDisplayOptions)
        console.log('Video stream for screenshots obtained')

        if (isMacOS) {
          // On macOS, system audio is now handled by the useEffect above.
          // No need to do anything here.
        } else if (isLinux) {
          // Linux uses microphone only, no system audio
        } else {
          // Windows - get separate audio stream for system audio
          try {
            mediaStreamRef.current =
              await navigator.mediaDevices.getDisplayMedia(audioDisplayOptions)
            if (mediaStreamRef.current.getAudioTracks().length > 0) {
              await setupSystemAudioProcessing()
              console.log('System audio stream obtained')
            }
          } catch (audioError) {
            console.warn('Failed to get system audio stream:', audioError)
          }
        }

        if (screenshotIntervalSeconds !== 'manual') {
          const intervalMs = parseInt(screenshotIntervalSeconds) * 1000
          console.log(
            `Setting up screenshot interval: ${screenshotIntervalSeconds}s (${intervalMs}ms)`
          )

          // Clear any existing interval first
          if (screenshotIntervalRef.current) {
            clearInterval(screenshotIntervalRef.current)
            screenshotIntervalRef.current = null
          }

          screenshotIntervalRef.current = setInterval(
            () => captureScreenshot(imageQuality),
            intervalMs
          )
          setTimeout(() => captureScreenshot(imageQuality), 100)
        }
      } catch (error) {
        console.error('Error starting capture:', error)
        setState(prev => ({
          ...prev,
          isCapturing: false,
          error: error instanceof Error ? error.message : String(error),
        }))
        await stopCapture()
      }
    },
    [
      isMacOS,
      isLinux,
      electronAPI.invoke,
      setupMicrophoneProcessing,
      setupSystemAudioProcessing,
      captureScreenshot,
      stopCapture,
    ]
  )

  useEffect(() => {
    window.captureManualScreenshot = captureManualScreenshot
    window.toggleAudioSource = toggleAudioSource
    console.log(
      'captureManualScreenshot and toggleAudioSource functions have been attached to the window object.'
    )

    // Cleanup function to remove it when the component unmounts
    return () => {
      delete (window as Partial<Window>).captureManualScreenshot
      delete (window as Partial<Window>).toggleAudioSource
      console.log(
        'captureManualScreenshot and toggleAudioSource functions have been removed from the window object.'
      )
    }
  }, [captureManualScreenshot, toggleAudioSource])

  // Cleanup on unmount
  useEffect(() => {
    // This is the cleanup function for the effect.
    // It must be a synchronous function.
    return () => {
      // We call the async stopCapture but do not return the promise it generates.
      void stopCapture()
    }
  }, [stopCapture])

  return {
    ...state,
    startCapture,
    stopCapture,
    captureManualScreenshot,
    sendTextMessage,
    toggleAudioSource,
    setAudioSource,
    // Expose platform info for conditional rendering
    platform: {
      isMacOS,
      isLinux,
      isWindows: electronAPI.platform.isWindows,
    },
  }
}
