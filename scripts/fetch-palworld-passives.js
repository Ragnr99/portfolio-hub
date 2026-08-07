// Build the passive-skill dataset used by the Passive Dex page.
// Run this when the game patches: node scripts/fetch-palworld-passives.js
//
// Source is the same palcalc dump the Palpedia uses, which is generated from
// the game's own DataTables. Its PassiveSkills array carries 1,905 rows, but
// only the 115 with IsStandardPassiveSkill are skills a Pal can actually hold:
// the rest are test rows, boss-only internals and unused leftovers.
//
// The dump gives each skill a Rank and the English description string, but its
// TrackedEffects array is empty, so the numbers only exist as prose. The Dex
// needs them as numbers, because the whole point of the page is adding four
// skills together. So this script parses every description line into typed
// effects.
//
// Parsing game prose is normally a bad idea, and it would be here too if it
// were best-effort. It isn't: RULES below has to match every line of every
// description, and the script throws if even one line goes unmatched. There are
// 135 distinct lines across the 115 skills, which is small enough to cover
// exhaustively and small enough that a patch adding new wording fails the build
// loudly instead of silently dropping a stat.

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUTPUT_FILE = path.join(__dirname, '../public/palworld-passives.json')

const DB_URL = 'https://raw.githubusercontent.com/tylercamp/palcalc/main/PalCalc.Model/db.json'

/**
 * The game's description text uses the pre-release element names. The rest of
 * the site uses the in-game UI names, so normalize here rather than in the page.
 */
const ELEMENT_ALIASES = {
  Neutral: 'Neutral',
  Fire: 'Fire',
  Water: 'Water',
  Lightning: 'Electric',
  Electric: 'Electric',
  Grass: 'Grass',
  Ice: 'Ice',
  Earth: 'Ground',
  Ground: 'Ground',
  Dark: 'Dark',
  Dragon: 'Dragon',
}

const ELEMENT_RE = Object.keys(ELEMENT_ALIASES).join('|')

/**
 * Line patterns, in order. First match wins, so put narrow patterns above the
 * broad ones they'd otherwise be swallowed by.
 *
 * Each rule is [regex, (match) => effects]. An effect is
 * { stat, value, unit } for anything numeric, or { stat, flag: true } for the
 * on/off ones. `null` means "this line carries no effect" and is only used for
 * the footnotes and flavour lines listed at the bottom.
 *
 * Sign convention: positive is always good for the player. Depletion rates are
 * the ones this actually changes anything for - "Hunger decreases 15% faster"
 * is stored as -15, so that four skills can be summed without the page having
 * to know which direction each stat wants to go.
 */
