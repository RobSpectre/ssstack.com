// Tiny Raindrop.io REST client shared by the sync and import scripts.
const API = 'https://api.raindrop.io/rest/v1'

export function config() {
  const token = process.env.RAINDROP_TOKEN
  const collectionId = Number(process.env.RAINDROP_COLLECTION_ID)
  if (!token || !collectionId) {
    console.error('Set RAINDROP_TOKEN and RAINDROP_COLLECTION_ID in .env (see .env.example).')
    process.exit(1)
  }
  return { token, collectionId }
}

export async function raindrop(token, path, { method = 'GET', body } = {}) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body && JSON.stringify(body),
    })
    // The API allows 120 requests/minute; back off and retry when we hit it.
    if (res.status === 429 && attempt < 5) {
      const wait = Number(res.headers.get('retry-after')) || 15
      console.warn(`Rate limited, waiting ${wait}s...`)
      await new Promise((r) => setTimeout(r, wait * 1000))
      continue
    }
    if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${await res.text()}`)
    return res.json()
  }
}

/** Every raindrop in a collection (the API pages 50 at a time). */
export async function fetchAll(token, collectionId) {
  const items = []
  for (let page = 0; ; page++) {
    const data = await raindrop(token, `/raindrops/${collectionId}?perpage=50&page=${page}&sort=-created`)
    items.push(...data.items)
    if (data.items.length < 50) return items
  }
}
