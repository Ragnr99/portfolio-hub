import { useState, useEffect } from 'react'
import { Swords, Heart, Shield, Zap } from 'lucide-react'

interface BattlePokemon {
  id: number
  name: string
  sprite: string
  types: string[]
  hp: number
  maxHp: number
  attack: number
  defense: number
  spAttack: number
  spDefense: number
  speed: number
  level: number
  moves: BattleMove[]
  status: 'none' | 'burn' | 'paralyze' | 'sleep' | 'poison' | 'freeze'
  sleepTurns: number
  statStages: {
    attack: number
    defense: number
    spAttack: number
    spDefense: number
    speed: number
  }
}

interface BattleMove {
  name: string
  type: string
  category: 'physical' | 'special' | 'status'
  power: number
  accuracy: number
}

const TYPE_COLORS: Record<string, string> = {
  normal: 'bg-gray-400', fire: 'bg-orange-500', water: 'bg-blue-500',
  electric: 'bg-yellow-400', grass: 'bg-green-500', ice: 'bg-cyan-300',
  fighting: 'bg-red-700', poison: 'bg-purple-500', ground: 'bg-yellow-600',
  flying: 'bg-indigo-400', psychic: 'bg-pink-500', bug: 'bg-lime-500',
  rock: 'bg-yellow-700', ghost: 'bg-purple-700', dragon: 'bg-indigo-600',
  dark: 'bg-gray-700', steel: 'bg-gray-500', fairy: 'bg-pink-300',
}

