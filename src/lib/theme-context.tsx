import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

const STORAGE_KEY = 'forged-theme'

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolve(preference: ThemePreference): ResolvedTheme {
  return preference === 'system' ? getSystemTheme() : preference
}

// Mirrors the no-flash inline script in index.html, which applies this same
// class synchronously before first paint using the same storage key/logic.
function applyTheme(resolved: ResolvedTheme) {
  document.documentElement.classList.toggle('dark', resolved === 'dark')

  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', resolved === 'dark' ? '#000000' : '#ffffff')
}

interface ThemeContextValue {
  preference: ThemePreference
  setPreference: (preference: ThemePreference) => void
  resolvedTheme: ResolvedTheme
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system'
  })
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolve(preference))

  function setPreference(next: ThemePreference) {
    window.localStorage.setItem(STORAGE_KEY, next)
    setPreferenceState(next)
  }

  useEffect(() => {
    const resolved = resolve(preference)
    setResolvedTheme(resolved)
    applyTheme(resolved)

    if (preference !== 'system') return

    // Only System mode needs to react to the OS preference changing while
    // the app is open; an explicit Light/Dark choice stays put regardless.
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    function handleChange() {
      const next = getSystemTheme()
      setResolvedTheme(next)
      applyTheme(next)
    }
    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [preference])

  return (
    <ThemeContext.Provider value={{ preference, setPreference, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}
