/** Joins conditional class names (tiny local alternative to the clsx package). */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}
