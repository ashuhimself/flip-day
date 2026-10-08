import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Music2, Pause, Play, Volume1, Volume2, VolumeX } from 'lucide-react'
import { STORAGE_KEYS, readJSON, writeJSON } from '../lib/storage'
import { loadYouTubeApi, parseYouTubeId, type YTPlayer } from '../lib/youtube'
import ToolPopover from './ToolPopover'

const INVALID_LINK = 'Please enter a valid YouTube link.'

// https://developers.google.com/youtube/iframe_api_reference#onError
const PLAYER_ERRORS: Record<number, string> = {
  2: INVALID_LINK,
  5: 'This video can’t be played in the browser player.',
  100: 'This video is unavailable or private.',
  101: 'The owner doesn’t allow this video to be played outside YouTube.',
  150: 'The owner doesn’t allow this video to be played outside YouTube.',
  153: 'YouTube blocked playback on this page.',
}

interface MusicPrefs {
  url: string
  volume: number
}

interface MusicProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Plays a YouTube link through the official embedded player. */
export default function Music({ open, onOpenChange }: MusicProps) {
  const [prefs] = useState(() => ({ url: '', volume: 60, ...readJSON<Partial<MusicPrefs>>(STORAGE_KEYS.music, {}) }))
  const [url, setUrl] = useState(prefs.url)
  const [volume, setVolume] = useState(prefs.volume)
  const [error, setError] = useState('')
  const [hasVideo, setHasVideo] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [title, setTitle] = useState('')

  const hostRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YTPlayer | null>(null)
  const readyRef = useRef(false)
  const creatingRef = useRef(false)
  const pendingIdRef = useRef<string | null>(null)
  const volumeRef = useRef(volume)

  // Warm up the API script the first time the panel opens.
  useEffect(() => {
    if (open) loadYouTubeApi().catch(() => {})
  }, [open])

  useEffect(() => () => playerRef.current?.destroy(), [])

  const load = (videoId: string) => {
    if (playerRef.current && readyRef.current) {
      playerRef.current.loadVideoById(videoId)
      return
    }
    pendingIdRef.current = videoId
    if (creatingRef.current) return
    creatingRef.current = true

    loadYouTubeApi()
      .then((YT) => {
        // The API replaces its mount node with an iframe, so give it a node React doesn't own.
        const mount = document.createElement('div')
        hostRef.current?.replaceChildren(mount)
        playerRef.current = new YT.Player(mount, {
          width: '100%',
          height: '100%',
          playerVars: { playsinline: 1, rel: 0 },
          events: {
            onReady: (e) => {
              readyRef.current = true
              e.target.setVolume(volumeRef.current)
              if (pendingIdRef.current) e.target.loadVideoById(pendingIdRef.current)
            },
            onStateChange: (e) => {
              setPlaying(e.data === YT.PlayerState.PLAYING || e.data === YT.PlayerState.BUFFERING)
              const videoTitle = e.target.getVideoData?.().title
              if (videoTitle) setTitle(videoTitle)
            },
            onError: (e) => {
              setPlaying(false)
              setError(PLAYER_ERRORS[e.data] ?? 'This video can’t be played right now.')
            },
          },
        })
      })
      .catch(() => {
        creatingRef.current = false
        setHasVideo(false)
        setError('Couldn’t load the YouTube player. Check your connection.')
      })
  }

  const submit = () => {
    const videoId = parseYouTubeId(url)
    if (!videoId) {
      setError(INVALID_LINK)
      return
    }
    setError('')
    setTitle('')
    setHasVideo(true)
    writeJSON(STORAGE_KEYS.music, { url: url.trim(), volume })
    load(videoId)
  }

  const togglePlay = () => {
    const player = playerRef.current
    if (!player || !readyRef.current) return
    if (playing) player.pauseVideo()
    else player.playVideo()
  }

  const changeVolume = (value: number) => {
    setVolume(value)
    volumeRef.current = value
    if (readyRef.current) playerRef.current?.setVolume(value)
    writeJSON(STORAGE_KEYS.music, { ...readJSON<Partial<MusicPrefs>>(STORAGE_KEYS.music, {}), volume: value })
  }

  const VolumeIcon = volume === 0 ? VolumeX : volume < 50 ? Volume1 : Volume2

  return (
    <ToolPopover
      open={open}
      onOpenChange={onOpenChange}
      label={playing ? 'Music, playing' : 'Music'}
      title="Music"
      icon={<Music2 size={18} strokeWidth={1.75} />}
      indicator={
        playing && (
          <span className="eq" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        )
      }
      placement="bottom"
      className="music"
    >
      <header className="panel-header">
        <h2 className="todo-eyebrow">Music</h2>
      </header>

      <form
        className="todo-input music-input"
        data-invalid={!!error || undefined}
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <input
          type="url"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value)
            if (error) setError('')
          }}
          placeholder="Paste a YouTube link"
          aria-label="YouTube link"
          aria-invalid={!!error}
          aria-describedby={error ? 'music-error' : undefined}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="go"
        />
        <button type="submit" className="music-load">
          Play
        </button>
      </form>

      {error && (
        <p id="music-error" className="field-error" role="alert">
          {error}
        </p>
      )}

      <div className="music-video" data-visible={hasVideo} ref={hostRef} />

      {hasVideo && (
        <>
          {title && (
            <p className="music-title" title={title}>
              {title}
            </p>
          )}
          <div className="music-controls">
            <button
              type="button"
              className="icon-button music-play"
              onClick={togglePlay}
              aria-label={playing ? 'Pause' : 'Play'}
              title={playing ? 'Pause' : 'Play'}
            >
              {playing ? <Pause size={17} strokeWidth={2} /> : <Play size={17} strokeWidth={2} />}
            </button>
            <label className="music-volume">
              <VolumeIcon size={16} strokeWidth={1.75} aria-hidden="true" />
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={volume}
                onChange={(e) => changeVolume(Number(e.target.value))}
                aria-label="Volume"
                style={{ '--fill': `${volume}%` } as CSSProperties}
              />
            </label>
          </div>
        </>
      )}
    </ToolPopover>
  )
}
