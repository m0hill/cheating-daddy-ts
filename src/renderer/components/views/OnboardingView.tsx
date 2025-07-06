import { useState, useEffect, useRef, useCallback } from 'react';
import type { OnboardingViewProps } from '@shared/types';
import './OnboardingView.css';

// Subtle dark color schemes for each slide
const colorSchemes = [
    // Welcome
    [[25, 25, 35], [20, 20, 30], [30, 25, 40], [15, 15, 25], [35, 30, 45], [10, 10, 20]],
    // Privacy
    [[20, 25, 35], [15, 20, 30], [25, 30, 40], [10, 15, 25], [30, 35, 45], [5, 10, 20]],
    // Context
    [[25, 25, 25], [20, 20, 20], [30, 30, 30], [15, 15, 15], [35, 35, 35], [10, 10, 10]],
    // Features
    [[20, 30, 25], [15, 25, 20], [25, 35, 30], [10, 20, 15], [30, 40, 35], [5, 15, 10]],
    // Complete
    [[30, 25, 20], [25, 20, 15], [35, 30, 25], [20, 15, 10], [40, 35, 30], [15, 10, 5]],
];

export default function OnboardingView({ onComplete, onClose: _onClose }: OnboardingViewProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [contextText, setContextText] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number>();
  const transitionState = useRef({
    isTransitioning: false,
    startTime: 0,
    duration: 800,
    previousColorScheme: null as number[][] | null,
  });

  const slides = [
    { icon: '/assets/onboarding/welcome.svg', title: 'Welcome to Cheating Daddy', content: 'Your AI assistant that listens and watches, then provides intelligent suggestions automatically during interviews and meetings.' },
    { icon: '/assets/onboarding/security.svg', title: 'Completely Private', content: 'Invisible to screen sharing apps and recording software. Your secret advantage stays completely hidden from others.' },
    { icon: '/assets/onboarding/context.svg', title: 'Add Your Context', content: 'Share relevant information to help the AI provide better, more personalized assistance.', showTextarea: true },
    { icon: '/assets/onboarding/customize.svg', title: 'Additional Features', content: '', showFeatures: true },
    { icon: '/assets/onboarding/ready.svg', title: 'Ready to Go', content: 'Add your Gemini API key in settings and start getting AI-powered assistance in real-time.' },
  ];

  const drawGradient = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    let colors = colorSchemes[currentSlide];

    if (transitionState.current.isTransitioning && transitionState.current.previousColorScheme) {
      const elapsed = timestamp - transitionState.current.startTime;
      const progress = Math.min(elapsed / transitionState.current.duration, 1);
      const easedProgress = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      colors = transitionState.current.previousColorScheme.map((color1, index) => {
          const color2 = colorSchemes[currentSlide][index];
          return color1.map((c1, i) => c1 + (color2[i] - c1) * easedProgress);
      });

      if (progress >= 1) {
        transitionState.current.isTransitioning = false;
        transitionState.current.previousColorScheme = null;
      }
    }

    const gradient = ctx.createLinearGradient(0, 0, width, height);
    colors.forEach((color, index) => {
        const offset = index / (colors.length - 1);
        gradient.addColorStop(offset, `rgb(${color[0]}, ${color[1]}, ${color[2]})`);
    });

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    animationFrameId.current = requestAnimationFrame(drawGradient);
  }, [currentSlide]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const handleResize = () => {
        if(canvas) {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
        }
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    animationFrameId.current = requestAnimationFrame(drawGradient);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [drawGradient]);

  const startColorTransition = (newSlide: number) => {
    transitionState.current.previousColorScheme = colorSchemes[currentSlide];
    transitionState.current.isTransitioning = true;
    transitionState.current.startTime = performance.now();
    setCurrentSlide(newSlide);
  };

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      startColorTransition(currentSlide + 1);
    } else {
      if (contextText.trim()) {
        localStorage.setItem('customPrompt', contextText.trim());
      }
      onComplete();
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      startColorTransition(currentSlide - 1);
    }
  };

  const slide = slides[currentSlide];

  return (
    <div className="onboarding-container">
      <canvas ref={canvasRef} className="gradient-canvas"></canvas>
      <div className="content-wrapper">
        <img className="slide-icon" src={slide.icon} alt={`${slide.title} icon`} />
        <div className="slide-title">{slide.title}</div>
        <div className="slide-content">{slide.content}</div>

        {slide.showTextarea && (
          <textarea
            className="context-textarea"
            placeholder="Paste your resume, job description, or any relevant context here..."
            value={contextText}
            onChange={(e) => setContextText(e.target.value)}
          ></textarea>
        )}
        {slide.showFeatures && (
          <div className="feature-list">
            <div className="feature-item"><span className="feature-icon">🎨</span>Customize AI behavior and responses</div>
            <div className="feature-item"><span className="feature-icon">📚</span>Review conversation history</div>
            <div className="feature-item"><span className="feature-icon">🔧</span>Adjust capture settings and intervals</div>
          </div>
        )}
      </div>

      <div className="navigation">
        <button className="nav-button" onClick={prevSlide} disabled={currentSlide === 0}>
          <svg width="16px" height="16px" strokeWidth="2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 6L9 12L15 18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"></path>
          </svg>
        </button>
        <div className="progress-dots">
          {slides.map((_, index) => (
            <div
              key={index}
              className={`dot ${index === currentSlide ? 'active' : ''}`}
              onClick={() => index !== currentSlide && startColorTransition(index)}
            ></div>
          ))}
        </div>
        <button className="nav-button" onClick={nextSlide}>
          {currentSlide === slides.length - 1 ? (
            'Get Started'
          ) : (
            <svg width="16px" height="16px" strokeWidth="2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 6L15 12L9 18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"></path>
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}