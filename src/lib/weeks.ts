import { STACK_TIMEZONE } from '@/config'
import type { StackLink, StackWeek } from '@/types'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const partsFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: STACK_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  weekday: 'short',
})

/** Calendar date + weekday (0 = Sunday) of an instant, as seen in STACK_TIMEZONE. */
function zonedDay(instant: Date): { ymd: string; weekday: number } {
  const p = Object.fromEntries(partsFormat.formatToParts(instant).map((x) => [x.type, x.value]))
  return { ymd: `${p.year}-${p.month}-${p.day}`, weekday: WEEKDAYS.indexOf(p.weekday) }
}

/** Pure calendar arithmetic on a YYYY-MM-DD string (done in UTC so DST can't shift it). */
function addDays(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/**
 * Which Sunday Service does a link saved at `created` belong to?
 *
 * The Sunday on or after the save date: anything saved Monday through Sunday
 * (all day Sunday, even after the call) is that Sunday's stack.
 */
export function serviceSundayFor(created: string): string {
  const { ymd, weekday } = zonedDay(new Date(created))
  return addDays(ymd, (7 - weekday) % 7)
}

/** Groups links into weeks, newest week first, links in the order they were saved. */
export function groupByWeek(links: StackLink[]): StackWeek[] {
  const weeks = new Map<string, StackLink[]>()
  for (const link of links) {
    const sunday = serviceSundayFor(link.created)
    const bucket = weeks.get(sunday)
    if (bucket) bucket.push(link)
    else weeks.set(sunday, [link])
  }
  return [...weeks.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([sunday, items]) => ({
      sunday,
      links: items.sort((a, b) => a.created.localeCompare(b.created)),
    }))
}

/** The Sunday the next (or today's) call falls on. */
export function currentServiceSunday(now = new Date()): string {
  return serviceSundayFor(now.toISOString())
}

export function formatSunday(ymd: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${ymd}T00:00:00Z`))
}
