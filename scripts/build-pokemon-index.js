// Build the small Pokémon index the search palette uses.
// Run after fetch-pokemon-data.js: node scripts/build-pokemon-index.js
//
// pokemon-data.json is ~4MB, almost all of it moves and ability lists. The
// palette only needs enough to match a name and draw a row, so loading the full
// file every time someone taps Search would be absurd. This strips it to
// id/name/types and lets the sprite URL be derived, which lands around 50KB.
//
// The Palworld dataset is 266KB and gets loaded whole, which is why Pals were
// searchable first and Pokémon weren't.

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SOURCE = path.join(__dirname, '../public/pokemon-data.json')
const OUTPUT = path.join(__dirname, '../public/pokemon-index.json')

// Every sprite in the dataset follows this pattern, so storing 1,025 near
// identical URLs would be pure waste. The front end rebuilds them from the id.
const SPRITE_PREFIX = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/'

function main() {
  const all = JSON.parse(fs.readFileSync(SOURCE, 'utf8'))

  const offPattern = all.filter(p => p.sprite && p.sprite !== `${SPRITE_PREFIX}${p.id}.png`)
  if (offPattern.length) {
    console.warn(`  ${offPattern.length} sprites don't follow the id pattern; keeping those explicitly`)
  }

  const index = {
    generatedAt: new Date().toISOString(),
    spritePrefix: SPRITE_PREFIX,
    // [id, name, types, sprite-override-or-null] - array rows, not objects,
    // because 1,025 repetitions of the same four keys is most of the payload.
    pokemon: all.map(p => {
      const derived = `${SPRITE_PREFIX}${p.id}.png`
      return [
        p.id,
        p.name,
        p.types ?? [],
        p.sprite && p.sprite !== derived ? p.sprite : null,
      ]
    }),
  }

  fs.writeFileSync(OUTPUT, JSON.stringify(index))
  const before = (fs.statSync(SOURCE).size / 1024).toFixed(0)
  const after = (fs.statSync(OUTPUT).size / 1024).toFixed(1)
  console.log(`${index.pokemon.length} Pokémon indexed`)
  console.log(`Wrote ${OUTPUT}`)
  console.log(`  ${before} KB source -> ${after} KB index`)
}

main()
