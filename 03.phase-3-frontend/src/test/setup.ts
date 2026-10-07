import '@testing-library/jest-dom/vitest'

// jsdom does not implement window.matchMedia. Stub it so components using
// useMediaQuery can run in tests; `matches: false` keeps the desktop layout
// as the test default (matching the hook's no-matchMedia fallback).
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}
