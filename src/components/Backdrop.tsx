import { useEffect, useRef } from 'react'
import { usePrefersReducedMotion } from '../hooks/useMediaQuery'
import type { Backdrop as BackdropVariant } from '../hooks/useSettings'
import type { Theme } from '../hooks/useTheme'

interface BackdropProps {
  variant: BackdropVariant
  theme: Theme
  /** Tints the aurora while a Pomodoro session runs. */
  mood?: 'focus' | 'break'
}

/**
 * Slow ambient motion behind the clock. Fixed, non-interactive and painted
 * under everything else, so it never affects layout.
 */
export default function Backdrop({ variant, theme, mood }: BackdropProps) {
  const reducedMotion = usePrefersReducedMotion()
  if (variant === 'off') return null

  return (
    <div className="backdrop" data-variant={variant} data-mood={mood} aria-hidden="true">
      {variant === 'aurora' && (
        <div className="aurora">
          <span />
          <span />
          <span />
          <span />
        </div>
      )}
      {variant === 'particles' && !reducedMotion && <Particles theme={theme} />}
      <div className="backdrop__vignette" />
      <div className="backdrop__grain" />
    </div>
  )
}

interface Particle {
  x: number
  y: number
  r: number
  /** 0 (far) – 1 (near): size, speed, brightness and parallax all scale with it. */
  z: number
  speed: number
  phase: number
}

function Particles({ theme }: { theme: Theme }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    // Space-separated channels from the theme, e.g. "236 233 228".
    const rgb = getComputedStyle(canvas).getPropertyValue('--particle-rgb').trim() || '236 233 228'
    let width = 0
    let height = 0
    let particles: Particle[] = []

    const spawn = (y?: number): Particle => {
      const z = Math.random()
      return {
        x: Math.random() * width,
        y: y ?? Math.random() * height,
        r: 0.5 + z * 1.6,
        z,
        speed: 6 + z * 22, // px per second, upward
        phase: Math.random() * Math.PI * 2,
      }
    }

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const count = Math.min(110, Math.round((width * height) / 16000))
      particles = Array.from({ length: count }, () => spawn())
    }

    // Gentle parallax toward the pointer, eased so it never jumps.
    const pointer = { x: 0, y: 0 }
    const eased = { x: 0, y: 0 }
    const onPointerMove = (e: PointerEvent) => {
      pointer.x = e.clientX / width - 0.5
      pointer.y = e.clientY / height - 0.5
    }

    let frame = 0
    let last = performance.now()
    // requestAnimationFrame stops by itself while the tab is hidden.
    const draw = (t: number) => {
      const dt = Math.min((t - last) / 1000, 0.1)
      last = t
      eased.x += (pointer.x - eased.x) * 0.04
      eased.y += (pointer.y - eased.y) * 0.04

      ctx.clearRect(0, 0, width, height)
      for (const p of particles) {
        p.y -= p.speed * dt
        p.phase += dt * (0.4 + p.z * 0.6)
        if (p.y < -10) Object.assign(p, spawn(height + 10))

        const x = p.x + Math.sin(p.phase) * (6 + p.z * 10) - eased.x * p.z * 40
        const y = p.y - eased.y * p.z * 40
        // Fade in from the bottom and out toward the top; twinkle a little.
        const edge = Math.min(1, p.y / (height * 0.15), (height - p.y) / (height * 0.15))
        const alpha = Math.max(0, edge) * (0.18 + p.z * 0.5) * (0.75 + Math.sin(p.phase * 2.3) * 0.25)

        ctx.beginPath()
        ctx.arc(x, y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgb(${rgb} / ${alpha.toFixed(3)})`
        ctx.fill()
      }
      frame = requestAnimationFrame(draw)
    }

    resize()
    frame = requestAnimationFrame(draw)
    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onPointerMove)
    }
  }, [theme])

  return <canvas ref={canvasRef} className="particles" />
}
