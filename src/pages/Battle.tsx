/**
 * Pokemon Battle System
 *
 * This is the main battle page with three major sections:
 * 1. Team Manager - Create and manage your teams
 * 2. Battle Setup - Choose teams and battle mode
 * 3. Battle - The actual Pokemon battle with turn-based combat
 *
 * Features:
 * - Player vs Player (hot-seat multiplayer)
 * - Player vs AI
 * - Full Pokemon damage calculation
 * - Status conditions (burn, poison, sleep, paralyze, freeze)
 * - Team builder with move customization
 * - Persistent team storage (localStorage)
 */

import { useState, useEffect, useMemo } from 'react'
import { Swords, Heart, Shield, Zap, Edit, Trash2, Plus } from 'lucide-react'
import { TYPE_COLORS, MAX_TEAM_SIZE, MAX_MOVES, DEFAULT_LEVEL, NATURES } from '../utils/pokemonConstants'
import { calculateDamage, applyStatusEffect, getTypeEffectiveness } from '../utils/battleUtils'
import { usePokemonData } from '../hooks/usePokemonData'
import type { Nature, EVSpread, IVSpread } from '../utils/statCalculations'
import {
  calculateHP,
  calculateStat,
  getNatureMultiplier,
  generateRandomIVs,
  getDefaultEVSpread,
  getRecommendedNature,
} from '../utils/statCalculations'
import type { Ability } from '../utils/abilities'
import {
  ABILITIES,
  getAbility,
  checkTypeImmunity,
  checkStatusImmunity,
  getAbilityDamageModifier,
  getAbilityDefenseModifier,
  getRandomAbilityForPokemon,
} from '../utils/abilities'

/**
 * BattlePokemon Interface
 *
 * Represents a Pokemon in battle with all its stats and state.
 * This is more detailed than the raw Pokemon data because it tracks:
 * - Current HP (takes damage during battle)
 * - Status conditions (burn, poison, etc.)
 * - Stat stage modifications (buffs/debuffs)
 * - Active moveset (4 moves the Pokemon knows)
 */
interface BattlePokemon {
  id: number           // Unique ID for this Pokemon
  name: string         // Pokemon name (like "Charizard")
  sprite: string       // URL to the Pokemon's image
  types: string[]      // Pokemon types (can have 1 or 2)
  hp: number           // Current HP (goes down when damaged)
  maxHp: number        // Maximum HP (for healing and HP bar display)
  attack: number       // Physical attack stat
  defense: number      // Physical defense stat
  spAttack: number     // Special attack stat
  spDefense: number    // Special defense stat
  speed: number        // Speed stat (faster Pokemon attack first)
  level: number        // Pokemon level (default 50)
  moves: BattleMove[]  // The 4 moves this Pokemon knows
  allMoves?: BattleMove[] // All available moves (for move selection in team builder)
  status: 'none' | 'burn' | 'paralyze' | 'sleep' | 'poison' | 'freeze' // Status condition
  sleepTurns: number   // How many turns left asleep (1-3)
  statStages: {        // Stat modifications from moves like Swords Dance
    attack: number     // -6 to +6 (0 = neutral)
    defense: number
    spAttack: number
    spDefense: number
    speed: number
  }
  // Competitive features
  nature: Nature       // Nature (affects stat growth)
  evs: EVSpread        // Effort Values (training bonuses)
  ivs: IVSpread        // Individual Values (genetic bonuses)
  ability: string      // Pokemon's ability (passive effect like Intimidate or Levitate)
}

/**
 * BattleMove Interface
 *
 * Represents a Pokemon move with all its properties.
 */
interface BattleMove {
  name: string     // Move name (like "Flamethrower")
  type: string     // Move type (like "fire")
  category: 'physical' | 'special' | 'status' // Physical = uses Attack, Special = uses Sp. Attack
  power: number    // Base power (higher = more damage, 0 for status moves)
  accuracy: number // Hit chance (0-100, most moves are 100)
}

/**
 * Team Interface
 *
 * Represents a saved team of Pokemon.
 * Teams are stored in localStorage so you don't lose them on refresh.
 */
interface Team {
  id: string              // Unique ID for this team
  name: string            // Team name (like "Fire Squad")
  pokemon: BattlePokemon[] // Array of 1-3 Pokemon
}


