import { useEffect } from "react"

const BASE_TITLE = "HelpDesk Rostering"

/** Sets document.title to "{page} — HelpDesk Rostering", resets on unmount. */
export function useDocumentTitle(page: string) {
  useEffect(() => {
    document.title = `${page} — ${BASE_TITLE}`
    return () => {
      document.title = BASE_TITLE
    }
  }, [page])
}
