import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string
          callback: (token: string) => void
          'expired-callback'?: () => void
          'error-callback'?: () => void
          theme?: 'light' | 'dark' | 'auto'
        },
      ) => string
      reset: (widgetId?: string) => void
      remove: (widgetId?: string) => void
    }
  }
}

interface TurnstileWidgetProps {
  onVerify: (token: string) => void
  onExpire: () => void
}

// Renders nothing (and signUp skips the captcha check) if no site key is
// configured, so local dev works without a Cloudflare account.
export function TurnstileWidget({ onVerify, onExpire }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY

  useEffect(() => {
    const key = siteKey
    if (!key || !containerRef.current) return
    let cancelled = false
    let pollId: ReturnType<typeof setInterval> | undefined = undefined

    function render() {
      if (cancelled || !window.turnstile || !containerRef.current) return
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: key as string,
        theme: 'auto',
        callback: onVerify,
        'expired-callback': onExpire,
      })
    }

    if (window.turnstile) {
      render()
    } else {
      pollId = setInterval(() => {
        if (window.turnstile) {
          clearInterval(pollId)
          render()
        }
      }, 100)
    }

    return () => {
      cancelled = true
      if (pollId) clearInterval(pollId)
      if (widgetIdRef.current) window.turnstile?.remove(widgetIdRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey])

  if (!siteKey) return null

  return <div ref={containerRef} className="flex justify-center" />
}
