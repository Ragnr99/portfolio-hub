// Write a real HTML file at every route so GitHub Pages stops answering 404.
// Runs after `vite build`, before the gh-pages push. See deploy.bat.
//
// The problem: Pages serves static files, so any path without a file behind it
// falls through to 404.html. The usual SPA trick is to make 404.html a copy of
// index.html, which renders correctly but still returns HTTP 404. Browsers don't
// care; crawlers and link unfurlers do, and every Pal and Pokemon now has a URL
// worth sharing.
//
// The fix is to actually put index.html at each path. While we're writing them
// per route we may as well set a real <title> and description, so a shared link
// says "Anubis | Palpedia" instead of the site's generic card.
//
// Routes come from App.tsx and page copy from src/lib, so this can't drift out
// of sync with the app: an unknown route is reported rather than skipped.

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const DIST = path.join(ROOT, 'dist')
const SITE = 'https://nicholaslubold.com'
// Pokemon artwork is already public and sized right, so it's referenced rather
// than mirrored. Pal art has no equivalent, hence public/pal-og.
const POKE_ART = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork'

// Normalised on read: git checks these files out with CRLF, which silently
// breaks every regex written against \n.
const read = p =>
  fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/\r\n/g, '\n')

/** Same rule as assignSlugs() in usePalworldData.ts. */
function palSlugs(pals) {
  const base = n => n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const used = new Map()
  return pals.map(p => {
    const b = base(p.name)
    const seen = (used.get(b) ?? 0) + 1
    used.set(b, seen)
    if (seen === 1) return { ...p, slug: b }
    const suffix = p.internal.split('_')[1]
    return { ...p, slug: suffix ? `${b}-${base(suffix)}` : `${b}-${seen}` }
  })
}

const pretty = s => s.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

/** Page copy for the fixed routes, lifted from the registries rather than retyped. */
function staticMeta() {
  const meta = new Map()
  const nav = read('src/lib/nav.ts')
  const projects = read('src/lib/projects.ts')

  for (const m of nav.matchAll(/path: '([^']+)', label: '([^']+)'[^}]*?hint: '([^']*)'/gs)) {
    meta.set(m[1], { title: m[2], description: m[3] })
  }
  // projects: title/description sit above demoUrl in each entry
  for (const block of projects.split(/\n  \{\n/).slice(1)) {
    const title = /title: '((?:[^'\\]|\\.)*)'/.exec(block)?.[1]
    const desc = /description: '((?:[^'\\]|\\.)*)'/.exec(block)?.[1]
    const url = /demoUrl: '([^']+)'/.exec(block)?.[1]
    if (url && title) meta.set(url, { title, description: (desc ?? '').replace(/\\'/g, "'") })
  }
  for (const m of projects.matchAll(/path: '([^']+)', label: '([^']+)', icon: \w+,\s*\n\s*hint: '([^']*)'/g)) {
    meta.set(m[1], { title: m[2], description: m[3] })
  }
  return meta
}

function inject(html, { title, description, url, image, imageSize }) {
  const esc = s => String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  const full = `${esc(title)} | Nicholas Lubold`
  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${full}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${esc(description)}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${full}$2`)
    .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${full}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${esc(description)}$2`)
    .replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${esc(description)}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${SITE}${esc(url)}$2`)
    .replace(
      // A square subject wants the small card; the wide default would letterbox it.
      /<meta name="twitter:card" content="[^"]*"/,
      image ? '<meta name="twitter:card" content="summary"' : '$&')
    .replace(
      /<meta property="og:image" content="[^"]*"[\s\S]*?<meta property="og:image:height" content="[^"]*"\s*\/>/,
      image
        // Two og:image tags on purpose: the WebP is a fraction of the size, but
        // not every unfurler reads WebP, and those that don't fall through to
        // the site's PNG card rather than showing nothing at all.
        ? [
            `<meta property="og:image" content="${esc(image)}" />`,
            `    <meta property="og:image:width" content="${imageSize}" />`,
            `    <meta property="og:image:height" content="${imageSize}" />`,
            `    <meta property="og:image" content="${SITE}/og-card.png" />`,
          ].join('\n')
        : '$&')
    .replace(/(<meta name="twitter:image" content=")[^"]*(")/,
      image ? `$1${esc(image)}$2` : '$&')
}

function write(route, html) {
  const dir = path.join(DIST, route)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'index.html'), html)
}

function main() {
  const shell = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8')
  const routes = [...read('src/App.tsx').matchAll(/<Route path="([^"]+)"/g)].map(m => m[1])
  const meta = staticMeta()

  let count = 0
  const missing = []

  // ---- fixed routes ----
  for (const route of routes.filter(r => r !== '/' && !r.includes(':'))) {
    const m = meta.get(route)
    if (!m) { missing.push(route); continue }
    write(route.replace(/^\//, ''), inject(shell, { ...m, url: route }))
    count++
  }

  // ---- /palworld/pal/:slug ----
  const pw = JSON.parse(read('public/palworld-data.json'))
  for (const pal of palSlugs(pw.pals.filter(p => !p.hidden))) {
    const el = pal.elements.join(' / ')
    write(`palworld/pal/${pal.slug}`, inject(shell, {
      title: `${pal.name} | Palpedia`,
      description: `${pal.name} is a ${el} Pal. HP ${pal.hp}, Attack ${pal.attack}, Defense ${pal.defense}. `
        + `Work suitability, partner skill, drops and every breeding pair.`,
      url: `/palworld/pal/${pal.slug}`,
      image: `${SITE}/pal-og/${pal.internal.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.webp`,
      imageSize: 400,
    }))
    count++
  }

  // ---- /pokedex/:slug ----
  const idx = JSON.parse(read('public/pokemon-index.json'))
  for (const [id, name, types] of idx.pokemon) {
    write(`pokedex/${name}`, inject(shell, {
      title: `${pretty(name)} | Pokédex`,
      description: `#${String(id).padStart(3, '0')} ${pretty(name)}, a `
        + `${types.map(pretty).join('/')} type. Base stats, abilities, moves and evolutions.`,
      url: `/pokedex/${name}`,
      image: `${POKE_ART}/${id}.png`,
      imageSize: 475,
    }))
    count++
  }

  // 404.html still matters for genuinely unknown paths; the app renders its own
  // not-found state there.
  fs.writeFileSync(path.join(DIST, '404.html'), shell)

  if (missing.length) {
    console.error(`\nERROR: no page copy for ${missing.join(', ')}`)
    console.error('Add it to src/lib/nav.ts or src/lib/projects.ts, or prerender will skip the route.')
    process.exit(1)
  }

  const bytes = count * Buffer.byteLength(shell)
  console.log(`Prerendered ${count} routes (${(bytes / 1024 / 1024).toFixed(2)} MB of HTML)`)
}

main()
