/**
 * A navigation trail that collapses loops.
 *
 * Normal routing pushes every visit, so wandering
 *
 *   Work -> Palworld -> Palpedia -> Anubis -> Palworld
 *
 * leaves five entries and Back walks you through Anubis and the Palpedia again
 * to get out. Here, arriving somewhere already in the trail truncates back to
 * it: the visits in between are dropped instead of stacking up.
 *
 * SmartLink does the same to real browser history. If the target is already
 * behind you it calls navigate(-n) rather than pushing a duplicate, so the
 * pages you looped past fall out of the forward stack too and Back keeps
 * meaning "up one level" instead of "replay everywhere I clicked".
 */

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, type LinkProps } from 'react-router-dom'

interface NavStack {
  /** Where you actually are, loops already collapsed. */
  trail: string[]
  go: (to: string) => void
}

const Ctx = createContext<NavStack>({ trail: [], go: () => {} })

/** Compare routes only; ?pal=42 is the same page as ?pal=7. */
const samePage = (a: string, b: string) => a.split('?')[0] === b.split('?')[0]

export function NavStackProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const ref = useRef<string[]>([])
  const [trail, setTrail] = useState<string[]>([])

  useEffect(() => {
    const here = location.pathname + location.search
    const cur = ref.current
    const idx = cur.findIndex(p => samePage(p, here))

    let next: string[]
    if (idx >= 0) {
      next = cur.slice(0, idx + 1)
      next[idx] = here // keep the newest query string
    } else {
      next = [...cur, here]
    }

    ref.current = next
    setTrail(next)
  }, [location])

  const go = useCallback((to: string) => {
    const cur = ref.current
    const idx = cur.findIndex(p => samePage(p, to))
    const last = cur.length - 1

    if (idx === last && idx >= 0) return          // already here
    if (idx >= 0) navigate(idx - last)            // loop: rewind, cutting the middle
    else navigate(to)
  }, [navigate])

  return <Ctx.Provider value={{ trail, go }}>{children}</Ctx.Provider>
}

export const useNavStack = () => useContext(Ctx)

/**
 * Drop-in for <Link> that collapses loops. Still renders a real href, so
 * middle-click and open-in-new-tab behave normally.
 */
export function SmartLink({ to, onClick, ...rest }: LinkProps) {
  const { go } = useNavStack()
  return (
    <Link
      to={to}
      onClick={e => {
        onClick?.(e)
        // let the browser handle modified clicks itself
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
        if (typeof to !== 'string') return
        e.preventDefault()
        go(to)
      }}
      {...rest}
    />
  )
}
