import { reactive } from 'vue'

// Which links have been opened on this device, so the presenter can see what's left.
const KEY = 'stack-seen'

function load(): number[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}

export const seen = reactive(new Set<number>(load()))

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify([...seen]))
  } catch {
    // Private windows can refuse storage; the marks just won't survive a reload.
  }
}

export function markSeen(id: number) {
  seen.add(id)
  save()
}

export function clearSeen(ids: number[]) {
  for (const id of ids) seen.delete(id)
  save()
}
