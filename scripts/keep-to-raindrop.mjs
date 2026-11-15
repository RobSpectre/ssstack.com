// Back-fills The Stack from a Google Keep export, keeping the original dates.
//
// 1. Export Keep at https://takeout.google.com (select only Keep) and unzip it.
// 2. Dry run (default, changes nothing):
//      npm run keep:import -- path/to/Takeout/Keep --label "Stack"
// 3. Prove dates survive with a single link, then do the rest:
//      npm run keep:import -- path/to/Takeout/Keep --label "Stack" --apply --limit 1
//      npm run keep:import -- path/to/Takeout/Keep --label "Stack" --apply
//
// Options:
//   --label NAME    only notes carrying this Keep label
//   --title REGEX   only notes whose title matches (case-insensitive)
//   --limit N       stop after N links
//   --html FILE     write a Netscape bookmarks file instead of calling the API
//                   (import it at app.raindrop.io > Settings > Import)
//   --apply         actually create the raindrops
// Safe to re-run: links already in the collection are skipped.
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import { config, fetchAll, raindrop } from './raindrop.mjs'

const { values: opt, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    label: { type: 'string' },
    title: { type: 'string' },
    limit: { type: 'string' },
    html: { type: 'string' },
    apply: { type: 'boolean', default: false },
  },
})
const dir = positionals[0]
if (!dir) {
  console.error('Usage: npm run keep:import -- <Takeout/Keep dir> [--label NAME] [--apply]')
  process.exit(1)
}

// Keep in step with src/config.ts and serviceSundayFor() in src/lib/weeks.ts.
const STACK_TIMEZONE = 'America/New_York'
const dayFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: STACK_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
})

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

/** The day a title like "Stack - 13 Nov" or "Stack - April 9" names, in the year nearest `near`. */
function titleDate(title, near) {
  const hit = title.match(/(\d{1,2})\s*([A-Za-z]{3,9})/) ?? title.match(/([A-Za-z]{3,9})\s+(\d{1,2})/)
  if (!hit) return null
  const [day, name] = /\d/.test(hit[1]) ? [hit[1], hit[2]] : [hit[2], hit[1]]
  const month = MONTHS.indexOf(name.slice(0, 3).toLowerCase())
  if (month < 0) return null
  const year = near.getUTCFullYear()
  return [year - 1, year, year + 1]
    .map((y) => new Date(Date.UTC(y, month, Number(day), 17))) // midday in New York
    .sort((x, y) => Math.abs(x - near) - Math.abs(y - near))[0]
}

/**
 * One note per week, titled with that week's Sunday. The title wins over the
 * creation time, because next week's note was sometimes started on the Sunday
 * evening right after the call, which would file it a week early.
 */
function dateForNote(note) {
  const created = new Date(note.createdTimestampUsec / 1000)
  const named = titleDate(note.title ?? '', created)
  // Ignore titles that are far from when the note was written (typos like "27 Nov" for "17 Nov").
  if (!named || Math.abs(named - created) > 15 * 86400_000) return created
  // Snap a slightly-off title ("12 Oct" for Sunday the 11th) to the nearest Sunday.
  const sunday = new Date(named)
  const dow = sunday.getUTCDay()
  sunday.setUTCDate(sunday.getUTCDate() + (dow <= 3 ? -dow : 7 - dow))
  // Keep the real creation time when it already falls in that week.
  return serviceSunday(created).sunday === sunday.toISOString().slice(0, 10) ? created : sunday
}

