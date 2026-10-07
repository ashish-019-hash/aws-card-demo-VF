import { useEffect } from 'react'

/** Sets document.title for the current page and restores the previous title on unmount. */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    const previousTitle = document.title
    document.title = title ? `${title} · CardDemo` : 'CardDemo'
    return () => {
      document.title = previousTitle
    }
  }, [title])
}
