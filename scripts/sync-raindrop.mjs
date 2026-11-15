// Pulls The Stack collection from Raindrop.io into public/stack.json.
//   npm run sync             real data (needs .env)
//   npm run sync -- --sample placeholder data for working on the UI
import { copyFile, writeFile } from 'node:fs/promises'
import { config, fetchAll } from './raindrop.mjs'

const OUT = new URL('../public/stack.json', import.meta.url)

if (process.argv.includes('--sample')) {
  await copyFile(new URL('./sample-stack.json', import.meta.url), OUT)
  console.log('Wrote SAMPLE data to public/stack.json')
  process.exit(0)
}

const { token, collectionId } = config()
const items = await fetchAll(token, collectionId)
const links = items.map((r) => ({
  id: r._id,
  link: r.link,
  title: r.title || r.link,
  excerpt: r.excerpt || '',
  note: r.note || '',
  cover: r.cover || '',
  domain: r.domain || new URL(r.link).hostname,
  type: r.type || 'link',
  tags: r.tags || [],
  created: r.created,
}))
await writeFile(OUT, JSON.stringify({ syncedAt: new Date().toISOString(), links }, null, 2))
console.log(`Wrote ${links.length} links to public/stack.json`)
