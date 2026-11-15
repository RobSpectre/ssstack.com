import type { StackLink } from '@/types'

/**
 * The URL to actually open for a link. Instagram links get a "#stack" marker so the
 * optional browser extension in /extension knows the tab came from here and holds
 * the video paused with sound on. Without the extension the marker does nothing.
 */
export function outboundUrl(link: StackLink): string {
  try {
    const url = new URL(link.link)
    if (/(^|\.)instagram\.com$/.test(url.hostname)) url.hash = 'stack'
    return url.href
  } catch {
    return link.link
  }
}
