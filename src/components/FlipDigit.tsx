import { memo, useState } from 'react'

interface FlipDigitProps {
  value: string
  reducedMotion: boolean
}

/**
 * One split-flap card. A change is drawn with four layers:
 *   static top    → new value (revealed as the top flap falls away)
 *   static bottom → old value (covered as the bottom flap lands)
 *   top flap      → old value, rotates 0° → -90° around the center line
 *   bottom flap   → new value, rotates 90° → 0° after the top flap finishes
 */
function FlipDigit({ value, reducedMotion }: FlipDigitProps) {
  const [flip, setFlip] = useState({ current: value, previous: value, id: 0 })

  if (flip.current !== value) {
    setFlip({ current: value, previous: reducedMotion ? value : flip.current, id: flip.id + 1 })
  }

  const { current, previous, id } = flip
  const flipping = previous !== current
  const settle = () => setFlip((f) => ({ ...f, previous: f.current }))

  if (reducedMotion) {
    return (
      <div className="flip-card" aria-hidden="true">
        <span key={current} className="flip-fade">
          <Half position="top" value={current} />
          <Half position="bottom" value={current} />
        </span>
      </div>
    )
  }

  return (
    <div className="flip-card" aria-hidden="true">
      <Half position="top" value={current} />
      <Half position="bottom" value={previous} />
      {flipping && (
        <>
          <Half key={`t${id}`} position="top" value={previous} flap />
          <Half key={`b${id}`} position="bottom" value={current} flap onAnimationEnd={settle} />
        </>
      )}
    </div>
  )
}

interface HalfProps {
  position: 'top' | 'bottom'
  value: string
  flap?: boolean
  onAnimationEnd?: () => void
}

function Half({ position, value, flap, onAnimationEnd }: HalfProps) {
  return (
    <div
      className={`flip-half flip-half--${position}${flap ? ' flip-flap' : ''}`}
      onAnimationEnd={onAnimationEnd ? (e) => e.target === e.currentTarget && onAnimationEnd() : undefined}
    >
      <span className="flip-glyph">{value}</span>
    </div>
  )
}

export default memo(FlipDigit)
