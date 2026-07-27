// Download Pal portraits into public/pal-images/.
// Run after fetch-palworld-data.js: node scripts/fetch-pal-images.js
//
// The wiki stores every Pal as a 512x512 "<Name> menu.png", which is ~65KB each
// and would put 19MB of decoration in the repo. Fandom's image CDN will resize
// and re-encode on request though, so we pull 128px WebP instead: ~5KB each,
// about 1.4MB for the whole roster, and still sharp on a 2x display at the 64px
// the cards actually render.
//
// Existing files are skipped, so re-running after a game patch only fetches
// what's new.

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_FILE = path.join(__dirname, '../public/palworld-data.json')
const OUT_DIR = path.join(__dirname, '../public/pal-images')

const WIKI = 'https://palworld.fandom.com/api.php'
const BATCH = 50
const WIDTH = 128

/** Must stay identical to palImageSlug() in src/hooks/usePalworldData.ts. */
const slug = internal => internal.toLowerCase().replace(/[^a-z0-9]+/g, '-')

async function resolveImageUrls(names) {
  const urls = new Map()
  for (let i = 0; i < names.length; i += BATCH) {
    const batch = names.slice(i, i + BATCH)
    const titles = batch.map(n => `File:${n} menu.png`).join('|')
    const url = `${WIKI}?action=query&format=json&prop=imageinfo&iiprop=url`
      + `&titles=${encodeURIComponent(titles)}`
    console.log(`  resolving ${i + 1}-${i + batch.length} of ${names.length}`)
    const res = await fetch(url, { headers: { 'User-Agent': 'portfolio-hub image build' } })
    const data = await res.json()
    for (const page of Object.values(data.query?.pages ?? {})) {
      if (page.missing !== undefined || !page.imageinfo?.[0]) continue
      // "<Name> menu.png" -> "<Name>"
      const name = page.title.replace(/^File:/, '').replace(/ menu\.png$/i, '')
      urls.set(name, page.imageinfo[0].url.split('?')[0])
    }
  }
  return urls
}

async function main() {
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
  const pals = data.pals.filter(p => !p.hidden)
  fs.mkdirSync(OUT_DIR, { recursive: true })

  // Filenames come from the internal name, which is stable across patches
  // unlike the dex index. Guard against two Pals colliding once lowercased.
  const seen = new Map()
  for (const p of pals) {
    const s = slug(p.internal)
    if (seen.has(s)) throw new Error(`slug collision: ${p.internal} vs ${seen.get(s)}`)
    seen.set(s, p.internal)
  }

  const todo = pals.filter(p => !fs.existsSync(path.join(OUT_DIR, `${slug(p.internal)}.webp`)))
  console.log(`${pals.length} Pals, ${pals.length - todo.length} already downloaded, ${todo.length} to fetch`)
  if (!todo.length) return

  console.log('Resolving image URLs...')
  const urls = await resolveImageUrls(todo.map(p => p.name))

  console.log('Downloading portraits...')
  let ok = 0
  const missing = []
  for (const pal of todo) {
    const base = urls.get(pal.name)
    if (!base) { missing.push(pal.name); continue }
    // `base` already ends in /revision/latest. Ask the CDN to resize and
    // re-encode; without the Accept header it hands back the original PNG
    // regardless of ?format=webp.
    const url = `${base}/scale-to-width-down/${WIDTH}?format=webp`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'portfolio-hub image build', Accept: 'image/webp,image/*' },
    })
    if (!res.ok) { missing.push(`${pal.name} (HTTP ${res.status})`); continue }
    const buf = Buffer.from(await res.arrayBuffer())
    fs.writeFileSync(path.join(OUT_DIR, `${slug(pal.internal)}.webp`), buf)
    ok++
    if (ok % 40 === 0) console.log(`  ${ok}/${todo.length}`)
  }

  const bytes = fs.readdirSync(OUT_DIR)
    .reduce((t, f) => t + fs.statSync(path.join(OUT_DIR, f)).size, 0)
  console.log(`\nDownloaded ${ok}, total ${fs.readdirSync(OUT_DIR).length} files, ${(bytes / 1024 / 1024).toFixed(2)} MB`)
  if (missing.length) console.warn(`No image for ${missing.length}: ${missing.join(', ')}`)
}

main().catch(err => { console.error(err); process.exit(1) })
