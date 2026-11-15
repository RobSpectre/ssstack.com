# The Stack

The funny videos and links shared each week on Sunday Service, grouped by the
Sunday they were shared, newest first. Vue 3 + Vite + Tailwind v4 with
[neobrutalism-vue](https://github.com/michaelsieminski/neobrutalism-vue) components.

## Run it

```bash
npm install
cp .env.example .env   # add your Raindrop test token and collection id
npm run sync           # writes public/stack.json from Raindrop
npm run dev
```

`npm run sync -- --sample` loads placeholder links if you just want to work on the UI.

The Raindrop token is only used by the sync script. The site itself is static and
reads `public/stack.json`, so re-run `npm run sync` (then `npm run build`) to publish
new links.

## How weeks work

A link belongs to the Sunday on or after the day it was saved, in the timezone set in
`src/config.ts`. The rule lives in `serviceSundayFor()` in `src/lib/weeks.ts`.

## Importing the Keep backlog

`scripts/keep-to-raindrop.mjs` reads a Google Takeout export of Keep and creates the
links in Raindrop with their original dates. Usage is at the top of the script. It is
a dry run unless you pass `--apply`.

## Adding components

```bash
npx shadcn-vue@latest add https://neobrutalism-vue.vercel.app/r/<name>.json
```

## Presenting

Press **Present** on any week for a view sized for sharing a large screen. **Open all**
opens the week's links in tabs; the browser will block this until you allow pop-ups
for the site (blocked pop-up icon in the address bar, then "always allow").

### Holding Instagram videos (optional Chrome extension)

Instagram autoplays its videos muted, and a web page cannot control another site's
tab. The small extension in `extension/` fixes that for tabs opened from The Stack:
each Instagram video waits paused at the start with sound on, and your first click
plays it. It only acts on links carrying the `#stack` marker this site adds.

Install once: open `chrome://extensions`, turn on **Developer mode**, choose
**Load unpacked**, and select the `extension` folder.
