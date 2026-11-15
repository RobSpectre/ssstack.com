import { reactive } from 'vue'

/**
 * Hash routes, so any Sunday is a shareable link and GitHub Pages needs no rewrites:
 *   #/                      latest week
 *   #/2024-11-10            a chosen Sunday
 *   #/2024-11-10/present    the same, in the presentation view
 */
function parse() {
  const m = location.hash.match(/^#\/(\d{4}-\d{2}-\d{2})?\/?(present)?$/)
  return { sunday: m?.[1], present: Boolean(m?.[2]) }
}

export const route = reactive(parse())
window.addEventListener('hashchange', () => Object.assign(route, parse()))

export function hrefFor(sunday: string | undefined, present = false): string {
  return `#/${[sunday, present && 'present'].filter(Boolean).join('/')}`
}

export function go(sunday: string | undefined, present = route.present) {
  location.hash = hrefFor(sunday, present)
}
