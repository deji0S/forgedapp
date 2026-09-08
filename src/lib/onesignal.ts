import OneSignal from 'react-onesignal'
import { hasNonEssentialConsent } from './cookie-consent'

// OneSignal's service worker is scoped to its own subdirectory so it doesn't
// clash with the Workbox service worker vite-plugin-pwa generates at "/".
const SERVICE_WORKER_PATH = 'push/onesignal/OneSignalSDKWorker.js'
const SERVICE_WORKER_SCOPE = '/push/onesignal/'

let initPromise: Promise<void> | null = null

// OneSignal is a non-essential integration (push reminders) and must not set
// any identifiers/cookies until the user has accepted non-essential cookies
// in the consent banner.
export function initOneSignal() {
  if (!hasNonEssentialConsent()) return Promise.resolve()

  const appId = import.meta.env.VITE_ONESIGNAL_APP_ID
  if (!appId) return Promise.resolve()

  if (!initPromise) {
    initPromise = OneSignal.init({
      appId,
      serviceWorkerPath: SERVICE_WORKER_PATH,
      serviceWorkerParam: { scope: SERVICE_WORKER_SCOPE },
    })
  }
  return initPromise
}

// Ties the current push subscription on this device to our Supabase user id,
// so the streak-reminder edge function can target it via OneSignal's
// external_id. Call on sign-in / session restore.
export async function linkOneSignalUser(userId: string) {
  if (!hasNonEssentialConsent()) return
  const appId = import.meta.env.VITE_ONESIGNAL_APP_ID
  if (!appId) return
  await initOneSignal()
  await OneSignal.login(userId)
}

// Call on sign-out so a shared device doesn't keep sending one user's
// reminders to whoever is signed in next.
export async function unlinkOneSignalUser() {
  const appId = import.meta.env.VITE_ONESIGNAL_APP_ID
  if (!appId) return
  await initOneSignal()
  await OneSignal.logout()
}

// Prompts the browser's native push permission dialog. Only call this from
// an explicit user action (e.g. enabling reminders in settings) — browsers
// penalize unsolicited permission prompts.
export async function requestPushPermission() {
  if (!hasNonEssentialConsent()) return null
  await initOneSignal()
  await OneSignal.Notifications.requestPermission()
  return OneSignal.Notifications.permission
}
