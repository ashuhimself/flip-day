// Desktop notifications, shown only while the page is in the background.

let enabled = false

export const notifySupported = () => typeof window !== 'undefined' && 'Notification' in window

/** Turned on and off from the Settings toggle. */
export function setNotificationsEnabled(on: boolean) {
  enabled = on
}

/** Ask for permission. Must be called from a click. Resolves to whether notifications are allowed. */
export async function requestNotifications(): Promise<boolean> {
  if (!notifySupported()) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  try {
    return (await Notification.requestPermission()) === 'granted'
  } catch {
    return false
  }
}

export function notify(title: string, body?: string) {
  if (!enabled || !notifySupported() || Notification.permission !== 'granted') return
  // The chime and the screen already say it when the page is in front.
  if (document.visibilityState === 'visible' && document.hasFocus()) return
  const options: NotificationOptions = { body, tag: title, icon: 'icon-192.png' }
  const show = (reg?: ServiceWorkerRegistration) => {
    if (reg) void reg.showNotification(title, options)
    else new Notification(title, options)
  }
  try {
    // Mobile browsers only allow notifications through the service worker.
    if (navigator.serviceWorker) navigator.serviceWorker.getRegistration().then(show).catch(() => {})
    else show()
  } catch {
    // Not allowed here; the chime still plays.
  }
}