export default function Battle() {
  // ==================== DATA LOADING ====================
  // Load Pokemon data from our JSON file (with global caching)
  const { availablePokemon, loading } = usePokemonData()

  // ==================== GAME STATE ====================
  // Controls which screen we're showing
  // 'team-manager' = manage teams screen
  // 'team-editor' = editing a specific team
  // 'battle-setup' = choosing teams and battle mode
  // 'battle' = actual battle is happening
  const [gameState, setGameState] = useState<'team-manager' | 'team-editor' | 'battle-setup' | 'battle'>('team-manager')

  // ==================== TEAM MANAGEMENT ====================
  // Load saved teams from localStorage (or empty array if none saved)
  const [teams, setTeams] = useState<Team[]>(() => {
    const saved = localStorage.getItem('pokemon-teams')
    return saved ? JSON.parse(saved) : []
  })

  // Track which team we're currently editing
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  // Track which Pokemon in the team we're editing moves for
  const [editingPokemonIndex, setEditingPokemonIndex] = useState<number | null>(null)

  // ==================== BATTLE MODE ====================
  // Battle mode determines how the battle works:
  // 'player-vs-player' = Both players control their teams (hot-seat)
  // 'player-vs-ai' = You vs computer
  // 'ai-vs-ai' = Watch two AI teams fight
  const [battleMode, setBattleMode] = useState<'player-vs-player' | 'player-vs-ai' | 'ai-vs-ai'>('player-vs-player')

  // In Player vs Player mode, this tracks whose turn it is
  const [currentTurn, setCurrentTurn] = useState<'team1' | 'team2'>('team1')

  // ==================== BATTLE STATE ====================
  // The two teams selected for battle (from the team manager)
  const [team1, setTeam1] = useState<Team | null>(null)
  const [team2, setTeam2] = useState<Team | null>(null)

  // The actual Pokemon teams in battle (Team 1 = player, Team 2 = enemy)
  const [playerTeam, setPlayerTeam] = useState<BattlePokemon[]>([])
  const [enemyTeam, setEnemyTeam] = useState<BattlePokemon[]>([])

  // Currently active Pokemon (the ones actually fighting)
  const [playerActive, setPlayerActive] = useState<BattlePokemon | null>(null)
  const [enemyActive, setEnemyActive] = useState<BattlePokemon | null>(null)

  // ==================== BATTLE UI STATE ====================
  // Battle log shows messages like "Charizard used Flamethrower!"
  const [battleLog, setBattleLog] = useState<string[]>([])

  // UI state for switching Pokemon
  const [showSwitchMenu, setShowSwitchMenu] = useState(false)

  // Currently selected move (before confirming)
  const [selectedMove, setSelectedMove] = useState<BattleMove | null>(null)

  // Animation state (prevents spamming attacks)
  const [isAnimating, setIsAnimating] = useState(false)

  // Which Pokemon is currently animating (for attack animation)
  const [animatingPokemon, setAnimatingPokemon] = useState<'player' | 'enemy' | null>(null)

  // ==================== PERSISTENCE ====================
  // Save teams to localStorage whenever they change
  // This way you don't lose your teams when you refresh the page
  useEffect(() => {
    localStorage.setItem('pokemon-teams', JSON.stringify(teams))
  }, [teams])

  /**
   * Create a Battle-Ready Pokemon
   *
   * Takes raw Pokemon data and converts it into a fully battle-ready Pokemon.
   * NOW WITH COMPETITIVE FEATURES:
   * - EVs (Effort Values) for customized stat training
   * - IVs (Individual Values) for genetic variation
   * - Natures for strategic stat modifications
   * - Calculating stats with the official Pokemon formula
   * - Setting up moves (either custom or auto-selecting good ones)
   * - Initializing battle state (HP, status, stat stages)
   *
   * Stat formula (with EVs/IVs/Natures):
   * HP = floor(((2 * Base + IV + floor(EV / 4)) * Level / 100)) + Level + 10
   * Other = floor((floor(((2 * Base + IV + floor(EV / 4)) * Level / 100)) + 5) * Nature)
   *
   * @param data - Raw Pokemon data from our JSON file
   * @param level - Pokemon level (default 50)
   * @param customMoves - Optional custom moveset (for team builder)
   * @param customNature - Optional nature (auto-selects best one if not provided)
   * @param customEVs - Optional EV spread (auto-generates optimal if not provided)
   * @param customIVs - Optional IVs (defaults to perfect 31s)
   * @returns Fully initialized BattlePokemon ready for battle
   */
  const createBattlePokemon = (
    data: any,
    level: number = 50,
    customMoves?: BattleMove[],
    customNature?: Nature,
    customEVs?: EVSpread,
    customIVs?: IVSpread,
    customAbility?: string
  ): BattlePokemon => {
    // Generate or use provided competitive values
    const nature = customNature || getRecommendedNature(data.stats)
    const evs = customEVs || getDefaultEVSpread(data.stats)
    const ivs = customIVs || generateRandomIVs(true) // Default to perfect IVs
    const ability = customAbility || getRandomAbilityForPokemon(data.name)

    // Calculate stats using the new competitive formula
    // This now includes EVs, IVs, and Nature modifiers!
    const stats = {
      hp: calculateHP(data.stats.hp, ivs.hp, evs.hp, level),
      attack: calculateStat(data.stats.attack, ivs.attack, evs.attack, level, getNatureMultiplier(nature, 'attack')),
      defense: calculateStat(data.stats.defense, ivs.defense, evs.defense, level, getNatureMultiplier(nature, 'defense')),
      spAttack: calculateStat(data.stats.spAttack, ivs.spAttack, evs.spAttack, level, getNatureMultiplier(nature, 'spAttack')),
      spDefense: calculateStat(data.stats.spDefense, ivs.spDefense, evs.spDefense, level, getNatureMultiplier(nature, 'spDefense')),
      speed: calculateStat(data.stats.speed, ivs.speed, evs.speed, level, getNatureMultiplier(nature, 'speed')),
    }

    // Get all moves this Pokemon can learn up to this level
    // Our JSON file has all moves with the level they're learned at
    const allMoves: BattleMove[] = data.moves
      .filter((m: any) => m.learnLevel <= level) // Only moves learned by this level
      .map((m: any) => ({
        name: m.name,
        type: m.type,
        category: m.category as 'physical' | 'special' | 'status',
        power: m.power || 0,
        accuracy: m.accuracy || 100,
      }))

    // If custom moves were provided (from team builder), use those
    if (customMoves && customMoves.length > 0) {
      return {
        id: data.id,
        name: data.name,
        sprite: data.sprite,
        types: data.types,
        hp: stats.hp,
        maxHp: stats.hp,
        attack: stats.attack,
        defense: stats.defense,
        spAttack: stats.spAttack,
        spDefense: stats.spDefense,
        speed: stats.speed,
        level,
        moves: customMoves.slice(0, 4),
        allMoves,
        status: 'none',
        sleepTurns: 0,
        statStages: { attack: 0, defense: 0, spAttack: 0, spDefense: 0, speed: 0 },
        // Competitive features
        nature,
        evs,
        ivs,
        ability,
      }
    }

    // Auto-select good default moves (prioritize damage over status)
    // Try to get 3 damaging moves + 1 status move for a balanced moveset
    const damagingMoves = allMoves.filter(m => m.power > 0)
    const statusMoves = allMoves.filter(m => m.power === 0)
    const defaultMoves = [...damagingMoves.slice(0, 3), ...statusMoves.slice(0, 1)].slice(0, 4)

    // Safety check: Ensure at least 1 damaging move exists
    // If the Pokemon somehow has NO damaging moves, give it a type-appropriate move
    if (defaultMoves.filter(m => m.power > 0).length === 0) {
      const primaryType = data.types[0]
      // Give a strong 90-power move based on the Pokemon's primary type
      const fallbackMove =
        primaryType === 'fire' ? { name: 'flamethrower', type: 'fire', category: 'special' as const, power: 90, accuracy: 100 } :
        primaryType === 'water' ? { name: 'surf', type: 'water', category: 'special' as const, power: 90, accuracy: 100 } :
        primaryType === 'grass' ? { name: 'energy-ball', type: 'grass', category: 'special' as const, power: 90, accuracy: 100 } :
        primaryType === 'electric' ? { name: 'thunderbolt', type: 'electric', category: 'special' as const, power: 90, accuracy: 100 } :
        { name: 'body-slam', type: 'normal', category: 'physical' as const, power: 85, accuracy: 100 }
      defaultMoves.push(fallbackMove)
      allMoves.push(fallbackMove)
    }

    // Last resort fallback: If literally no moves exist at all, give them Tackle
    if (defaultMoves.length === 0) {
      const tackle = { name: 'tackle', type: 'normal', category: 'physical' as const, power: 40, accuracy: 100 }
      defaultMoves.push(tackle)
      allMoves.push(tackle)
    }

    return {
      id: data.id,
      name: data.name,
      sprite: data.sprite,
      types: data.types,
      hp: stats.hp,
      maxHp: stats.hp,
      ...stats,
      level,
      moves: defaultMoves,
      allMoves,
      status: 'none',
      sleepTurns: 0,
      statStages: { attack: 0, defense: 0, spAttack: 0, spDefense: 0, speed: 0 },
      // Competitive features
      nature,
      evs,
      ivs,
      ability,
    }
  }

  // Team management functions
  const createNewTeam = () => {
    const newTeam: Team = {
      id: Date.now().toString(),
      name: `Team ${teams.length + 1}`,
      pokemon: []
    }
    setTeams([...teams, newTeam])
    setEditingTeam(newTeam)
    setGameState('team-editor')
  }

  const deleteTeam = (teamId: string) => {
    setTeams(teams.filter(t => t.id !== teamId))
  }

  const updateTeamName = (teamId: string, newName: string) => {
    setTeams(teams.map(t => t.id === teamId ? { ...t, name: newName } : t))
  }

  const addPokemonToTeam = (pokemonData: any) => {
    if (!editingTeam || editingTeam.pokemon.length >= MAX_TEAM_SIZE) return

    const battleMon = createBattlePokemon(pokemonData)
    const updatedTeam = {
      ...editingTeam,
      pokemon: [...editingTeam.pokemon, battleMon]
    }
    setEditingTeam(updatedTeam)
    setTeams(teams.map(t => t.id === editingTeam.id ? updatedTeam : t))
  }

  const removePokemonFromTeam = (index: number) => {
    if (!editingTeam) return

    const updatedTeam = {
      ...editingTeam,
      pokemon: editingTeam.pokemon.filter((_, i) => i !== index)
    }
    setEditingTeam(updatedTeam)
    setTeams(teams.map(t => t.id === editingTeam.id ? updatedTeam : t))
  }

  const updatePokemonMoves = (pokemonIndex: number, newMoves: BattleMove[]) => {
    if (!editingTeam) return

    const updatedPokemon = editingTeam.pokemon.map((p, i) => {
      if (i === pokemonIndex) {
        return { ...p, moves: newMoves.slice(0, 4), allMoves: p.allMoves }
      }
      return p
    })

    const updatedTeam = { ...editingTeam, pokemon: updatedPokemon }
    setEditingTeam(updatedTeam)
    setTeams(teams.map(t => t.id === editingTeam.id ? updatedTeam : t))
  }

  const addToTeam = async (pokemonData: any) => {
    if (playerTeam.length >= 3) return
    const battleMon = await createBattlePokemon(pokemonData)
    setPlayerTeam([...playerTeam, battleMon])
  }

  const generateRandomTeam = async (): Promise<BattlePokemon[]> => {
    const team = []
    for (let i = 0; i < 3; i++) {
      const random = availablePokemon[Math.floor(Math.random() * availablePokemon.length)]
      const battleMon = await createBattlePokemon(random)
      team.push(battleMon)
    }
    return team
  }

  const startBattle = async () => {
    let team1 = playerTeam
    let team2: BattlePokemon[] = []

    if (battleMode === 'random') {
      team1 = await generateRandomTeam()
      team2 = await generateRandomTeam()
      setPlayerTeam(team1)
    } else {
      if (team1.length === 0) return
      team2 = await generateRandomTeam()
    }

    setEnemyTeam(team2)
    setPlayerActive(team1[0])
    setEnemyActive(team2[0])
    setBattleLog(['Battle started!'])
    setGameState('battle')
  }

  // ==================================================================================
  // STATUS CONDITION FUNCTIONS
  // ==================================================================================
  // These handle applying and processing status effects like burn, poison, sleep, etc.

  /**
   * Apply Status Condition to Pokemon
   *
   * Inflicts a status condition on a Pokemon (if they don't already have one).
   * Pokemon can only have ONE status at a time - no stacking!
   *
   * @param pokemon - The Pokemon to afflict
   * @param status - The status to apply
   * @returns Updated Pokemon with status applied
   */
  const applyStatus = (pokemon: BattlePokemon, status: 'burn' | 'paralyze' | 'sleep' | 'poison' | 'freeze'): BattlePokemon => {
    // Can't apply status if Pokemon already has one
    if (pokemon.status !== 'none') return pokemon

    const updated = { ...pokemon, status }

    // Sleep requires tracking how many turns they'll be asleep (random 1-3)
    if (status === 'sleep') {
      updated.sleepTurns = Math.floor(Math.random() * 3) + 1
    }
    return updated
  }

  /**
   * Process End-of-Turn Status Damage
   *
   * Handles passive damage from burn and poison at the end of each turn.
   * Burn = 1/16 of max HP
   * Poison = 1/8 of max HP (double burn damage!)
   *
   * @param pokemon - The Pokemon with a status condition
   * @returns Object with updated Pokemon, damage dealt, and message
   */
  const processTurnEndStatus = (pokemon: BattlePokemon): { pokemon: BattlePokemon, damage: number, message: string } => {
    let damage = 0
    let message = ''

    if (pokemon.status === 'burn') {
      damage = Math.floor(pokemon.maxHp / 16)
      message = `${pokemon.name} is hurt by burn!`
    } else if (pokemon.status === 'poison') {
      damage = Math.floor(pokemon.maxHp / 8)
      message = `${pokemon.name} is hurt by poison!`
    }

    return {
      pokemon: { ...pokemon, hp: Math.max(0, pokemon.hp - damage) },
      damage,
      message
    }
  }

  // ==================================================================================
  // BATTLE ACTION FUNCTIONS
  // ==================================================================================
  // These handle the core battle actions: switching Pokemon, using moves, and turn execution

  /**
   * Switch to a Different Pokemon (Team 1)
   *
   * Switches out the current active Pokemon for a different one from your team.
   * In PvP mode: Just switches turns after the swap
   * In AI mode: Enemy gets a free attack when you switch (risk vs reward!)
   *
   * @param newPokemon - The Pokemon to switch in
   */
  const switchPokemon = (newPokemon: BattlePokemon) => {
    if (!enemyActive) return

    setPlayerActive(newPokemon)
    setShowSwitchMenu(false)

    const newLog = [...battleLog, `Go ${newPokemon.name}!`]
    setBattleLog(newLog)

    // In PvP mode, just switch turns. In AI mode, enemy gets free attack
    if (battleMode === 'player-vs-player') {
      setTimeout(() => switchTurn(), 500)
    } else {
      // Enemy gets a free attack when you switch in AI mode
      setTimeout(() => {
        const enemyMove = enemyActive.moves[Math.floor(Math.random() * enemyActive.moves.length)]
        const enemyDamage = calculateDamage(enemyActive, newPokemon, enemyMove)
        const newPlayerHp = Math.max(0, newPokemon.hp - enemyDamage)

        const updatedPlayer = { ...newPokemon, hp: newPlayerHp }
        setPlayerActive(updatedPlayer)

        // Update player team with new HP
        const updatedPlayerTeam = playerTeam.map(p =>
          p.id === updatedPlayer.id ? updatedPlayer : p
        )
        setPlayerTeam(updatedPlayerTeam)

        setBattleLog([...newLog, `${enemyActive.name} used ${enemyMove.name}!`, `Dealt ${enemyDamage} damage!`])
      }, 1000)
    }
  }

  /**
   * Switch to a Different Pokemon (Team 2)
   *
   * Same as switchPokemon but for Team 2 in Player vs Player mode.
   * Switches the enemy's active Pokemon to a different one.
   *
   * @param newPokemon - The Pokemon to switch in
   */
  const switchEnemyPokemon = (newPokemon: BattlePokemon) => {
    if (!playerActive) return

    setEnemyActive(newPokemon)
    setShowSwitchMenu(false)

    const newLog = [...battleLog, `Go ${newPokemon.name}!`]
    setBattleLog(newLog)

    // In PvP mode, switch turns after the Pokemon swap
    if (battleMode === 'player-vs-player') {
      setTimeout(() => switchTurn(), 500)
    }
  }

  /**
   * Use a Move
   *
   * The main function called when a player selects a move.
   * Determines who attacks who based on the battle mode:
   *
   * Player vs Player mode:
   * - Team 1's turn: playerActive attacks enemyActive
   * - Team 2's turn: enemyActive attacks playerActive
   *
   * Player vs AI mode:
   * - Player always attacks first, then AI responds
   *
   * @param move - The move to use
   */
  const useMove = (move: BattleMove) => {
    if (!playerActive || !enemyActive) return

    // Player vs Player: Determine attacker/defender based on whose turn it is
    if (battleMode === 'player-vs-player') {
      if (currentTurn === 'team1') {
        // Team 1's turn - player attacks enemy
        executeTurn(playerActive, enemyActive, move, 'player')
      } else {
        // Team 2's turn - enemy attacks player
        executeTurn(enemyActive, playerActive, move, 'enemy')
      }
    } else {
      // AI mode - player acts, then AI responds with aiRespond=true
      executeTurn(playerActive, enemyActive, move, 'player', true)
    }
  }

  /**
   * Execute a Battle Turn
   *
   * This is THE BIG ONE - the core battle logic that handles everything:
   * 1. Check if attacker is frozen/asleep/paralyzed (might not be able to move!)
   * 2. Play attack animation
   * 3. Calculate and deal damage
   * 4. Update HP and check for fainting
   * 5. Apply end-of-turn status damage (burn/poison)
   * 6. Handle fainting and victory conditions
   *
   * @param attacker - The Pokemon using the move
   * @param defender - The Pokemon getting hit
   * @param move - The move being used
   * @param attackerSide - Which side is attacking ('player' or 'enemy')
   * @param aiRespond - Whether AI should respond after this turn (AI mode only)
   */
  const executeTurn = (
    attacker: BattlePokemon,
    defender: BattlePokemon,
    move: BattleMove,
    attackerSide: 'player' | 'enemy',
    aiRespond: boolean = false
  ) => {
    const newLog = [...battleLog]

    // Check if attacker is frozen/asleep/paralyzed
    if (attacker.status === 'freeze') {
      if (Math.random() < 0.8) {
        newLog.push(`${attacker.name} is frozen solid!`)
        setBattleLog(newLog)
        if (battleMode === 'player-vs-player') {
          switchTurn()
        }
        return
      } else {
        newLog.push(`${attacker.name} thawed out!`)
        if (attackerSide === 'player') {
          setPlayerActive({ ...attacker, status: 'none' })
        } else {
          setEnemyActive({ ...attacker, status: 'none' })
        }
      }
    }

    if (attacker.status === 'sleep') {
      if (attacker.sleepTurns > 0) {
        newLog.push(`${attacker.name} is fast asleep!`)
        if (attackerSide === 'player') {
          setPlayerActive({ ...attacker, sleepTurns: attacker.sleepTurns - 1 })
        } else {
          setEnemyActive({ ...attacker, sleepTurns: attacker.sleepTurns - 1 })
        }
        setBattleLog(newLog)
        if (battleMode === 'player-vs-player') {
          switchTurn()
        }
        return
      } else {
        newLog.push(`${attacker.name} woke up!`)
        if (attackerSide === 'player') {
          setPlayerActive({ ...attacker, status: 'none' })
        } else {
          setEnemyActive({ ...attacker, status: 'none' })
        }
      }
    }

    if (attacker.status === 'paralyze' && Math.random() < 0.25) {
      newLog.push(`${attacker.name} is fully paralyzed!`)
      setBattleLog(newLog)
      if (battleMode === 'player-vs-player') {
        switchTurn()
      }
      return
    }

    // Attacker attacks
    newLog.push(`${attacker.name} used ${move.name}!`)
    setBattleLog(newLog)
    setAnimatingPokemon(attackerSide)

    // Calculate damage after animation delay
    setTimeout(() => {
      setAnimatingPokemon(null)
      const damage = calculateDamage(attacker, defender, move)
      const newDefenderHp = Math.max(0, defender.hp - damage)

      const damageLog = [...newLog]
      if (damage > 0) {
        damageLog.push(`Dealt ${damage} damage!`)
      }
      setBattleLog(damageLog)

      // Apply damage after showing message
      setTimeout(() => {
        // Apply status effects from certain moves
        let updatedDefender: BattlePokemon
        if (move.name === 'ember' && Math.random() < 0.1 && defender.status === 'none') {
          const burned = applyStatus(defender, 'burn')
          updatedDefender = { ...burned, hp: newDefenderHp }
          damageLog.push(`${defender.name} was burned!`)
        } else if (move.name === 'thundershock' && Math.random() < 0.1 && defender.status === 'none') {
          const paralyzed = applyStatus(defender, 'paralyze')
          updatedDefender = { ...paralyzed, hp: newDefenderHp }
          damageLog.push(`${defender.name} was paralyzed!`)
        } else {
          updatedDefender = { ...defender, hp: newDefenderHp }
        }

        // Update defender state
        if (attackerSide === 'player') {
          setEnemyActive(updatedDefender)
          const updatedEnemyTeam = enemyTeam.map(p =>
            p.id === updatedDefender.id ? updatedDefender : p
          )
          setEnemyTeam(updatedEnemyTeam)
          handleDefenderFaint(newDefenderHp, updatedDefender, updatedEnemyTeam, damageLog, 'enemy', aiRespond)
        } else {
          setPlayerActive(updatedDefender)
          const updatedPlayerTeam = playerTeam.map(p =>
            p.id === updatedDefender.id ? updatedDefender : p
          )
          setPlayerTeam(updatedPlayerTeam)
          handleDefenderFaint(newDefenderHp, updatedDefender, updatedPlayerTeam, damageLog, 'player', false)
        }
      }, 500)
    }, 600)
  }

  /**
   * Switch Turn (Player vs Player Mode)
   *
   * Toggles between Team 1's turn and Team 2's turn in PvP battles.
   * This is called after every successful attack or Pokemon switch.
   */
  const switchTurn = () => {
    setCurrentTurn(currentTurn === 'team1' ? 'team2' : 'team1')
  }

  /**
   * Handle Pokemon Fainting
   *
   * Called when a Pokemon's HP reaches 0. Handles:
   * - Marking the Pokemon as fainted
   * - Forcing a switch to the next Pokemon
   * - Checking for battle victory (all Pokemon fainted)
   * - Switching turns in PvP mode after next Pokemon comes out
   *
   * @param defenderHp - The defender's new HP after damage
   * @param updatedDefender - The updated defender Pokemon object
   * @param updatedDefenderTeam - The updated defender's full team
   * @param damageLog - Battle log messages so far
   * @param defenderSide - Which side fainted ('player' or 'enemy')
   * @param aiRespond - Whether AI should respond after this (AI mode only)
   */
  const handleDefenderFaint = (
    defenderHp: number,
    updatedDefender: BattlePokemon,
    updatedDefenderTeam: BattlePokemon[],
    damageLog: string[],
    defenderSide: 'player' | 'enemy',
    aiRespond: boolean
  ) => {
    if (defenderHp === 0) {
      const faintLog = [...damageLog, `${updatedDefender.name} fainted!`]
      setBattleLog(faintLog)

      // Check for next Pokemon
      const nextPokemon = updatedDefenderTeam.find(p => p.hp > 0 && p.id !== updatedDefender.id)
      if (nextPokemon) {
        setTimeout(() => {
          if (defenderSide === 'enemy') {
            setEnemyActive(nextPokemon)
            setBattleLog([...faintLog, `${currentTurn === 'team1' ? 'Team 2' : 'Enemy'} sent out ${nextPokemon.name}!`])
          } else {
            setPlayerActive(nextPokemon)
            setBattleLog([...faintLog, `${currentTurn === 'team2' ? 'Team 1' : 'You'} sent out ${nextPokemon.name}!`])
          }

          // Switch turn in PvP after Pokemon switches in
          if (battleMode === 'player-vs-player') {
            setTimeout(() => switchTurn(), 500)
          }
        }, 1500)
      } else {
        setTimeout(() => {
          const winMessage = battleMode === 'player-vs-player'
            ? `${currentTurn === 'team1' ? 'Team 1' : 'Team 2'} wins!`
            : defenderSide === 'enemy' ? 'You win!' : 'You lost!'
          setBattleLog([...faintLog, winMessage])
        }, 1500)
      }
      return
    }

    // In PvP mode, just switch turn after successful attack
    if (battleMode === 'player-vs-player') {
      setTimeout(() => switchTurn(), 1000)
      return
    }

    // AI mode - enemy attacks back with delay
    if (aiRespond && enemyActive) {
      setTimeout(() => {
        setAnimatingPokemon('enemy')
        const enemyMove = updatedDefender.moves[Math.floor(Math.random() * updatedDefender.moves.length)]
        const attackLog = [...damageLog, `${updatedDefender.name} used ${enemyMove.name}!`]
        setBattleLog(attackLog)

        setTimeout(() => {
          setAnimatingPokemon(null)
          if (!playerActive) return

          const enemyDamage = calculateDamage(updatedDefender, playerActive, enemyMove)
          const newPlayerHp = Math.max(0, playerActive.hp - enemyDamage)

          const damageShowLog = [...attackLog, `Dealt ${enemyDamage} damage!`]
          setBattleLog(damageShowLog)

          setTimeout(() => {
            const updatedPlayer = { ...playerActive, hp: newPlayerHp }
            setPlayerActive(updatedPlayer)

            // Update player team with new HP
            const updatedPlayerTeam = playerTeam.map(p =>
              p.id === updatedPlayer.id ? updatedPlayer : p
            )
            setPlayerTeam(updatedPlayerTeam)

            if (newPlayerHp === 0) {
              const finalLog = [...damageShowLog, `${playerActive.name} fainted!`]
              setBattleLog(finalLog)
              const nextPlayer = updatedPlayerTeam.find(p => p.hp > 0 && p.id !== updatedPlayer.id)
              if (nextPlayer) {
                setTimeout(() => {
                  setPlayerActive(nextPlayer)
                  setBattleLog([...finalLog, `Go ${nextPlayer.name}!`])
                }, 1500)
              } else {
                setTimeout(() => {
                  setBattleLog([...finalLog, 'You lost!'])
                }, 1500)
              }
            }
          }, 500)
        }, 600)
      }, 800)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Team Manager Screen
  if (gameState === 'team-manager') {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Team Manager</h2>
            <div className="flex gap-3">
              <button
                onClick={createNewTeam}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Plus size={20} />
                New Team
              </button>
              <button
                onClick={() => setGameState('battle-setup')}
                disabled={teams.length < 2}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Battle Setup
              </button>
            </div>
          </div>

          {teams.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400 mb-4">No teams yet. Create your first team!</p>
              <button
                onClick={createNewTeam}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create Team
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teams.map((team) => (
                <div
                  key={team.id}
                  className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border-2 border-gray-200 dark:border-gray-600"
                >
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{team.name}</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingTeam(team)
                          setGameState('team-editor')
                        }}
                        className="p-1 text-blue-600 hover:text-blue-700"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete team "${team.name}"?`)) {
                            deleteTeam(team.id)
                          }
                        }}
                        className="p-1 text-red-600 hover:text-red-700"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {team.pokemon.length}/3 Pokémon
                  </p>
                  <div className="flex gap-2">
                    {team.pokemon.map((mon, idx) => (
                      <div key={idx} className="flex-1 bg-white dark:bg-gray-800 rounded p-1 text-center">
                        <img src={mon.sprite} alt={mon.name} className="w-full" />
                        <p className="text-xs text-gray-900 dark:text-white capitalize truncate">{mon.name}</p>
                      </div>
                    ))}
                    {[...Array(3 - team.pokemon.length)].map((_, idx) => (
                      <div key={`empty-${idx}`} className="flex-1 bg-gray-200 dark:bg-gray-600 rounded p-1 flex items-center justify-center">
                        <span className="text-gray-400 text-xs">Empty</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Team Editor Screen
  if (gameState === 'team-editor' && editingTeam) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <input
              type="text"
              value={editingTeam.name}
              onChange={(e) => updateTeamName(editingTeam.id, e.target.value)}
              className="text-2xl font-bold bg-transparent border-b-2 border-blue-500 text-gray-900 dark:text-white focus:outline-none"
            />
            <button
              onClick={() => {
                setEditingTeam(null)
                setEditingPokemonIndex(null)
                setGameState('team-manager')
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Back to Teams
            </button>
          </div>

          {/* Current Team */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Team ({editingTeam.pokemon.length}/3)
            </h3>
            <div className="grid grid-cols-3 gap-4 mb-4">
              {editingTeam.pokemon.map((mon, idx) => (
                <div key={idx} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border-2 border-gray-200 dark:border-gray-600">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-gray-900 dark:text-white capitalize">{mon.name}</h4>
                    <button
                      onClick={() => removePokemonFromTeam(idx)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <img src={mon.sprite} alt={mon.name} className="w-24 h-24 mx-auto mb-2" />
                  <div className="space-y-1 mb-2">
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Moves: {mon.moves.length}/4
                    </p>
                    {mon.moves.map((move, mIdx) => (
                      <div key={mIdx} className="text-xs bg-white dark:bg-gray-800 rounded px-2 py-1">
                        <span className="capitalize">{move.name.replace('-', ' ')}</span>
                        <span className="text-gray-500 ml-2">({move.power || '--'})</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setEditingPokemonIndex(idx)}
                    className="w-full px-2 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    Edit Moves
                  </button>
                </div>
              ))}
              {[...Array(3 - editingTeam.pokemon.length)].map((_, idx) => (
                <div key={`empty-${idx}`} className="bg-gray-100 dark:bg-gray-600 rounded-lg p-4 border-2 border-dashed border-gray-300 dark:border-gray-500 flex items-center justify-center">
                  <span className="text-gray-400">Empty Slot</span>
                </div>
              ))}
            </div>
          </div>

          {/* Move Editor */}
          {editingPokemonIndex !== null && (
            <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Edit Moves - {editingTeam.pokemon[editingPokemonIndex].name}
                </h3>
                <button
                  onClick={() => setEditingPokemonIndex(null)}
                  className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                >
                  Done
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
                {editingTeam.pokemon[editingPokemonIndex].allMoves?.map((move, idx) => {
                  const isSelected = editingTeam.pokemon[editingPokemonIndex].moves.some(m => m.name === move.name)
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        const currentMoves = editingTeam.pokemon[editingPokemonIndex].moves
                        if (isSelected) {
                          // Remove move
                          updatePokemonMoves(editingPokemonIndex, currentMoves.filter(m => m.name !== move.name))
                        } else if (currentMoves.length < 4) {
                          // Add move (max 4)
                          updatePokemonMoves(editingPokemonIndex, [...currentMoves, move])
                        }
                      }}
                      className={`text-left p-2 rounded text-sm ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600'
                      }`}
                    >
                      <div className="capitalize font-medium">{move.name.replace('-', ' ')}</div>
                      <div className="text-xs opacity-80">
                        {move.type} | Pwr: {move.power || '--'} | Acc: {move.accuracy}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Add Pokemon */}
          {editingTeam.pokemon.length < 3 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Add Pokémon (400+ Base Stats)
              </h3>
              <div className="grid grid-cols-6 md:grid-cols-10 gap-2 max-h-96 overflow-y-auto">
                {availablePokemon.map((pokemon) => (
                  <button
                    key={pokemon.id}
                    onClick={() => addPokemonToTeam(pokemon)}
                    className="bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg p-2"
                  >
                    <img src={pokemon.sprites.front_default} alt={pokemon.name} className="w-full" />
                    <p className="text-xs text-gray-900 dark:text-white capitalize truncate">
                      {pokemon.name}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Battle Setup Screen
  if (gameState === 'battle-setup') {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Battle Setup</h2>
            <button
              onClick={() => setGameState('team-manager')}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Back
            </button>
          </div>

          {/* Team 1 Selection */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Team 1</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {teams.map((team) => (
                <button
                  key={team.id}
                  onClick={() => setTeam1(team)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    team1?.id === team.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-gray-200 dark:border-gray-600 hover:border-blue-300'
                  }`}
                >
                  <h4 className="font-bold text-gray-900 dark:text-white mb-2">{team.name}</h4>
                  <div className="flex gap-1 justify-center">
                    {team.pokemon.map((mon, idx) => (
                      <img key={idx} src={mon.sprite} alt={mon.name} className="w-8 h-8" />
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Team 2 Selection */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Team 2</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {teams.filter(t => t.id !== team1?.id).map((team) => (
                <button
                  key={team.id}
                  onClick={() => setTeam2(team)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    team2?.id === team.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-gray-200 dark:border-gray-600 hover:border-blue-300'
                  }`}
                >
                  <h4 className="font-bold text-gray-900 dark:text-white mb-2">{team.name}</h4>
                  <div className="flex gap-1 justify-center">
                    {team.pokemon.map((mon, idx) => (
                      <img key={idx} src={mon.sprite} alt={mon.name} className="w-8 h-8" />
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Battle Mode Selection */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Battle Mode</h3>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setBattleMode('player-vs-player')}
                className={`p-4 rounded-lg border-2 ${
                  battleMode === 'player-vs-player'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                    : 'border-gray-200 dark:border-gray-600 hover:border-blue-300'
                }`}
              >
                <h4 className="font-bold text-gray-900 dark:text-white">Player vs Player</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Take turns controlling both teams
                </p>
              </button>
              <button
                onClick={() => setBattleMode('player-vs-ai')}
                className={`p-4 rounded-lg border-2 ${
                  battleMode === 'player-vs-ai'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                    : 'border-gray-200 dark:border-gray-600 hover:border-blue-300'
                }`}
              >
                <h4 className="font-bold text-gray-900 dark:text-white">Player vs AI</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  You control Team 1, AI controls Team 2
                </p>
              </button>
              <button
                onClick={() => setBattleMode('ai-vs-ai')}
                className={`p-4 rounded-lg border-2 ${
                  battleMode === 'ai-vs-ai'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                    : 'border-gray-200 dark:border-gray-600 hover:border-blue-300'
                }`}
              >
                <h4 className="font-bold text-gray-900 dark:text-white">AI vs AI</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Watch both teams battle automatically
                </p>
              </button>
            </div>
          </div>

          {/* Start Battle Button */}
          <button
            onClick={() => {
              if (team1 && team2) {
                // Reset battle state with selected teams
                setPlayerTeam(JSON.parse(JSON.stringify(team1.pokemon)))
                setEnemyTeam(JSON.parse(JSON.stringify(team2.pokemon)))
                setPlayerActive(team1.pokemon[0])
                setEnemyActive(team2.pokemon[0])
                setCurrentTurn('team1')
                setBattleLog([`${team1.name} vs ${team2.name}!`, 'Battle started!'])
                setGameState('battle')
              }
            }}
            disabled={!team1 || !team2}
            className="w-full px-6 py-4 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start Battle!
          </button>
        </div>
      </div>
    )
  }

  // Battle Screen
  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-gradient-to-b from-blue-400 to-green-400 dark:from-blue-900 dark:to-green-900 rounded-lg shadow-lg p-6 min-h-screen">

        {/* Turn Indicator - Player vs Player Mode */}
        {battleMode === 'player-vs-player' && (
          <div className="mb-4">
            <div className={`${
              currentTurn === 'team1'
                ? 'bg-blue-600 border-blue-400'
                : 'bg-red-600 border-red-400'
            } border-4 rounded-lg p-4 text-center transition-all`}>
              <h2 className="text-2xl font-bold text-white">
                {currentTurn === 'team1' ? team1?.name : team2?.name}'s Turn
              </h2>
              <p className="text-white/80 text-sm mt-1">
                Select a move or switch Pokemon
              </p>
            </div>
          </div>
        )}

        {/* Enemy Team Preview */}
        <div className="mb-4 flex justify-end">
          <div className="bg-white/80 dark:bg-gray-800/80 rounded-lg p-3 flex gap-2">
            {enemyTeam.map((pokemon, idx) => (
              <div
                key={idx}
                className={`flex flex-col items-center p-2 rounded ${
                  enemyActive?.name === pokemon.name
                    ? 'bg-blue-100 dark:bg-blue-900/50 ring-2 ring-blue-500'
                    : pokemon.hp === 0
                      ? 'opacity-40 grayscale'
                      : 'opacity-80'
                }`}
              >
                <img src={pokemon.sprite} alt={pokemon.name} className="w-12 h-12" />
                <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1">
                  <div
                    className={`h-1.5 rounded-full transition-all ${
                      pokemon.hp / pokemon.maxHp > 0.5 ? 'bg-green-500' :
                      pokemon.hp / pokemon.maxHp > 0.2 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${(pokemon.hp / pokemon.maxHp) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Enemy Pokemon */}
        {enemyActive && (
          <div className="mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 max-w-md ml-auto">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white capitalize">{enemyActive.name}</h3>
                  <div className="flex gap-1 mb-2">
                    {enemyActive.types.map(type => (
                      <span key={type} className={`${TYPE_COLORS[type]} text-white px-2 py-0.5 rounded text-xs`}>
                        {type}
                      </span>
                    ))}
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 relative">
                    <div
                      className="bg-green-500 h-3 rounded-full transition-all"
                      style={{ width: `${(enemyActive.hp / enemyActive.maxHp) * 100}%` }}
                    />
                    {/* HP Bar Tick Marks */}
                    {[25, 50, 75].map(percent => (
                      <div
                        key={percent}
                        className="absolute top-0 h-3 w-0.5 bg-gray-400 dark:bg-gray-500"
                        style={{ left: `${percent}%` }}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {enemyActive.hp} / {enemyActive.maxHp} HP
                    {enemyActive.status !== 'none' && (
                      <span className="ml-2 px-2 py-0.5 bg-orange-500 text-white rounded text-xs uppercase">
                        {enemyActive.status}
                      </span>
                    )}
                  </p>
                </div>
                <img
                  src={enemyActive.sprite}
                  alt={enemyActive.name}
                  className={`w-32 h-32 ${animatingPokemon === 'enemy' ? 'animate-attack-enemy' : ''}`}
                />
              </div>
            </div>
          </div>
        )}

        {/* Player Pokemon */}
        {playerActive && (
          <div className="mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 max-w-md">
              <div className="flex items-center gap-4">
                <img
                  src={playerActive.sprite}
                  alt={playerActive.name}
                  className={`w-32 h-32 ${animatingPokemon === 'player' ? 'animate-attack-player' : ''}`}
                />
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white capitalize">{playerActive.name}</h3>
                  <div className="flex gap-1 mb-2">
                    {playerActive.types.map(type => (
                      <span key={type} className={`${TYPE_COLORS[type]} text-white px-2 py-0.5 rounded text-xs`}>
                        {type}
                      </span>
                    ))}
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 relative">
                    <div
                      className="bg-green-500 h-3 rounded-full transition-all"
                      style={{ width: `${(playerActive.hp / playerActive.maxHp) * 100}%` }}
                    />
                    {/* HP Bar Tick Marks */}
                    {[25, 50, 75].map(percent => (
                      <div
                        key={percent}
                        className="absolute top-0 h-3 w-0.5 bg-gray-400 dark:bg-gray-500"
                        style={{ left: `${percent}%` }}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {playerActive.hp} / {playerActive.maxHp} HP
                    {playerActive.status !== 'none' && (
                      <span className="ml-2 px-2 py-0.5 bg-orange-500 text-white rounded text-xs uppercase">
                        {playerActive.status}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Player Team Preview */}
        <div className="mb-4 flex justify-start">
          <div className="bg-white/80 dark:bg-gray-800/80 rounded-lg p-3 flex gap-2">
            {playerTeam.map((pokemon, idx) => (
              <div
                key={idx}
                className={`flex flex-col items-center p-2 rounded ${
                  playerActive?.name === pokemon.name
                    ? 'bg-blue-100 dark:bg-blue-900/50 ring-2 ring-blue-500'
                    : pokemon.hp === 0
                      ? 'opacity-40 grayscale'
                      : 'opacity-80'
                }`}
              >
                <img src={pokemon.sprite} alt={pokemon.name} className="w-12 h-12" />
                <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1">
                  <div
                    className={`h-1.5 rounded-full transition-all ${
                      pokemon.hp / pokemon.maxHp > 0.5 ? 'bg-green-500' :
                      pokemon.hp / pokemon.maxHp > 0.2 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${(pokemon.hp / pokemon.maxHp) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Battle Log */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 max-h-32 overflow-y-auto">
          {battleLog.slice(-5).map((log, idx) => (
            <p key={idx} className="text-sm text-gray-900 dark:text-white">{log}</p>
          ))}
        </div>

        {/* Action Buttons */}
        {playerActive && playerActive.hp > 0 && enemyActive && enemyActive.hp > 0 && (
          <>
            {!showSwitchMenu ? (
              <>
                {/* Move Buttons */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  {/* In PvP mode, show current turn's Pokemon moves. Otherwise show player moves */}
                  {(battleMode === 'player-vs-player' && currentTurn === 'team2'
                    ? enemyActive.moves
                    : playerActive.moves
                  ).map((move, idx) => {
                    const isDisabled = isAnimating
                    return (
                      <button
                        key={idx}
                        onClick={() => !isDisabled && setSelectedMove(move)}
                        disabled={isDisabled}
                        className={`${TYPE_COLORS[move.type]} text-white p-4 rounded-lg font-semibold transition-all ${
                          selectedMove?.name === move.name
                            ? 'ring-4 ring-yellow-400 scale-105'
                            : 'hover:opacity-90'
                        } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className="text-left">
                          <p className="capitalize">{move.name}</p>
                          <p className="text-xs opacity-80">Power: {move.power} | Acc: {move.accuracy}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>

                {/* Confirm/Cancel Buttons */}
                {selectedMove && (
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <button
                      onClick={() => {
                        setIsAnimating(true)
                        useMove(selectedMove)
                        setSelectedMove(null)
                        setTimeout(() => setIsAnimating(false), 2500)
                      }}
                      disabled={isAnimating}
                      className="bg-green-600 text-white p-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setSelectedMove(null)}
                      disabled={isAnimating}
                      className="bg-red-600 text-white p-3 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {/* Switch Button */}
                <button
                  onClick={() => setShowSwitchMenu(true)}
                  disabled={isAnimating}
                  className="w-full bg-gray-600 text-white p-3 rounded-lg font-semibold hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Switch Pokémon
                </button>
              </>
            ) : (
              <>
                {/* Switch Menu */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-3">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Choose a Pokémon</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {/* Show appropriate team's Pokemon based on current turn in PvP mode */}
                    {(battleMode === 'player-vs-player' && currentTurn === 'team2'
                      ? enemyTeam.filter(p => p.hp > 0 && p.id !== enemyActive.id)
                      : playerTeam.filter(p => p.hp > 0 && p.id !== playerActive.id)
                    ).map((pokemon) => (
                        <button
                          key={pokemon.id}
                          onClick={() => {
                            if (battleMode === 'player-vs-player' && currentTurn === 'team2') {
                              switchEnemyPokemon(pokemon)
                            } else {
                              switchPokemon(pokemon)
                            }
                          }}
                          className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg p-2"
                        >
                          <img src={pokemon.sprite} alt={pokemon.name} className="w-16 h-16 mx-auto" />
                          <p className="text-xs font-medium text-gray-900 dark:text-white capitalize truncate">
                            {pokemon.name}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {pokemon.hp}/{pokemon.maxHp}
                          </p>
                        </button>
                      ))}
                  </div>
                </div>

                {/* Back Button */}
                <button
                  onClick={() => setShowSwitchMenu(false)}
                  className="w-full bg-gray-600 text-white p-3 rounded-lg font-semibold hover:bg-gray-700"
                >
                  Back
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
