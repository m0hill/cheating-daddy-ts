import type { OnboardingViewProps } from '@shared/types'
import clsx from 'clsx'
import { ArrowLeft, ArrowRight, CheckCircle, FileText, Heart, Settings, Shield } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

// Subtle dark color schemes for each slide
const colorSchemes = [
  // Welcome
  [
    [25, 25, 35],
    [20, 20, 30],
    [30, 25, 40],
    [15, 15, 25],
    [35, 30, 45],
    [10, 10, 20],
  ],
  // Privacy
  [
    [20, 25, 35],
    [15, 20, 30],
    [25, 30, 40],
    [10, 15, 25],
    [30, 35, 45],
    [5, 10, 20],
  ],
  // Context
  [
    [25, 25, 25],
    [20, 20, 20],
    [30, 30, 30],
    [15, 15, 15],
    [35, 35, 35],
    [10, 10, 10],
  ],
  // Features
  [
    [20, 30, 25],
    [15, 25, 20],
    [25, 35, 30],
    [10, 20, 15],
    [30, 40, 35],
    [5, 15, 10],
  ],
  // Complete
  [
    [30, 25, 20],
    [25, 20, 15],
    [35, 30, 25],
    [20, 15, 10],
    [40, 35, 30],
    [15, 10, 5],
  ],
]