/** The Sunday the app will file a date under, plus the weekday it fell on. */
function serviceSunday(date) {
  const p = Object.fromEntries(dayFormat.formatToParts(date).map((x) => [x.type, x.value]))
  const d = new Date(`${p.year}-${p.month}-${p.day}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + ((7 - ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday)) % 7))
  return { sunday: d.toISOString().slice(0, 10), weekday: p.weekday }
}

const URL_RE = /https?:\/\/[^\s<>"']+/g
const clean = (url) => url.replace(/[).,;!?\]]+$/, '')
const norm = (url) => url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '').toLowerCase()

/** Every link in a note, in order, with any text sharing its line kept as the note. */
function linksInNote(note) {
  const lines = [
    ...(note.textContent ?? '').split('\n'),
    ...(note.listContent ?? []).map((item) => item.text ?? ''),
  ]
  const titles = new Map((note.annotations ?? []).map((a) => [norm(a.url ?? ''), a.title]))
  const found = []
  for (const line of lines) {
    for (const raw of line.match(URL_RE) ?? []) {
      const link = clean(raw)
      // Text sharing the line, minus list bullets; nothing if only punctuation is left.
      const rest = line.replace(URL_RE, '').replace(/^[\s•*\-–—]+/, '').trim()
      found.push({ link, title: titles.get(norm(link)), note: /[\p{L}\p{N}]/u.test(rest) ? rest : '' })
    }
  }
  // Link previews Keep attached that never appeared in the text.
  for (const a of note.annotations ?? []) {
    if (a.url && !found.some((f) => norm(f.link) === norm(a.url))) {
      found.push({ link: a.url, title: a.title, note: '' })
    }
  }
  return found
}

// ---- Read and filter the export -------------------------------------------
const titleRe = opt.title && new RegExp(opt.title, 'i')
const notes = []
for (const file of (await readdir(dir)).filter((f) => f.endsWith('.json'))) {
  const note = JSON.parse(await readFile(join(dir, file), 'utf8'))
  if (note.isTrashed) continue
  if (opt.label && !(note.labels ?? []).some((l) => l.name === opt.label)) continue
  if (titleRe && !titleRe.test(note.title ?? '')) continue
  notes.push(note)
}
notes.sort((a, b) => a.createdTimestampUsec - b.createdTimestampUsec)

const seen = new Set()
let items = []
for (const note of notes) {
  const base = dateForNote(note).getTime()
  linksInNote(note).forEach((found, i) => {
    if (seen.has(norm(found.link))) return
    seen.add(norm(found.link))
    // One second apart so links keep the order they had inside the note.
    const created = new Date(base + i * 1000).toISOString()
    items.push({ ...found, created, from: note.title || '(untitled)' })
  })
}
console.log(`${notes.length} notes matched, ${items.length} unique links found.`)

// Which Sunday each note lands on. Two notes on one Sunday means a week would be merged.
const bySunday = new Map()
for (const note of notes) {
  const { sunday, weekday } = serviceSunday(dateForNote(note))
  bySunday.set(sunday, [...(bySunday.get(sunday) ?? []), `${note.title || '(untitled)'} (created ${weekday})`])
}
const clashes = [...bySunday].filter(([, titles]) => titles.length > 1)
if (!opt.apply) for (const [sunday, titles] of bySunday) console.log(`  ${sunday}  ${titles.join(' + ')}`)
if (clashes.length) {
  console.warn(`\nWARNING: ${clashes.length} Sundays would receive more than one note:`)
  for (const [sunday, titles] of clashes) console.warn(`  ${sunday}  ${titles.join(' + ')}`)
  console.warn('If those are separate weeks, adjust dateForNote() before using --apply.\n')
}

// ---- Bookmarks-file route --------------------------------------------------
if (opt.html) {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
  const rows = items.map(
    (i) => `<DT><A HREF="${esc(i.link)}" ADD_DATE="${Math.floor(Date.parse(i.created) / 1000)}">${esc(i.title || i.link)}</A>`,
  )
  await writeFile(
    opt.html,
    `<!DOCTYPE NETSCAPE-Bookmark-file-1>\n<TITLE>Bookmarks</TITLE>\n<H1>Bookmarks</H1>\n<DL><p>\n<DT><H3>The Stack</H3>\n<DL><p>\n${rows.join('\n')}\n</DL><p>\n</DL><p>\n`,
  )
  console.log(`Wrote ${items.length} bookmarks to ${opt.html}`)
  process.exit(0)
}

// ---- API route --------------------------------------------------------------
const { token, collectionId } = config()
const existing = new Set((await fetchAll(token, collectionId)).map((r) => norm(r.link)))
items = items.filter((i) => !existing.has(norm(i.link)))
if (opt.limit) items = items.slice(0, Number(opt.limit))
console.log(`${existing.size} already in Raindrop, ${items.length} to create.`)

if (!opt.apply) {
  for (const i of items) console.log(`${i.created.slice(0, 10)}  ${i.link}  [${i.from}]`)
  console.log('\nDry run. Nothing was created. Add --apply to import.')
  process.exit(0)
}

for (let at = 0; at < items.length; at += 100) {
  const batch = items.slice(at, at + 100)
  const res = await raindrop(token, '/raindrops', {
    method: 'POST',
    body: {
      items: batch.map((i) => ({
        link: i.link,
        ...(i.title && { title: i.title }),
        ...(i.note && { note: i.note }),
        created: i.created,
        lastUpdate: i.created,
        collection: { $id: collectionId },
        pleaseParse: {}, // have Raindrop fetch title, cover and type in the background
      })),
    },
  })
  // `created` is accepted by the API but undocumented: stop at once if it was ignored.
  const sent = new Map(batch.map((i) => [norm(i.link), i.created]))
  const drifted = (res.items ?? []).filter((r) => {
    const want = sent.get(norm(r.link))
    return want && Math.abs(Date.parse(r.created) - Date.parse(want)) > 60_000
  })
  if (drifted.length) {
    console.error(`Raindrop did not keep the original date for ${drifted.length} links, e.g. ${drifted[0].link}`)
    console.error('Stopping. Delete those from the collection and use --html with the Raindrop importer instead.')
    process.exit(1)
  }
  console.log(`Created ${Math.min(at + 100, items.length)}/${items.length}`)
}
