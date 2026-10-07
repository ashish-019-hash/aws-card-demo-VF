import { useCallback, useSyncExternalStore } from 'react'

/** Matches the tokens.css breakpoint where the side navigation collapses into the drawer. */
export const MOBILE_NAV_QUERY = '(max-width: 1023px)'

/** Matches the tokens.css breakpoint where tables switch to stacked cards. */
export const STACKED_TABLE_QUERY = '(max-width: 639px)'

function canMatchMedia(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
}

/**
 * Reactive wrapper around window.matchMedia. Returns false in environments
 * without matchMedia support (for example jsdom), so markup driven by this
 * hook must treat false as the desktop default.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!canMatchMedia()) return () => {}
      const mediaQueryList = window.matchMedia(query)
      mediaQueryList.addEventListener('change', onStoreChange)
      return () => mediaQueryList.removeEventListener('change', onStoreChange)
    },
    [query],
  )

  const getSnapshot = useCallback(() => (canMatchMedia() ? window.matchMedia(query).matches : false), [query])

  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
