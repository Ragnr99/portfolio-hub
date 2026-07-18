// Script to fetch ALL Pokémon data from PokéAPI and save to local file
// Run this once: node scripts/fetch-pokemon-data.js

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const TOTAL_POKEMON = 1025
const OUTPUT_FILE = path.join(__dirname, '../public/pokemon-data.json')

async function fetchAllPokemon() {
  console.log(`Fetching data for ${TOTAL_POKEMON} Pokémon...`)
  const pokemonData = []

  for (let i = 1; i <= TOTAL_POKEMON; i++) {
    try {
      console.log(`Fetching ${i}/${TOTAL_POKEMON}...`)

      // Fetch Pokemon data
      const pokemonRes = await fetch(`https://pokeapi.co/api/v2/pokemon/${i}`)
      const pokemon = await pokemonRes.json()

      // Calculate base stat total
      const baseStatTotal = pokemon.stats.reduce((sum, stat) => sum + stat.base_stat, 0)

      // Fetch species data for evolution chain
      const speciesRes = await fetch(pokemon.species.url)
      const species = await speciesRes.json()

      // Fetch evolution chain
      let evolutionChain = null
      if (species.evolution_chain) {
        const evolutionRes = await fetch(species.evolution_chain.url)
        evolutionChain = await evolutionRes.json()
      }

      // Process ALL moves
      const allMoves = []
      const levelUpMoves = pokemon.moves.filter(m =>
        m.version_group_details.some(v => v.move_learn_method.name === 'level-up')
      )

      console.log(`  Fetching ${levelUpMoves.length} moves for ${pokemon.name}...`)

      for (const moveEntry of levelUpMoves) {
        try {
          const moveRes = await fetch(moveEntry.move.url)
          const moveData = await moveRes.json()

          const learnLevel = moveEntry.version_group_details
            .find(v => v.move_learn_method.name === 'level-up')?.level_learned_at || 1

          allMoves.push({
            name: moveData.name,
            type: moveData.type.name,
            category: moveData.damage_class.name,
            power: moveData.power || 0,
            accuracy: moveData.accuracy || 100,
            pp: moveData.pp || 0,
            learnLevel
          })
        } catch (err) {
          console.error(`    Error fetching move: ${moveEntry.move.name}`)
        }
      }

      // Sort moves by learn level (descending)
      allMoves.sort((a, b) => b.learnLevel - a.learnLevel)

      // Store Pokemon data
      pokemonData.push({
        id: pokemon.id,
        name: pokemon.name,
        sprite: pokemon.sprites.front_default,
        types: pokemon.types.map(t => t.type.name),
        stats: {
          hp: pokemon.stats[0].base_stat,
          attack: pokemon.stats[1].base_stat,
          defense: pokemon.stats[2].base_stat,
          spAttack: pokemon.stats[3].base_stat,
          spDefense: pokemon.stats[4].base_stat,
          speed: pokemon.stats[5].base_stat,
          total: baseStatTotal
        },
        abilities: pokemon.abilities.map(a => ({
          name: a.ability.name,
          isHidden: a.is_hidden
        })),
        moves: allMoves,
        evolutionChainId: evolutionChain?.id || null,
        generation: species.generation.name
      })

      // Rate limit: wait 100ms between requests
      await new Promise(resolve => setTimeout(resolve, 100))

    } catch (error) {
      console.error(`Error fetching Pokemon #${i}:`, error.message)
    }
  }

  // Save to file
  console.log(`\nSaving data to ${OUTPUT_FILE}...`)
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(pokemonData, null, 2))
  console.log(`✓ Done! Saved ${pokemonData.length} Pokémon to pokemon-data.json`)
  console.log(`File size: ${(fs.statSync(OUTPUT_FILE).size / 1024 / 1024).toFixed(2)} MB`)
}

fetchAllPokemon().catch(console.error)
