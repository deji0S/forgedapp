// Framework-agnostic consent storage, readable from non-React modules (e.g.
// onesignal.ts) so non-essential integrations can gate themselves without
// depending on React context.

export type CookieConsent = 'accepted' | 'declined'

const STORAGE_KEY = 'forged-cookie-consent'

export function getCookieConsent(): CookieConsent | null {
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored === 'accepted' || stored === 'declined' ? stored : null
}

export function setCookieConsent(value: CookieConsent) {
  window.localStorage.setItem(STORAGE_KEY, value)
}

export function clearCookieConsent() {
  window.localStorage.removeItem(STORAGE_KEY)
}

/** Session/login storage is essential and always allowed; this only gates
 * non-essential integrations like push-notification tracking. */
export function hasNonEssentialConsent(): boolean {
  return getCookieConsent() === 'accepted'
}