export default function OnboardingView({ onComplete, onClose: _onClose }: OnboardingViewProps) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [contextText, setContextText] = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameId = useRef<number>()
  const transitionState = useRef({
    isTransitioning: false,
    startTime: 0,
    duration: 800,
    previousColorScheme: null as number[][] | null,
  })

  const slides = [
    {
      icon: Heart,
      title: 'Welcome to HOPE',
      content:
        'Your AI assistant that listens and watches, then provides intelligent suggestions automatically during interviews and meetings.',
    },
    {
      icon: Shield,
      title: 'Completely Private',
      content:
        'Invisible to screen sharing apps and recording software. Your secret advantage stays completely hidden from others.',
    },
    {
      icon: FileText,
      title: 'Add Your Context',
      content:
        'Share relevant information to help the AI provide better, more personalized assistance.',
      showTextarea: true,
    },
    {
      icon: Settings,
      title: 'Additional Features',
      content: '',
      showFeatures: true,
    },
    {
      icon: CheckCircle,
      title: 'Ready to Go',
      content:
        'Add your Gemini API key in settings and start getting AI-powered assistance in real-time.',
    },
  ]

  const drawGradient = useCallback(
    (timestamp: number) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const { width, height } = canvas
      let colors = colorSchemes[currentSlide]

      if (transitionState.current.isTransitioning && transitionState.current.previousColorScheme) {
        const elapsed = timestamp - transitionState.current.startTime
        const progress = Math.min(elapsed / transitionState.current.duration, 1)
        const easedProgress =
          progress < 0.5
            ? 4 * progress * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 3) / 2

        colors = transitionState.current.previousColorScheme.map((color1, index) => {
          const color2 = colorSchemes[currentSlide][index]
          return color1.map((c1, i) => c1 + (color2[i] - c1) * easedProgress)
        })

        if (progress >= 1) {
          transitionState.current.isTransitioning = false
          transitionState.current.previousColorScheme = null
        }
      }

      const gradient = ctx.createLinearGradient(0, 0, width, height)
      colors.forEach((color, index) => {
        const offset = index / (colors.length - 1)
        gradient.addColorStop(offset, `rgb(${color[0]}, ${color[1]}, ${color[2]})`)
      })

      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, width, height)
      animationFrameId.current = requestAnimationFrame(drawGradient)
    },
    [currentSlide]
  )

  useEffect(() => {
    const canvas = canvasRef.current
    const handleResize = () => {
      if (canvas) {
        canvas.width = canvas.offsetWidth
        canvas.height = canvas.offsetHeight
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)

    animationFrameId.current = requestAnimationFrame(drawGradient)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current)
      }
    }
  }, [drawGradient])

  const startColorTransition = (newSlide: number) => {
    transitionState.current.previousColorScheme = colorSchemes[currentSlide]
    transitionState.current.isTransitioning = true
    transitionState.current.startTime = performance.now()
    setCurrentSlide(newSlide)
  }

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      startColorTransition(currentSlide + 1)
    } else {
      if (contextText.trim()) {
        localStorage.setItem('customPrompt', contextText.trim())
      }
      onComplete()
    }
  }

  const prevSlide = () => {
    if (currentSlide > 0) {
      startColorTransition(currentSlide - 1)
    }
  }

  const slide = slides[currentSlide]
  const IconComponent = slide.icon
  const navButtonClasses =
    'flex items-center justify-center min-w-9 min-h-9 rounded-md border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.08)] px-4 py-2 text-sm font-medium text-[#e5e5e5] transition-all duration-200 ease-in-out hover:border-[rgba(255,255,255,0.2)] hover:bg-[rgba(255,255,255,0.12)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer'

  return (
    <div className="relative h-full w-full select-none overflow-hidden bg-[#0a0a0a] font-sans">
      <canvas ref={canvasRef} className="absolute inset-0 z-0 h-full w-full"></canvas>
      <div className="absolute inset-x-0 top-0 bottom-[60px] z-10 mx-auto flex max-w-lg flex-col justify-center overflow-hidden p-12 text-[#e5e5e5]">
        <div className="mb-4 opacity-90">
          <IconComponent size={48} strokeWidth={1.5} className="text-white" />
        </div>
        <div className="mb-3 text-3xl font-semibold leading-tight text-white">{slide.title}</div>
        <div className="mb-6 text-base font-normal leading-normal text-[#b8b8b8]">
          {slide.content}
        </div>

        {slide.showTextarea && (
          <textarea
            className="mb-6 h-28 w-full resize-y rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.05)] p-4 text-sm text-[#e5e5e5] transition-all duration-200 ease-in-out placeholder:text-sm placeholder:text-[rgba(255,255,255,0.4)] focus:border-[rgba(255,255,255,0.2)] focus:bg-[rgba(255,255,255,0.08)] focus:outline-none"
            placeholder="Paste your resume, job description, or any relevant context here..."
            value={contextText}
            onChange={e => setContextText(e.target.value)}
          ></textarea>
        )}
        {slide.showFeatures && (
          <div className="max-w-full">
            <div className="mb-3 flex items-center text-[15px] text-[#b8b8b8]">
              <span className="mr-3 text-base opacity-80">🎨</span>Customize AI behavior and
              responses
            </div>
            <div className="mb-3 flex items-center text-[15px] text-[#b8b8b8]">
              <span className="mr-3 text-base opacity-80">📚</span>Review conversation history
            </div>
            <div className="mb-3 flex items-center text-[15px] text-[#b8b8b8]">
              <span className="mr-3 text-base opacity-80">🔧</span>Adjust capture settings and
              intervals
            </div>
          </div>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 z-20 box-border flex h-[60px] items-center justify-between border-t border-[rgba(255,255,255,0.05)] bg-[rgba(0,0,0,0.3)] px-6 backdrop-blur-md">
        <button className={navButtonClasses} onClick={prevSlide} disabled={currentSlide === 0}>
          <ArrowLeft size={16} strokeWidth={2} />
        </button>
        <div className="flex items-center gap-3">
          {slides.map((_, index) => (
            <div
              key={index}
              className={clsx(
                'h-2 w-2 cursor-pointer rounded-full bg-[rgba(255,255,255,0.2)] transition-all duration-200 ease-in-out hover:bg-[rgba(255,255,255,0.4)]',
                {
                  'scale-125 bg-[rgba(255,255,255,0.8)]': index === currentSlide,
                }
              )}
              onClick={() => index !== currentSlide && startColorTransition(index)}
            ></div>
          ))}
        </div>
        <button className={navButtonClasses} onClick={nextSlide}>
          {currentSlide === slides.length - 1 ? (
            'Get Started'
          ) : (
            <ArrowRight size={16} strokeWidth={2} />
          )}
        </button>
      </div>
    </div>
  )
}