const RULES = [
  // --- flat stat lines, "Attack +20%" style -------------------------------
  [/^Attack ([+-]\d+(?:\.\d+)?)%$/, m => [{ stat: 'attack', value: +m[1] }]],
  [/^Defense ([+-]\d+(?:\.\d+)?)%$/, m => [{ stat: 'defense', value: +m[1] }]],
  [/^Work Speed ([+-]\d+(?:\.\d+)?)%$/, m => [{ stat: 'workSpeed', value: +m[1] }]],
  [/^(?:Max Health|HP) ([+-]\d+(?:\.\d+)?)%$/, m => [{ stat: 'maxHealth', value: +m[1] }]],
  [/^Max(?:imum)? [Ss]tamina ([+-]\d+(?:\.\d+)?)%$/, m => [{ stat: 'maxStamina', value: +m[1] }]],
  [/^Movement Speed ([+-]\d+(?:\.\d+)?)%$/, m => [{ stat: 'moveSpeed', value: +m[1] }]],
  [/^Movement Speed increases (\d+(?:\.\d+)?)%$/, m => [{ stat: 'moveSpeed', value: +m[1] }]],
  [/^(\d+(?:\.\d+)?)% increase to movement speed\.?$/, m => [{ stat: 'moveSpeed', value: +m[1] }]],
  [/^(\d+(?:\.\d+)?)% increase movement speed on water\.?$/, m => [{ stat: 'waterMoveSpeed', value: +m[1] }]],
  [/^(\d+(?:\.\d+)?)% increase to defense\.?$/, m => [{ stat: 'defense', value: +m[1] }]],

  // --- elemental attack and resistance ------------------------------------
  [
    new RegExp(`^(\\d+(?:\\.\\d+)?)% increase (?:in|to) (${ELEMENT_RE}) attack damage\\.?$`),
    m => [{ stat: `atk:${ELEMENT_ALIASES[m[2]]}`, value: +m[1] }],
  ],
  [
    new RegExp(`^(\\d+(?:\\.\\d+)?)% decrease in incoming (${ELEMENT_RE}) damage\\.?$`),
    m => [{ stat: `res:${ELEMENT_ALIASES[m[2]]}`, value: +m[1] }],
  ],
  [
    new RegExp(`^(${ELEMENT_RE}) damage reduction (\\d+(?:\\.\\d+)?)%$`),
    m => [{ stat: `res:${ELEMENT_ALIASES[m[1]]}`, value: +m[2] }],
  ],

  // --- effects on the player, not the Pal ---------------------------------
  [/^(\d+(?:\.\d+)?)% increase in Player Attack\.?$/, m => [{ stat: 'playerAttack', value: +m[1] }]],
  [/^(\d+(?:\.\d+)?)% increase in Player Defense\.?$/, m => [{ stat: 'playerDefense', value: +m[1] }]],
  [/^(\d+(?:\.\d+)?)% increase in Player Work Speed\.?$/, m => [{ stat: 'playerWorkSpeed', value: +m[1] }]],
  [/^(\d+(?:\.\d+)?)% increase in Player Mining Efficiency\.?$/, m => [{ stat: 'playerMining', value: +m[1] }]],
  [/^(\d+(?:\.\d+)?)% increase in Player Logging Efficiency\.?$/, m => [{ stat: 'playerLogging', value: +m[1] }]],
  // Consumption is already negative in the text, and less consumption is good,
  // so flip it: -5.0% consumption is stored as +5 "stamina saved".
  [/^Player Stamina Consumption (-?\d+(?:\.\d+)?)%$/, m => [{ stat: 'playerStaminaSaved', value: -+m[1] }]],
  [/^Player Auto Health Regeneration Rate ([+-]\d+(?:\.\d+)?)%$/, m => [{ stat: 'playerRegen', value: +m[1] }]],
  [/^Player Reload Speed ([+-]\d+(?:\.\d+)?)%$/, m => [{ stat: 'playerReload', value: +m[1] }]],

  // --- regeneration and lifesteal -----------------------------------------
  [
    /^Pal and Player Auto Health Regeneration Rate ([+-]\d+(?:\.\d+)?)%$/,
    m => [
      { stat: 'palRegen', value: +m[1] },
      { stat: 'playerRegen', value: +m[1] },
    ],
  ],
  [/^Pal Auto Health Regeneration Rate ([+-]\d+(?:\.\d+)?)%$/, m => [{ stat: 'palRegen', value: +m[1] }]],
  [/^Life Steal ([+-]\d+(?:\.\d+)?)%$/, m => [{ stat: 'lifeSteal', value: +m[1] }]],

  // --- hunger and SAN ------------------------------------------------------
  // "faster" is bad, "slower" is good, and 1.0 added two more phrasings for the
  // same two ideas on the World Tree skills.
  [/^Hunger decreases \+(\d+(?:\.\d+)?)% faster\.?$/, m => [{ stat: 'hungerRate', value: -+m[1] }]],
  [/^Hunger decreases \+(\d+(?:\.\d+)?)% slower\.?$/, m => [{ stat: 'hungerRate', value: +m[1] }]],
  [/^Decrease Hunger depletion rate by \+(\d+(?:\.\d+)?)%$/, m => [{ stat: 'hungerRate', value: +m[1] }]],
  [/^Increases Hunger depletion rate by \+(\d+(?:\.\d+)?)%$/, m => [{ stat: 'hungerRate', value: -+m[1] }]],
  [/^SAN drops \+(\d+(?:\.\d+)?)% faster\.?$/, m => [{ stat: 'sanRate', value: -+m[1] }]],
  [/^SAN drops \+(\d+(?:\.\d+)?)% slower\.?$/, m => [{ stat: 'sanRate', value: +m[1] }]],
  // Demon's Hand ships with "dreceases" misspelled in the game data. Matching
  // the typo is deliberate: if a patch fixes it, this rule stops matching and
  // the build fails, which is the correct outcome.
  [/^SAN dreceases \+(\d+(?:\.\d+)?)% faster$/, m => [{ stat: 'sanRate', value: -+m[1] }]],
  [/^SAN depletion rate (-?\d+(?:\.\d+)?)%$/, m => [{ stat: 'sanRate', value: -+m[1] }]],

  // --- cooldowns -----------------------------------------------------------
  [/^Active skill cooldown reduction (\d+(?:\.\d+)?)%$/, m => [{ stat: 'cooldown', value: +m[1] }]],
  // Easygoing reads "extension -15%", meaning cooldowns get 15% longer.
  [/^Active skill cooldown extension -(\d+(?:\.\d+)?)%$/, m => [{ stat: 'cooldown', value: -+m[1] }]],

  // --- base, economy and breeding -----------------------------------------
  [/^Increases the value of items when sold by \+(\d+(?:\.\d+)?)%$/, m => [{ stat: 'sellValue', value: +m[1] }]],
  [/^Decrease the value of items when sold by -(\d+(?:\.\d+)?)%$/, m => [{ stat: 'sellValue', value: -+m[1] }]],
  [/^Your Dropped Items \+ ?(\d+(?:\.\d+)?)%$/, m => [{ stat: 'dropRate', value: +m[1] }]],
  [
    /^When assigned to a Breeding Farm, breeding speed is increased by (\d+(?:\.\d+)?)%\.?$/,
    m => [{ stat: 'breedingSpeed', value: +m[1] }],
  ],
  [
    /^While at a base, increases egg production speed by \+(\d+(?:\.\d+)?)% and incubation speed by \+(\d+(?:\.\d+)?)% for Pals assigned to a Breeding Farm\.?$/,
    m => [
      { stat: 'eggProduction', value: +m[1] },
      { stat: 'incubationSpeed', value: +m[2] },
    ],
  ],
  [
    /^Farming's Work Suitability \+(\d+)$/,
    m => [{ stat: 'farmingSuitability', value: +m[1], unit: 'level' }],
  ],
  [/^Mounted Jump Count \+(\d+)$/, m => [{ stat: 'mountedJumps', value: +m[1], unit: 'count' }]],

  // --- on/off effects ------------------------------------------------------
  [/^Immune to Flinch$/, () => [{ stat: 'immuneFlinch', flag: true }]],
  [/^Immune to Knockback$/, () => [{ stat: 'immuneKnockback', flag: true }]],
  [/^Immune to Explosion Damage$/, () => [{ stat: 'immuneExplosion', flag: true }]],
  [/^Immune to Poison Damage$/, () => [{ stat: 'immunePoison', flag: true }]],
  [/^Immune to Burn Damage$/, () => [{ stat: 'immuneBurn', flag: true }]],
  [/^Does not sleep and continues to work even at night\.$/, () => [{ stat: 'insomnia', flag: true }]],
  [/^Does not sleep at night and continues to work\.$/, () => [{ stat: 'insomnia', flag: true }]],
  [/^Tends to nap through the day, due to being nocturnal\.$/, () => [{ stat: 'daySleeper', flag: true }]],
  [/^Absorbs a portion of the damage dealt to restore Health\.$/, () => [{ stat: 'lifeStealUnquantified', flag: true }]],
  [/^Will not reduce the target's Health below 1\.$/, () => [{ stat: 'nonLethal', flag: true }]],
  [
    /^World Tree (?:resources|harvestables) (?:will not|won't) vanish when approached\.$/,
    () => [{ stat: 'worldTreeHarvest', flag: true }],
  ],

  // --- lines that carry no effect -----------------------------------------
  // The rideable footnote is a caveat on the line above it, kept on the skill
  // as a note rather than thrown away.
  [/^\*This effect is only valid for rideable pals\.$/, () => null],
  // Mercy Hit's first line. Despite the wording this is not the Pacifist skill
  // and costs no Attack: the internal name is NonKilling, and the line is just
  // naming the behaviour that its second line then defines.
  [/^Pacifist\.$/, () => null],
]

/** The rideable-only caveat, attached to whichever skills print it. */
const RIDEABLE_NOTE = 'Only applies while the Pal is being ridden.'

function parseDescription(name, description) {
  const effects = []
  const notes = []
  const lines = (description ?? '')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)

  for (const line of lines) {
    const rule = RULES.find(([re]) => re.test(line))
    if (!rule) {
      throw new Error(
        `Unparsed description line on "${name}":\n  ${line}\n` +
        `Add a rule for it in RULES, or the Dex will silently drop the stat.`
      )
    }
    const produced = rule[1](line.match(rule[0]))
    if (produced) effects.push(...produced)
    else if (/rideable pals/.test(line)) notes.push(RIDEABLE_NOTE)
  }

  return { effects, notes, lines }
}

async function main() {
  console.log('Fetching palcalc db.json…')
  const res = await fetch(DB_URL, { headers: { 'User-Agent': 'portfolio-hub palworld passive build' } })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${DB_URL}`)
  const db = await res.json()

  const standard = db.PassiveSkills.filter(s => s.IsStandardPassiveSkill)
  console.log(`${standard.length} standard passive skills of ${db.PassiveSkills.length} rows.`)

  const skills = standard.map(s => {
    const { effects, notes, lines } = parseDescription(s.Name, s.Description)
    return {
      name: s.Name,
      internal: s.InternalName,
      rank: s.Rank,
      // What the game itself prints, kept verbatim so the page can show the
      // real wording next to our parse of it.
      lines,
      effects,
      notes,
      // Breeding reachability: 30 skills can't be inherited at all (they're
      // boss drops or item-only), and 12 are the rare tier that rolls at a
      // 5/100 weight against the usual 100.
      inheritable: s.RandomInheritanceAllowed,
      inheritWeight: s.RandomInheritanceAllowed ? s.RandomInheritanceWeight : 0,
      // Non-zero means a Passive Skill Fruit / surgery can install it.
      surgeryCost: s.SurgeryCost,
      hasSurgeryItem: Boolean(s.SurgeryRequiredItem),
    }
  })

  // Sanity pass: a skill with a description but no parsed effects and no flags
  // means a rule matched but produced nothing useful.
  const empty = skills.filter(s => s.lines.length && !s.effects.length)
  if (empty.length) {
    throw new Error(`Skills parsed to zero effects: ${empty.map(s => s.name).join(', ')}`)
  }

  const stats = [...new Set(skills.flatMap(s => s.effects.map(e => e.stat)))].sort()

  const out = {
    generatedAt: new Date().toISOString(),
    gameVersion: '1.0',
    sources: {
      skills: 'https://github.com/tylercamp/palcalc (game files)',
    },
    stats,
    skills: skills.sort((a, b) => b.rank - a.rank || a.name.localeCompare(b.name)),
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(out))
  const kb = (fs.statSync(OUTPUT_FILE).size / 1024).toFixed(1)
  console.log(`Wrote ${skills.length} skills across ${stats.length} distinct stats -> ${OUTPUT_FILE} (${kb}KB)`)
}

main().catch(e => {
  console.error(e.message)
  process.exit(1)
})
