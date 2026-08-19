import { useEffect } from 'react'

/**
 * Set the tab title.
 *
 * Every route is prerendered with a real <title> (see scripts/prerender.js), so
 * a refresh or a shared link has always been right. Client-side navigation
 * never touched document.title, so clicking through the site left the tab
 * showing whichever page you happened to load first.
 *
 * Pass null to leave the title alone. Detail pages do that while their subject
 * is still loading, so the route-level title stands instead of flashing a
 * placeholder.
 */
export function useDocumentTitle(title: string | null) {
  useEffect(() => {
    if (title && document.title !== title) document.title = title
  }, [title])
}
