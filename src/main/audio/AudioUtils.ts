import { writeFileSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'

interface AudioAnalysis {
  minValue: number
  maxValue: number
  avgValue: number
  rmsValue: number
  silencePercentage: number
  sampleCount: number
}

/**
 * Convert raw PCM to WAV format for easier playback and verification
 */
export const pcmToWav = (
  pcmBuffer: Buffer,
  outputPath: string,
  sampleRate = 24000,
  channels = 1,
  bitDepth = 16
): string => {
  const byteRate = sampleRate * channels * (bitDepth / 8)
  const blockAlign = channels * (bitDepth / 8)
  const dataSize = pcmBuffer.length

  // Create WAV header
  const header = Buffer.alloc(44)

  // "RIFF" chunk descriptor
  header.write('RIFF', 0)
  header.writeUInt32LE(dataSize + 36, 4) // File size - 8
  header.write('WAVE', 8)

  // "fmt " sub-chunk
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16) // Subchunk1Size (16 for PCM)
  header.writeUInt16LE(1, 20) // AudioFormat (1 for PCM)
  header.writeUInt16LE(channels, 22) // NumChannels
  header.writeUInt32LE(sampleRate, 24) // SampleRate
  header.writeUInt32LE(byteRate, 28) // ByteRate
  header.writeUInt16LE(blockAlign, 32) // BlockAlign
  header.writeUInt16LE(bitDepth, 34) // BitsPerSample

  // "data" sub-chunk
  header.write('data', 36)
  header.writeUInt32LE(dataSize, 40) // Subchunk2Size

  // Combine header and PCM data
  const wavBuffer = Buffer.concat([header, pcmBuffer])

  // Write to file
  writeFileSync(outputPath, wavBuffer)

  return outputPath
}

/**
 * Analyze audio buffer for debugging
 */
export const analyzeAudioBuffer = (buffer: Buffer, label = 'Audio'): AudioAnalysis => {
  const int16Array = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.length / 2)

  let minValue = 32767
  let maxValue = -32768
  let avgValue = 0
  let rmsValue = 0
  let silentSamples = 0

  for (let i = 0; i < int16Array.length; i++) {
    const sample = int16Array[i]
    minValue = Math.min(minValue, sample)
    maxValue = Math.max(maxValue, sample)
    avgValue += sample
    rmsValue += sample * sample

    if (Math.abs(sample) < 100) {
      silentSamples++
    }
  }

  avgValue /= int16Array.length
  rmsValue = Math.sqrt(rmsValue / int16Array.length)

  const silencePercentage = (silentSamples / int16Array.length) * 100

  console.log(`${label} Analysis:`)
  console.log(`  Samples: ${int16Array.length}`)
  console.log(`  Min: ${minValue}, Max: ${maxValue}`)
  console.log(`  Average: ${avgValue.toFixed(2)}`)
  console.log(`  RMS: ${rmsValue.toFixed(2)}`)
  console.log(`  Silence: ${silencePercentage.toFixed(1)}%`)
  console.log(`  Dynamic Range: ${20 * Math.log10(maxValue / (rmsValue || 1))} dB`)

  return {
    minValue,
    maxValue,
    avgValue,
    rmsValue,
    silencePercentage,
    sampleCount: int16Array.length,
  }
}

/**
 * Save audio buffer with metadata for debugging
 */
export const saveDebugAudio = (
  buffer: Buffer,
  type: string,
  timestamp = Date.now()
): {
  pcmPath: string
  wavPath: string
  metaPath: string
} => {
  const homeDir = homedir()
  const debugDir = join(homeDir, 'cheddar', 'debug')

  // Ensure debug directory exists
  const { mkdirSync, existsSync } = require('fs')
  if (!existsSync(debugDir)) {
    mkdirSync(debugDir, { recursive: true })
  }

  const pcmPath = join(debugDir, `${type}_${timestamp}.pcm`)
  const wavPath = join(debugDir, `${type}_${timestamp}.wav`)
  const metaPath = join(debugDir, `${type}_${timestamp}.json`)

  // Save raw PCM
  writeFileSync(pcmPath, buffer)

  // Convert to WAV for easy playback
  pcmToWav(buffer, wavPath)

  // Analyze and save metadata
  const analysis = analyzeAudioBuffer(buffer, type)
  writeFileSync(
    metaPath,
    JSON.stringify(
      {
        timestamp,
        type,
        bufferSize: buffer.length,
        analysis,
        format: {
          sampleRate: 24000,
          channels: 1,
          bitDepth: 16,
        },
      },
      null,
      2
    )
  )

  console.log(`Debug audio saved: ${wavPath}`)

  return { pcmPath, wavPath, metaPath }
}
