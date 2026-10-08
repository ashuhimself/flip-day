// A soft two-note bell, synthesized so no audio file ships with the app.

let ctx: AudioContext | null = null

/** Create/resume the audio context. Call from a user gesture (e.g. Start). */
export function primeAudio() {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
  } catch {
    // Web Audio unavailable — the timer still works silently.
  }
}

export function playChime() {
  if (!ctx) return
  const start = ctx.currentTime + 0.02
  const notes: [number, number][] = [
    [880, 0],
    [1318.5, 0.22],
    [880, 0.9],
    [1318.5, 1.12],
  ]
  for (const [freq, offset] of notes) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const t = start + offset
    osc.type = 'sine'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(0.18, t + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.2)
    osc.connect(gain).connect(ctx.destination)
    osc.start(t)
    osc.stop(t + 1.25)
  }
}
