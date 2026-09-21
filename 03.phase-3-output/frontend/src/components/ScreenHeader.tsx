import { useEffect, useState } from 'react'

/**
 * Legacy-style screen header: title, screen id, and a live date/time — every BMS map in
 * the legacy app displays the program date/time in a corner of the screen.
 */
export function ScreenHeader({ screenId, title }: { screenId: string; title: string }) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <header className="screen-header">
      <div className="screen-header__row">
        <span className="screen-header__app">CardDemo</span>
        <span className="screen-header__screen-id">{screenId}</span>
      </div>
      <div className="screen-header__row">
        <h1 className="screen-header__title">{title}</h1>
        <span className="screen-header__datetime">{now.toLocaleDateString()} {now.toLocaleTimeString()}</span>
      </div>
    </header>
  )
}
