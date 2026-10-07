// Each route page wraps itself in AppShell, so navigation unmounts one shell
// and mounts another. The last seen location key therefore lives at module
// level: it survives the remount, letting the newly mounted shell detect that
// it was reached by navigation (focus the main landmark) rather than an
// initial load (leave focus on the skip link).
let lastShellLocationKey: string | null = null

/** True when the shell mounting at `locationKey` was reached by navigation. */
export function isShellNavigation(locationKey: string): boolean {
  return lastShellLocationKey !== null && lastShellLocationKey !== locationKey
}

export function recordShellLocation(locationKey: string) {
  lastShellLocationKey = locationKey
}

/** Test-only: forget the last location so the next render counts as an initial load. */
export function resetShellNavigationTracking() {
  lastShellLocationKey = null
}