const TYPE_CHART: Record<string, Record<string, number>> = {
  normal: { rock: 0.5, ghost: 0, steel: 0.5 },
  fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
  water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
  grass: { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
  ice: { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
  fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
  poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
  ground: { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
  flying: { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
  psychic: { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
  bug: { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
  rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
  ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
  dragon: { dragon: 2, steel: 0.5, fairy: 0 },
  dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
  steel: { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
  fairy: { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 },
}

export default function Battle() {
  const [gameState, setGameState] = useState<'mode-select' | 'team-select' | 'team-edit' | 'battle'>('mode-select')
  const [battleMode, setBattleMode] = useState<'custom' | 'random'>('custom')
  const [playerTeam, setPlayerTeam] = useState<BattlePokemon[]>([])
  const [enemyTeam, setEnemyTeam] = useState<BattlePokemon[]>([])
  const [playerActive, setPlayerActive] = useState<BattlePokemon | null>(null)
  const [enemyActive, setEnemyActive] = useState<BattlePokemon | null>(null)
  const [battleLog, setBattleLog] = useState<string[]>([])
  const [availablePokemon, setAvailablePokemon] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showSwitchMenu, setShowSwitchMenu] = useState(false)
  const [editingPokemon, setEditingPokemon] = useState<BattlePokemon | null>(null)
  const [selectedMove, setSelectedMove] = useState<BattleMove | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [animatingPokemon, setAnimatingPokemon] = useState<'player' | 'enemy' | null>(null)

  useEffect(() => {
    loadPokemon()
  }, [])

  const loadPokemon = async () => {
    // Load all 1025 for selection
    const promises = Array.from({ length: 1025 }, (_, i) =>
      fetch(`https://pokeapi.co/api/v2/pokemon/${i + 1}`).then(r => r.json())
    )
    const data = await Promise.all(promises)
    // Filter to only Pokemon with base stat total >= 400
    const strong = data.filter(p => {
      const total = p.stats.reduce((sum: number, s: any) => sum + s.base_stat, 0)
      return total >= 400
    })
    setAvailablePokemon(strong)
    setLoading(false)
  }

  const createBattlePokemon = async (data: any, level: number = 50): Promise<BattlePokemon> => {
    const stats = {
      hp: Math.floor(((2 * data.stats[0].base_stat + 31) * level) / 100) + level + 10,
      attack: Math.floor(((2 * data.stats[1].base_stat + 31) * level) / 100) + 5,
      defense: Math.floor(((2 * data.stats[2].base_stat + 31) * level) / 100) + 5,
      spAttack: Math.floor(((2 * data.stats[3].base_stat + 31) * level) / 100) + 5,
      spDefense: Math.floor(((2 * data.stats[4].base_stat + 31) * level) / 100) + 5,
      speed: Math.floor(((2 * data.stats[5].base_stat + 31) * level) / 100) + 5,
    }

    const types = data.types.map((t: any) => t.type.name)

    // Fetch real moves from API
    const moves: BattleMove[] = []
    const levelUpMoves = data.moves
      .filter((m: any) =>
        m.version_group_details.some((v: any) =>
          v.move_learn_method.name === 'level-up' && v.level_learned_at <= level
        )
      )
      .sort((a: any, b: any) => {
        const aLevel = a.version_group_details.find((v: any) => v.move_learn_method.name === 'level-up')?.level_learned_at || 0
        const bLevel = b.version_group_details.find((v: any) => v.move_learn_method.name === 'level-up')?.level_learned_at || 0
        return bLevel - aLevel
      })
      .slice(0, 6)

    for (const moveEntry of levelUpMoves) {
      try {
        const moveData = await fetch(moveEntry.move.url).then(r => r.json())
        moves.push({
          name: moveData.name,
          type: moveData.type.name,
          category: moveData.damage_class.name as 'physical' | 'special' | 'status',
          power: moveData.power || 0,
          accuracy: moveData.accuracy || 100,
        })
      } catch (e) {
        // Skip on error
      }
    }

    // Ensure at least 1 damaging move
    const hasDamagingMove = moves.some(m => m.power > 0)
    if (!hasDamagingMove) {
      const primaryType = types[0]
      if (primaryType === 'fire') moves.push({ name: 'flamethrower', type: 'fire', category: 'special', power: 90, accuracy: 100 })
      else if (primaryType === 'water') moves.push({ name: 'surf', type: 'water', category: 'special', power: 90, accuracy: 100 })
      else if (primaryType === 'grass') moves.push({ name: 'energy-ball', type: 'grass', category: 'special', power: 90, accuracy: 100 })
      else if (primaryType === 'electric') moves.push({ name: 'thunderbolt', type: 'electric', category: 'special', power: 90, accuracy: 100 })
      else moves.push({ name: 'body-slam', type: 'normal', category: 'physical', power: 85, accuracy: 100 })
    }

    // Fallback if no moves found
    if (moves.length === 0) {
      moves.push({ name: 'Tackle', type: 'normal', category: 'physical', power: 40, accuracy: 100 })
    }

    return {
      id: data.id,
      name: data.name,
      sprite: data.sprites.front_default,
      types,
      hp: stats.hp,
      maxHp: stats.hp,
      ...stats,
      level,
      moves: moves.slice(0, 4),
      status: 'none',
      sleepTurns: 0,
      statStages: {
        attack: 0,
        defense: 0,
        spAttack: 0,
        spDefense: 0,
        speed: 0
      }
    }
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

  const applyStatus = (pokemon: BattlePokemon, status: 'burn' | 'paralyze' | 'sleep' | 'poison' | 'freeze'): BattlePokemon => {
    if (pokemon.status !== 'none') return pokemon

    const updated = { ...pokemon, status }
    if (status === 'sleep') {
      updated.sleepTurns = Math.floor(Math.random() * 3) + 1 // 1-3 turns
    }
    return updated
  }

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

  const getStatMultiplier = (stage: number): number => {
    const multipliers = [0.25, 0.28, 0.33, 0.4, 0.5, 0.66, 1, 1.5, 2, 2.5, 3, 3.5, 4]
    return multipliers[stage + 6] || 1
  }

  const calculateDamage = (attacker: BattlePokemon, defender: BattlePokemon, move: BattleMove): number => {
    if (move.power === 0) return 0

    let attackStat = move.category === 'physical' ? attacker.attack : attacker.spAttack
    let defenseStat = move.category === 'physical' ? defender.defense : defender.spDefense

    // Apply stat stages
    const atkStage = move.category === 'physical' ? attacker.statStages.attack : attacker.statStages.spAttack
    const defStage = move.category === 'physical' ? defender.statStages.defense : defender.statStages.spDefense
    attackStat = Math.floor(attackStat * getStatMultiplier(atkStage))
    defenseStat = Math.floor(defenseStat * getStatMultiplier(defStage))

    // Burn halves physical attack
    if (attacker.status === 'burn' && move.category === 'physical') {
      attackStat = Math.floor(attackStat / 2)
    }

    // Damage formula
    let damage = ((((2 * attacker.level / 5 + 2) * move.power * attackStat / defenseStat) / 50) + 2)

    // STAB
    if (attacker.types.includes(move.type)) {
      damage *= 1.5
    }

    // Type effectiveness
    let effectiveness = 1
    defender.types.forEach(defType => {
      const chart = TYPE_CHART[move.type]
      effectiveness *= (chart?.[defType] ?? 1)
    })
    damage *= effectiveness

    // Random factor (0.85 - 1.0)
    damage *= (Math.random() * 0.15 + 0.85)

    return Math.floor(damage)
  }

  const switchPokemon = (newPokemon: BattlePokemon) => {
    if (!enemyActive) return

    setPlayerActive(newPokemon)
    setShowSwitchMenu(false)

    const newLog = [...battleLog, `Go ${newPokemon.name}!`]
    setBattleLog(newLog)

    // Enemy gets a free attack when you switch
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

  const useMove = (move: BattleMove) => {
    if (!playerActive || !enemyActive) return

    const newLog = [...battleLog]

    // Check if player is frozen/asleep/paralyzed
    if (playerActive.status === 'freeze') {
      if (Math.random() < 0.8) {
        newLog.push(`${playerActive.name} is frozen solid!`)
        setBattleLog(newLog)
        return
      } else {
        newLog.push(`${playerActive.name} thawed out!`)
        setPlayerActive({ ...playerActive, status: 'none' })
      }
    }

    if (playerActive.status === 'sleep') {
      if (playerActive.sleepTurns > 0) {
        newLog.push(`${playerActive.name} is fast asleep!`)
        setPlayerActive({ ...playerActive, sleepTurns: playerActive.sleepTurns - 1 })
        setBattleLog(newLog)
        return
      } else {
        newLog.push(`${playerActive.name} woke up!`)
        setPlayerActive({ ...playerActive, status: 'none' })
      }
    }

    if (playerActive.status === 'paralyze' && Math.random() < 0.25) {
      newLog.push(`${playerActive.name} is fully paralyzed!`)
      setBattleLog(newLog)
      return
    }

    // Player attacks - show attack message first
    newLog.push(`${playerActive.name} used ${move.name}!`)
    setBattleLog(newLog)
    setAnimatingPokemon('player')

    // Calculate damage after animation delay
    setTimeout(() => {
      setAnimatingPokemon(null)
      const damage = calculateDamage(playerActive, enemyActive, move)
      const newEnemyHp = Math.max(0, enemyActive.hp - damage)

      const damageLog = [...newLog]
      if (damage > 0) {
        damageLog.push(`Dealt ${damage} damage!`)
      }
      setBattleLog(damageLog)

      // Apply damage after showing message
      setTimeout(() => {
        // Apply status effects from certain moves
        let updatedEnemy: BattlePokemon
        if (move.name === 'ember' && Math.random() < 0.1 && enemyActive.status === 'none') {
          const burned = applyStatus(enemyActive, 'burn')
          updatedEnemy = { ...burned, hp: newEnemyHp }
          damageLog.push(`${enemyActive.name} was burned!`)
        } else if (move.name === 'thundershock' && Math.random() < 0.1 && enemyActive.status === 'none') {
          const paralyzed = applyStatus(enemyActive, 'paralyze')
          updatedEnemy = { ...paralyzed, hp: newEnemyHp }
          damageLog.push(`${enemyActive.name} was paralyzed!`)
        } else {
          updatedEnemy = { ...enemyActive, hp: newEnemyHp }
        }

        setEnemyActive(updatedEnemy)

        // Update enemy team with new HP
        const updatedEnemyTeam = enemyTeam.map(p =>
          p.id === updatedEnemy.id ? updatedEnemy : p
        )
        setEnemyTeam(updatedEnemyTeam)

        handleEnemyFaint(newEnemyHp, updatedEnemy, updatedEnemyTeam, damageLog)
      }, 500)
    }, 600)
  }

  const handleEnemyFaint = (newEnemyHp: number, updatedEnemy: BattlePokemon, updatedEnemyTeam: BattlePokemon[], damageLog: string[]) => {
    if (newEnemyHp === 0) {
      const faintLog = [...damageLog, `${updatedEnemy.name} fainted!`]
      setBattleLog(faintLog)

      // Check for next enemy using updated team
      const nextEnemy = updatedEnemyTeam.find(p => p.hp > 0 && p.id !== updatedEnemy.id)
      if (nextEnemy) {
        setTimeout(() => {
          setEnemyActive(nextEnemy)
          setBattleLog([...faintLog, `Enemy sent out ${nextEnemy.name}!`])
        }, 1500)
      } else {
        setTimeout(() => {
          setBattleLog([...faintLog, 'You win!'])
        }, 1500)
      }
      return
    }

    // Enemy attacks back with delay
    setTimeout(() => {
      setAnimatingPokemon('enemy')
      const enemyMove = updatedEnemy.moves[Math.floor(Math.random() * updatedEnemy.moves.length)]
      const attackLog = [...damageLog, `${updatedEnemy.name} used ${enemyMove.name}!`]
      setBattleLog(attackLog)

      setTimeout(() => {
        setAnimatingPokemon(null)
        if (!playerActive) return

        const enemyDamage = calculateDamage(updatedEnemy, playerActive, enemyMove)
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
            // Check for next player using updated team
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Mode Select Screen
  if (gameState === 'mode-select') {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 text-center">Choose Battle Mode</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button
              onClick={() => {
                setBattleMode('custom')
                setGameState('team-select')
              }}
              className="bg-gradient-to-br from-blue-500 to-blue-700 text-white p-8 rounded-lg hover:from-blue-600 hover:to-blue-800 transition-all"
            >
              <h3 className="text-2xl font-bold mb-2">Custom Team</h3>
              <p className="text-sm opacity-90">Build your own team of 3 Pokémon vs random opponent</p>
            </button>

            <button
              onClick={async () => {
                setBattleMode('random')
                await startBattle()
              }}
              className="bg-gradient-to-br from-purple-500 to-purple-700 text-white p-8 rounded-lg hover:from-purple-600 hover:to-purple-800 transition-all"
            >
              <h3 className="text-2xl font-bold mb-2">Random Battle</h3>
              <p className="text-sm opacity-90">Fully random teams (400+ base stats) with balanced movesets</p>
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (gameState === 'team-select') {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Build Your Team</h2>

          {/* Current Team */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Your Team ({playerTeam.length}/3)
            </h3>
            <div className="flex gap-2 mb-4">
              {playerTeam.map((mon, idx) => (
                <div key={idx} className="bg-gray-100 dark:bg-gray-700 rounded-lg p-2 text-center">
                  <img src={mon.sprite} alt={mon.name} className="w-16 h-16" />
                  <p className="text-xs font-medium text-gray-900 dark:text-white capitalize">{mon.name}</p>
                </div>
              ))}
            </div>
            <button
              onClick={startBattle}
              disabled={playerTeam.length === 0}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Start Battle!
            </button>
          </div>

          {/* Available Pokemon */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Select Pokémon (400+ Base Stats)
            </h3>
            <div className="grid grid-cols-6 md:grid-cols-10 gap-2 max-h-96 overflow-y-auto">
              {availablePokemon.map((pokemon) => (
                <button
                  key={pokemon.id}
                  onClick={() => addToTeam(pokemon)}
                  disabled={playerTeam.length >= 3}
                  className="bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg p-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <img src={pokemon.sprites.front_default} alt={pokemon.name} className="w-full" />
                  <p className="text-xs text-gray-900 dark:text-white capitalize truncate">
                    {pokemon.name}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Battle Screen
  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-gradient-to-b from-blue-400 to-green-400 dark:from-blue-900 dark:to-green-900 rounded-lg shadow-lg p-6 min-h-screen">

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
                  {playerActive.moves.map((move, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedMove(move)}
                      disabled={isAnimating}
                      className={`${TYPE_COLORS[move.type]} text-white p-4 rounded-lg font-semibold transition-all ${
                        selectedMove?.name === move.name
                          ? 'ring-4 ring-yellow-400 scale-105'
                          : 'hover:opacity-90'
                      } ${isAnimating ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="text-left">
                        <p className="capitalize">{move.name}</p>
                        <p className="text-xs opacity-80">Power: {move.power} | Acc: {move.accuracy}</p>
                      </div>
                    </button>
                  ))}
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
                    {playerTeam
                      .filter(p => p.hp > 0 && p.id !== playerActive.id)
                      .map((pokemon) => (
                        <button
                          key={pokemon.id}
                          onClick={() => switchPokemon(pokemon)}
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
