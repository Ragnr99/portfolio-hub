// Build the Palworld dataset used by the Palpedia and Breeder pages.
// Run this when the game patches: node scripts/fetch-palworld-data.js
//
// Three sources get merged, because no single one has everything:
//
//   1. palcalc db.json      - all 299 Pals with real stats, work suitability,
//                             size/rarity/food. Generated from the game files.
//                             Has no element types.
//   2. palcalc breeding.json- the authoritative parent-pair -> child matrix,
//                             also straight from the game files.
//   3. palworld.fandom.com  - element types, partner skills and drops, parsed
//                             out of the {{Pal}} infobox wikitext.
//
// On breeding: we ship the whole precomputed matrix rather than a formula.
// The community "average the CombiRank, take the nearest Pal" rule only
// reproduces about 69% of real results - roughly a quarter of real outcomes
// aren't even distance-optimal, which is far too many to be special-cased
// combos. The full matrix is exact and, packed as a uint16 upper triangle,
// costs about 117KB (~49KB gzipped). That's cheaper than being wrong.

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUTPUT_FILE = path.join(__dirname, '../public/palworld-data.json')

const PALCALC = 'https://raw.githubusercontent.com/tylercamp/palcalc/main/PalCalc.Model'
const WIKI = 'https://palworld.fandom.com/api.php'
const WIKI_BATCH = 50 // MediaWiki caps multi-title queries at 50

const WORK_KEYS = [
  'Kindling', 'Watering', 'Planting', 'GenerateElectricity', 'Handiwork',
  'Gathering', 'Lumbering', 'Mining', 'MedicineProduction', 'Cooling',
  'Transporting', 'Farming',
]

