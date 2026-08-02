import { ChevronLeft } from 'lucide-react'
import { useNavStack, SmartLink } from '../lib/history'
import { labelFor } from '../lib/nav'

/**
 * "Back" that returns you where you actually came from.
 *
 * Detail pages used to hardcode their parent - a Pal page always went to the
 * Palpedia. That threw away context: reaching a Pal from the Breeder's
 * one-parent view and hitting back dumped you in the full dex with the parent
 * you'd picked forgotten.
 *
 * The nav trail already knows the previous url, query string included, so this
 * uses it and names it. `fallback` covers a cold load, where there's no trail
 * because the page was opened directly.
 */
export default function BackLink({ fallback, fallbackLabel }: {
  fallback: string
  fallbackLabel: string
}) {
  const { previous } = useNavStack()
  const known = previous ? labelFor(previous) : null

  const to = known ? previous! : fallback
  const label = known ?? fallbackLabel

  return (
    <SmartLink
      to={to}
      className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors tactile-press"
    >
      <ChevronLeft size={16} /> {label}
    </SmartLink>
  )
}
