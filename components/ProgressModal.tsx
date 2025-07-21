"use client"

import { useState, useEffect, useRef } from "react"
import { X, Sparkles, CheckCircle, Loader2 } from "lucide-react"

interface ProgressModalProps {
  isOpen: boolean
  progress: {
    stage: "analyzing" | "structuring" | "designing" | "enhancing" | "complete"
    progress: number
    message: string
    currentSlide?: string
    totalSlides?: number
    estimatedTime?: number
  } | null
  onClose: () => void
  onCancel?: () => void
}

interface Particle {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
  size: number
}

export function ProgressModal({ isOpen, progress, onClose, onCancel }: ProgressModalProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [particles, setParticles] = useState<Particle[]>([])
  const [soundEnabled, setSoundEnabled] = useState(true)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const audioContextRef = useRef<AudioContext>()

  // SlydPRO brand colors
  const brandColors = {
    primary: "#027659",
    primaryLight: "#10b981",
    primaryDark: "#065f46",
    accent: "#34d399",
    success: "#059669",
    warning: "#f59e0b",
    error: "#ef4444",
  }

  const stageConfig = {
    analyzing: {
      icon: "🔍",
      title: "Analyzing Content",
      color: "from-blue-500 to-blue-600",
      brandColor: "from-blue-500 to-cyan-500",
      description: "Understanding your requirements and extracting key insights",
    },
    structuring: {
      icon: "📋",
      title: "Structuring Presentation",
      color: "from-purple-500 to-purple-600",
      brandColor: `from-[${brandColors.primary}] to-[${brandColors.primaryLight}]`,
      description: "Organizing content flow and creating slide hierarchy",
    },
    designing: {
      icon: "🎨",
      title: "Designing Slides",
      color: "from-pink-500 to-pink-600",
      brandColor: `from-[${brandColors.primaryLight}] to-[${brandColors.accent}]`,
      description: "Applying professional design and visual elements",
    },
    enhancing: {
      icon: "✨",
      title: "Enhancing Quality",
      color: "from-green-500 to-green-600",
      brandColor: `from-[${brandColors.accent}] to-[${brandColors.success}]`,
      description: "Adding final touches and optimizations",
    },
    complete: {
      icon: "🎉",
      title: "Complete!",
      color: "from-emerald-500 to-emerald-600",
      brandColor: `from-[${brandColors.success}] to-[${brandColors.primary}]`,
      description: "Your presentation is ready!",
    },
  }

  // Sound effects using Web Audio API
  const playSound = (type: "progress" | "complete" | "error") => {
    if (!soundEnabled || !audioContextRef.current) return

    const ctx = audioContextRef.current
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    switch (type) {
      case "progress":
        oscillator.frequency.setValueAtTime(800, ctx.currentTime)
        oscillator.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1)
        gainNode.gain.setValueAtTime(0.1, ctx.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1)
        break
      case "complete":
        // Success chime
        oscillator.frequency.setValueAtTime(523.25, ctx.currentTime) // C5
        oscillator.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1) // E5
        oscillator.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2) // G5
        gainNode.gain.setValueAtTime(0.2, ctx.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4)
        break
      case "error":
        oscillator.frequency.setValueAtTime(200, ctx.currentTime)
        oscillator.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3)
        gainNode.gain.setValueAtTime(0.1, ctx.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
        break
    }

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.4)
  }

  // Initialize audio context
  useEffect(() => {
    if (typeof window !== "undefined") {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
  }, [])

  // Handle modal visibility
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // Handle completion celebration
  useEffect(() => {
    if (progress?.stage === "complete" && progress.progress === 100) {
      setShowCelebration(true)
      playSound("complete")
      createCelebrationParticles()

      const timer = setTimeout(() => {
        setShowCelebration(false)
        setParticles([])
      }, 3000)

      return () => clearTimeout(timer)
    }
  }, [progress?.stage, progress?.progress])

  // Create celebration particles
  const createCelebrationParticles = () => {
    const newParticles: Particle[] = []
    const colors = [brandColors.primary, brandColors.primaryLight, brandColors.accent, brandColors.success]

    for (let i = 0; i < 50; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 400,
        y: Math.random() * 300,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        life: 0,
        maxLife: 60 + Math.random() * 60,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 2 + Math.random() * 4,
      })
    }
    setParticles(newParticles)
  }

  // Animate particles
  useEffect(() => {
    if (particles.length === 0) return

    const animate = () => {
      setParticles((prev) =>
        prev
          .map((particle) => ({
            ...particle,
            x: particle.x + particle.vx,
            y: particle.y + particle.vy,
            vx: particle.vx * 0.99,
            vy: particle.vy * 0.99 + 0.1,
            life: particle.life + 1,
          }))
          .filter((particle) => particle.life < particle.maxLife),
      )

      if (particles.length > 0) {
        animationRef.current = requestAnimationFrame(animate)
      }
    }

    animationRef.current = requestAnimationFrame(animate)
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [particles.length])

  // Render particles on canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || particles.length === 0) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    particles.forEach((particle) => {
      const alpha = 1 - particle.life / particle.maxLife
      ctx.globalAlpha = alpha
      ctx.fillStyle = particle.color
      ctx.beginPath()
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
      ctx.fill()
    })
  }, [particles])

  if (!isVisible || !progress) return null

  const currentStage = stageConfig[progress.stage]
  const progressPercentage = Math.min(progress.progress, 100)

  return (
    <>
      <style jsx>{`
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        
        @keyframes modalSlideOut {
          from {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
          to {
            opacity: 0;
            transform: scale(0.9) translateY(20px);
          }
        }
        
        @keyframes progressPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        
        @keyframes sparkle {
          0%, 100% { opacity: 0; transform: scale(0) rotate(0deg); }
          50% { opacity: 1; transform: scale(1) rotate(180deg); }
        }
        
        @keyframes bounce {
          0%, 20%, 53%, 80%, 100% { transform: translate3d(0,0,0); }
          40%, 43% { transform: translate3d(0, -8px, 0); }
          70% { transform: translate3d(0, -4px, 0); }
          90% { transform: translate3d(0, -2px, 0); }
        }
        
        @keyframes ripple {
          0% { transform: scale(0); opacity: 1; }
          100% { transform: scale(4); opacity: 0; }
        }
        
        .modal-enter {
          animation: modalSlideIn 0.3s ease-out forwards;
        }
        
        .modal-exit {
          animation: modalSlideOut 0.3s ease-in forwards;
        }
        
        .progress-pulse {
          animation: progressPulse 2s ease-in-out infinite;
        }
        
        .sparkle {
          animation: sparkle 1.5s ease-in-out infinite;
        }
        
        .bounce {
          animation: bounce 1s ease-in-out infinite;
        }
        
        .ripple {
          animation: ripple 0.6s linear infinite;
        }
      `}</style>

      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      >
        {/* Modal Container */}
        <div
          className={`relative bg-white dark:bg-gray-900 rounded-3xl p-8 max-w-lg w-full mx-4 shadow-2xl border border-gray-200 dark:border-gray-700 ${
            isOpen ? "modal-enter" : "modal-exit"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Celebration Canvas */}
          {showCelebration && (
            <canvas
              ref={canvasRef}
              width={400}
              height={300}
              className="absolute inset-0 pointer-events-none z-10"
              style={{ borderRadius: "1.5rem" }}
            />
          )}

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 z-20"
            aria-label="Close modal"
          >
            <X size={20} className="text-gray-500 dark:text-gray-400" />
          </button>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="absolute top-4 left-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 z-20"
            aria-label="Toggle sound"
          >
            <span className="text-sm">{soundEnabled ? "🔊" : "🔇"}</span>
          </button>

          <div className="text-center relative z-10">
            {/* SlydPRO Logo */}
            <div className="mb-6">
              <div
                className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center shadow-lg relative overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${brandColors.primary} 0%, ${brandColors.primaryLight} 100%)`,
                }}
              >
                {/* Animated background ripples */}
                <div className="absolute inset-0">
                  <div
                    className="absolute inset-0 rounded-2xl ripple"
                    style={{
                      background: `radial-gradient(circle, ${brandColors.accent}40 0%, transparent 70%)`,
                    }}
                  />
                </div>

                {/* Logo content */}
                <div className="relative z-10">
                  {progress.stage === "complete" ? (
                    <CheckCircle size={32} className="text-white bounce" />
                  ) : (
                    <div className="flex items-center justify-center">
                      <span className="text-3xl progress-pulse">{currentStage.icon}</span>
                      {progress.stage !== "complete" && (
                        <Loader2 size={16} className="text-white/60 animate-spin ml-2" />
                      )}
                    </div>
                  )}
                </div>

                {/* Sparkle effects */}
                {progress.stage === "complete" && (
                  <>
                    <Sparkles
                      size={16}
                      className="absolute top-2 right-2 text-white sparkle"
                      style={{ animationDelay: "0s" }}
                    />
                    <Sparkles
                      size={12}
                      className="absolute bottom-2 left-2 text-white sparkle"
                      style={{ animationDelay: "0.5s" }}
                    />
                    <Sparkles
                      size={14}
                      className="absolute top-2 left-2 text-white sparkle"
                      style={{ animationDelay: "1s" }}
                    />
                  </>
                )}
              </div>
            </div>

            {/* Stage Title */}
            <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">{currentStage.title}</h2>

            {/* Stage Description */}
            <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">{currentStage.description}</p>

            {/* Progress Message */}
            <div className="mb-8">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">{progress.message}</p>

              {/* Multi-layer Progress Bar */}
              <div className="relative">
                {/* Background track */}
                <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  {/* Animated background */}
                  <div
                    className="absolute inset-0 opacity-20"
                    style={{
                      background: `linear-gradient(90deg, transparent 0%, ${brandColors.primaryLight} 50%, transparent 100%)`,
                      animation: "shimmer 2s ease-in-out infinite",
                    }}
                  />

                  {/* Main progress bar */}
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out relative overflow-hidden"
                    style={{
                      width: `${progressPercentage}%`,
                      background: `linear-gradient(90deg, ${brandColors.primary} 0%, ${brandColors.primaryLight} 50%, ${brandColors.accent} 100%)`,
                      boxShadow: `0 0 20px ${brandColors.primaryLight}40`,
                    }}
                  >
                    {/* Animated shine effect */}
                    <div
                      className="absolute inset-0 opacity-60"
                      style={{
                        background:
                          "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)",
                        animation: "shine 2s ease-in-out infinite",
                      }}
                    />
                  </div>
                </div>

                {/* Progress percentage */}
                <div className="flex justify-between items-center mt-3">
                  <span className="text-sm font-semibold" style={{ color: brandColors.primary }}>
                    {progressPercentage}%
                  </span>
                  {progress.estimatedTime && progress.stage !== "complete" && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      ~{progress.estimatedTime}s remaining
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Slide Counter */}
            {progress.currentSlide && progress.totalSlides && (
              <div className="mb-6">
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <span>Creating slide</span>
                  <span
                    className="font-bold px-2 py-1 rounded-lg text-white"
                    style={{ backgroundColor: brandColors.primary }}
                  >
                    {progress.currentSlide}
                  </span>
                  <span>of</span>
                  <span className="font-semibold">{progress.totalSlides}</span>
                </div>

                {/* Mini progress indicators for slides */}
                <div className="flex justify-center space-x-1 mt-3">
                  {Array.from({ length: Number.parseInt(progress.totalSlides) }, (_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        i < Number.parseInt(progress.currentSlide)
                          ? "scale-110"
                          : i === Number.parseInt(progress.currentSlide) - 1
                            ? "scale-125 animate-pulse"
                            : "scale-100"
                      }`}
                      style={{
                        backgroundColor:
                          i < Number.parseInt(progress.currentSlide)
                            ? brandColors.success
                            : i === Number.parseInt(progress.currentSlide) - 1
                              ? brandColors.primaryLight
                              : "#e5e7eb",
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-center space-x-4">
              {progress.stage === "complete" ? (
                <button
                  onClick={onClose}
                  className="px-8 py-3 rounded-xl font-semibold text-white transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg"
                  style={{
                    background: `linear-gradient(135deg, ${brandColors.success} 0%, ${brandColors.primary} 100%)`,
                    boxShadow: `0 10px 25px ${brandColors.success}30`,
                  }}
                >
                  View Presentation
                </button>
              ) : (
                <>
                  {onCancel && (
                    <button
                      onClick={onCancel}
                      className="px-6 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm font-medium transition-colors duration-200"
                    >
                      Cancel
                    </button>
                  )}
                </>
              )}
            </div>

            {/* SlydPRO Branding */}
            <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                <div
                  className="w-4 h-4 rounded flex items-center justify-center"
                  style={{ backgroundColor: brandColors.primary }}
                >
                  <span className="text-white text-xs font-bold">S</span>
                </div>
                <span>Powered by SlydPRO</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Additional CSS for animations */}
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        @keyframes shine {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </>
  )
}

export default ProgressModal
