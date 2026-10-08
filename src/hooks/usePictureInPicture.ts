import { useCallback, useEffect, useState } from 'react'

// Document Picture-in-Picture: an always-on-top window that can hold any DOM.
// Chrome/Edge 116+. https://developer.chrome.com/docs/web-platform/document-picture-in-picture
declare global {
  interface Window {
    documentPictureInPicture?: {
      requestWindow(options?: { width?: number; height?: number }): Promise<Window>
      window: Window | null
    }
  }
}

export const pipSupported = () => typeof window !== 'undefined' && 'documentPictureInPicture' in window

/** Copy the app's styles into the PiP document (Vite uses <style> in dev, <link> in prod). */
function copyStyles(target: Document) {
  document.head.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => {
    const copy = node.cloneNode(true) as HTMLElement
    // Relative hrefs would resolve against the PiP window's about:blank URL.
    if (copy instanceof HTMLLinkElement) copy.href = (node as HTMLLinkElement).href
    target.head.appendChild(copy)
  })
}

export function usePictureInPicture() {
  const [pipWindow, setPipWindow] = useState<Window | null>(null)

  const open = useCallback(async (size: { width: number; height: number }) => {
    const api = window.documentPictureInPicture
    if (!api) return
    if (api.window) {
      api.window.focus()
      return
    }
    const w = await api.requestWindow(size)
    copyStyles(w.document)
    w.document.title = 'Flipday'
    w.addEventListener('pagehide', () => setPipWindow(null), { once: true })
    setPipWindow(w)
  }, [])

  const close = useCallback(() => pipWindow?.close(), [pipWindow])

  // Closing or reloading the main page takes the popup with it anyway; be explicit.
  useEffect(() => () => pipWindow?.close(), [pipWindow])

  return { pipWindow, open, close }
}
