// YouTube link parsing and a lazy loader for the official IFrame Player API.

const VIDEO_ID = /^[\w-]{11}$/

/**
 * Video id from a youtube.com/watch?v=… or youtu.be/… link, or null for
 * anything else. The scheme is optional ("youtu.be/abc…" works).
 */
export function parseYouTubeId(input: string): string | null {
  const raw = input.trim()
  if (!raw) return null

  let url: URL
  try {
    url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`)
  } catch {
    return null
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null

  const host = url.hostname.toLowerCase().replace(/^(www|m|music)\./, '')
  let id: string | null = null
  if (host === 'youtu.be') id = url.pathname.split('/')[1] ?? null
  else if (host === 'youtube.com' && url.pathname.replace(/\/$/, '') === '/watch') id = url.searchParams.get('v')

  return id && VIDEO_ID.test(id) ? id : null
}

// Just the slice of the IFrame API this app uses.
export interface YTPlayer {
  playVideo(): void
  pauseVideo(): void
  seekTo(seconds: number, allowSeekAhead: boolean): void
  loadVideoById(videoId: string): void
  setVolume(volume: number): void
  getVideoData(): { title?: string }
  destroy(): void
}

interface YTPlayerEvent {
  target: YTPlayer
  data: number
}

export interface YTNamespace {
  Player: new (
    element: HTMLElement,
    options: {
      width?: string | number
      height?: string | number
      videoId?: string
      playerVars?: Record<string, string | number>
      events?: {
        onReady?: (e: YTPlayerEvent) => void
        onStateChange?: (e: YTPlayerEvent) => void
        onError?: (e: YTPlayerEvent) => void
      }
    },
  ) => YTPlayer
  PlayerState: { ENDED: number; PLAYING: number; PAUSED: number; BUFFERING: number; CUED: number }
}

declare global {
  interface Window {
    YT?: YTNamespace
    onYouTubeIframeAPIReady?: () => void
  }
}

let apiPromise: Promise<YTNamespace> | null = null

export function loadYouTubeApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  apiPromise ??= new Promise<YTNamespace>((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previous?.()
      resolve(window.YT!)
    }
    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    script.async = true
    script.onerror = () => {
      apiPromise = null
      script.remove()
      reject(new Error('Failed to load the YouTube player'))
    }
    document.head.appendChild(script)
  })
  return apiPromise
}