async function getJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'portfolio-hub palworld data build' } })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`)
  return res.json()
}

/**
 * Pull one field out of a {{Pal}} infobox.
 *
 * Has to track brace depth rather than just splitting on "|": values routinely
 * embed templates like {{i|Venom Gland}} whose own pipes would otherwise cut
 * the value short. Ends at a top-level "|", or at a newline that starts the
 * next field, so descriptions may wrap.
 */
function field(text, name) {
  const start = new RegExp(`\\|\\s*${name}\\s*=`, 'i').exec(text)
  if (!start) return ''
  let i = start.index + start[0].length
  let depth = 0
  let out = ''
  while (i < text.length) {
    const two = text.slice(i, i + 2)
    if (two === '{{' || two === '[[') { depth++; out += two; i += 2; continue }
    if (two === '}}' || two === ']]') {
      if (depth === 0) break
      depth--; out += two; i += 2; continue
    }
    const c = text[i]
    if (depth === 0) {
      if (c === '|') break
      if (c === '\n' && /^\s*(\||\}\})/.test(text.slice(i + 1))) break
    }
    out += c
    i++
  }
  return out.trim()
}

/** Turn wiki markup into plain text: {{i|Wool}} -> Wool, [[a|b]] -> b. */
function plain(s) {
  return s
    .replace(/\{\{\s*i\s*\|([^}|]+)[^}]*\}\}/gi, '$1')      // item link
    .replace(/\{\{[^}|]*\|([^}]*)\}\}/g, (_, rest) => rest.split('|')[0])
    .replace(/\{\{([^}]*)\}\}/g, '$1')                       // {{Ranch}} -> Ranch
    .replace(/\[\[[^\]|]*\|([^\]]*)\]\]/g, '$1')
    .replace(/\[\[([^\]]*)\]\]/g, '$1')
    .replace(/'''?/g, '')
    .replace(/<[^>]+>/g, ' ')  // a space, not nothing: <br> joins two sentences
    .replace(/\s+/g, ' ')
    .trim()
}

/** Drops are <br>-separated in the infobox; keep them as separate entries. */
function plainList(s) {
  return s.split(/<br\s*\/?>|\n/i).map(plain).filter(Boolean)
}

/** Fetch {{Pal}} infobox fields for every name, 50 pages per request. */
async function fetchWikiInfo(names) {
  const info = new Map()
  for (let i = 0; i < names.length; i += WIKI_BATCH) {
    const batch = names.slice(i, i + WIKI_BATCH)
    const url = `${WIKI}?action=query&format=json&prop=revisions&rvprop=content&rvslots=main`
      + `&titles=${encodeURIComponent(batch.join('|'))}`
    console.log(`  wiki ${i + 1}-${i + batch.length} of ${names.length}`)
    const data = await getJson(url)
    for (const page of Object.values(data.query?.pages ?? {})) {
      if (page.missing !== undefined) continue
      const text = page.revisions?.[0]?.slots?.main?.['*'] ?? ''
      const elements = []
      for (const key of ['ele1', 'ele2']) {
        const v = field(text, key)
        if (v) elements.push(v)
      }
      info.set(page.title, {
        elements,
        partnerSkill: plain(field(text, 'partnerskill')),
        partnerDesc: plain(field(text, 'psdesc')),
        drops: plainList(field(text, 'drops')),
      })
    }
  }
  return info
}

/**
 * Pack the breeding matrix as the upper triangle of a 299x299 uint16 grid.
 * Symmetric, so half of it is redundant; index (i,j) with i<=j lives at
 * i*n - i*(i-1)/2 + (j-i), which the front end mirrors exactly.
 */
function packBreeding(breeding, indexOf, n) {
  const pair = new Map()
  const asymmetric = []

  for (const e of breeding) {
    const a = indexOf.get(e.Parent1InternalName)
    const b = indexOf.get(e.Parent2InternalName)
    const child = indexOf.get(e.ChildInternalName)
    if (a === undefined || b === undefined || child === undefined) continue
    const key = `${Math.min(a, b)},${Math.max(a, b)}`
    const prev = pair.get(key)
    if (prev !== undefined && prev !== child) {
      // One real pair in the game depends on which parent is female.
      asymmetric.push({ key, a: e.Parent1InternalName, b: e.Parent2InternalName, child: e.ChildInternalName })
      continue // keep the first result; the override table carries the nuance
    }
    pair.set(key, child)
  }

  const tri = new Uint16Array((n * (n + 1)) / 2)
  let at = 0
  let missing = 0
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      const v = pair.get(`${i},${j}`)
      if (v === undefined) missing++
      tri[at++] = v === undefined ? 0xffff : v
    }
  }
  return { tri, missing, covered: pair.size, asymmetric }
}

async function main() {
  console.log('Fetching palcalc game data...')
  const [db, breedingDoc] = await Promise.all([
    getJson(`${PALCALC}/db.json`),
    getJson(`${PALCALC}/breeding.json`),
  ])

  // Canonical order. Everything (including the packed matrix) is indexed by
  // position in this array, so it must stay stable between the two files.
  const pals = [...db.Pals].sort((x, y) =>
    x.Id.PalDexNo - y.Id.PalDexNo ||
    Number(x.Id.IsVariant) - Number(y.Id.IsVariant) ||
    x.InternalName.localeCompare(y.InternalName))
  const indexOf = new Map(pals.map((p, i) => [p.InternalName, i]))
  console.log(`  ${pals.length} pals, ${breedingDoc.Breeding.length} breeding entries`)

  console.log('Fetching element types and partner skills from the wiki...')
  const wiki = await fetchWikiInfo(pals.map(p => p.Name))
  // Dex 10000+ / internal "Yakushima*" are the Terraria collab event monsters.
  // palcalc carries them because they technically sit in the breeding tables,
  // but they aren't Pals, have no wiki page and no element - so they stay in the
  // array (matrix indices depend on it) and get hidden from the UI instead.
  const isCollab = p => p.Id.PalDexNo >= 10000
  const unexpected = pals.filter(p => !isCollab(p) && !(wiki.get(p.Name)?.elements?.length))
  console.log(`  ${pals.filter(isCollab).length} collab entries hidden from the dex`)
  if (unexpected.length) {
    console.warn(`  WARNING: no elements for ${unexpected.length} real pals: ` +
      unexpected.slice(0, 12).map(p => p.Name).join(', '))
  }

  console.log('Packing the breeding matrix...')
  const { tri, missing, covered, asymmetric } = packBreeding(
    breedingDoc.Breeding, indexOf, pals.length)
  console.log(`  ${covered} unordered pairs covered, ${missing} missing`)
  if (asymmetric.length) {
    console.log(`  ${asymmetric.length} gender-dependent pair(s): ` +
      asymmetric.map(x => `${x.a}+${x.b}`).join(', '))
  }

  const out = {
    generatedAt: new Date().toISOString(),
    sources: {
      stats: 'https://github.com/tylercamp/palcalc (game files)',
      breeding: 'https://github.com/tylercamp/palcalc (game files)',
      elements: 'https://palworld.fandom.com/wiki/Elements',
    },
    workKeys: WORK_KEYS,
    pals: pals.map((p, i) => {
      const w = wiki.get(p.Name) ?? {}
      return {
        i,
        dex: p.Id.PalDexNo,
        variant: p.Id.IsVariant,
        name: p.Name,
        internal: p.InternalName,
        hidden: isCollab(p),
        elements: w.elements?.length ? w.elements : [],
        hp: p.Hp,
        attack: p.Attack,
        defense: p.Defense,
        rarity: p.Rarity,
        size: p.Size,
        nocturnal: p.Nocturnal,
        food: p.FoodAmount,
        price: p.Price,
        wild: [p.MinWildLevel, p.MaxWildLevel],
        rideSprint: p.RideSprintSpeed,
        transport: p.TransportSpeed,
        stamina: p.Stamina,
        work: WORK_KEYS.map(k => p.WorkSuitability?.[k] ?? 0),
        partnerSkill: w.partnerSkill || '',
        partnerDesc: w.partnerDesc || '',
        drops: w.drops ?? [],
      }
    }),
    breeding: {
      n: pals.length,
      // uint16 upper triangle, little-endian, base64
      tri: Buffer.from(tri.buffer).toString('base64'),
      // Pairs whose result depends on which parent is female. The packed matrix
      // can only hold one answer per pair, so the UI reads the nuance from here.
      genderPairs: asymmetric.map(x => ({
        a: indexOf.get(x.a), b: indexOf.get(x.b), child: indexOf.get(x.child),
      })),
    },
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(out))
  const kb = (fs.statSync(OUTPUT_FILE).size / 1024).toFixed(1)
  console.log(`\nWrote ${OUTPUT_FILE} (${kb} KB)`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
