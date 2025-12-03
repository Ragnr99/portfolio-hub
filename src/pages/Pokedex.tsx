import { useState, useEffect } from 'react'
import { Search, ChevronDown, ChevronUp } from 'lucide-react'

interface PokemonBasic {
  id: number
  name: string
  types: string[]
  stats: {
    hp: number
    attack: number
    defense: number
    specialAttack: number
    specialDefense: number
    speed: number
  }
  sprite: string
}

interface Pokemon extends PokemonBasic {
  height: number
  weight: number
  abilities: string[]
  species: string
  eggGroups: string[]
  genderRatio: { male: number; female: number } | null
  evolutions: EvolutionChain[]
  moves: MoveLearnset
  weaknesses: Record<string, number>
}

interface MoveLearnset {
  levelUp: LevelUpMove[]
  tm: TMMove[]
  egg: string[]
  tutor: string[]
}

interface LevelUpMove {
  name: string
  level: number
  type: string
  category: string
  power: number | null
  accuracy: number | null
  generations: number[]
  versionGroup: string
}

interface TMMove {
  name: string
  type: string
  category: string
  power: number | null
  accuracy: number | null
  generations: number[]
  versionGroup: string
}

interface EvolutionChain {
  name: string
  id: number
  method: string
  sprite: string
  minGeneration: number
}

interface PokemonListItem {
  name: string
  url: string
  id?: number
}

const TYPE_COLORS: Record<string, string> = {
  normal: 'bg-gray-400',
  fire: 'bg-orange-500',
  water: 'bg-blue-500',
  electric: 'bg-yellow-400',
  grass: 'bg-green-500',
  ice: 'bg-cyan-300',
  fighting: 'bg-red-700',
  poison: 'bg-purple-500',
  ground: 'bg-yellow-600',
  flying: 'bg-indigo-400',
  psychic: 'bg-pink-500',
  bug: 'bg-lime-500',
  rock: 'bg-yellow-700',
  ghost: 'bg-purple-700',
  dragon: 'bg-indigo-600',
  dark: 'bg-gray-700',
  steel: 'bg-gray-500',
  fairy: 'bg-pink-300',
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

export default function Pokedex() {
  const [pokemonList, setPokemonList] = useState<PokemonListItem[]>([])
  const [pokemonBasicData, setPokemonBasicData] = useState<Map<number, PokemonBasic>>(new Map())
  const [filteredPokemon, setFilteredPokemon] = useState<PokemonListItem[]>([])
  const [selectedPokemon, setSelectedPokemon] = useState<Pokemon | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRegion, setSelectedRegion] = useState<string>('national')
  const [loading, setLoading] = useState(true)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    stats: true,
    moves: false,
    evolution: false,
    breeding: false,
    weakness: false,
  })

  const regions = [
    {
      label: 'National (Gen 9)',
      value: 'national',
      range: [1, 1025],
      regionalDex: null,
      generation: 9  // Use latest gen mechanics
    },
    {
      label: 'Kanto (Gen 1)',
      value: 'kanto',
      range: [1, 151],
      regionalDex: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151],
      generation: 1
    },
    {
      label: 'Johto (Gen 2)',
      value: 'johto',
      range: [152, 251],
      regionalDex: [152, 153, 154, 155, 156, 157, 158, 159, 160, 1, 2, 3, 161, 162, 163, 164, 165, 166, 167, 168, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 35, 36, 39, 40, 41, 42, 169, 46, 47, 170, 171, 172, 25, 26, 172, 173, 174, 35, 36, 39, 40, 173, 174, 175, 176, 177, 178, 179, 180, 181, 63, 64, 65, 66, 67, 68, 74, 75, 76, 95, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 182, 183, 184, 60, 61, 62, 69, 70, 71, 185, 186, 43, 44, 45, 187, 188, 189, 190, 191, 192, 193, 48, 49, 29, 30, 31, 32, 33, 34, 54, 55, 79, 80, 194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216, 217, 218, 219, 220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 52, 53, 81, 82, 88, 89, 90, 91, 92, 93, 94, 96, 97, 98, 99, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 230, 231, 232, 233, 234, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244, 245, 246, 247, 248, 249, 250, 251],
      generation: 2
    },
    {
      label: 'Hoenn (Gen 3)',
      value: 'hoenn',
      range: [252, 386],
      regionalDex: [252, 253, 254, 255, 256, 257, 258, 259, 260, 261, 262, 263, 264, 265, 266, 267, 268, 269, 270, 271, 272, 273, 274, 275, 276, 277, 278, 279, 280, 281, 282, 283, 284, 285, 286, 287, 288, 289, 290, 291, 292, 293, 294, 295, 296, 297, 298, 299, 300, 301, 302, 303, 304, 305, 306, 307, 308, 309, 310, 311, 312, 313, 314, 315, 316, 317, 318, 319, 320, 321, 322, 323, 324, 325, 326, 327, 328, 329, 330, 331, 332, 333, 334, 335, 336, 337, 338, 339, 340, 341, 342, 343, 344, 345, 346, 347, 348, 349, 350, 351, 352, 353, 354, 355, 356, 357, 358, 359, 360, 361, 362, 363, 364, 365, 366, 367, 368, 369, 370, 371, 372, 373, 374, 375, 376, 377, 378, 379, 380, 381, 382, 383, 384, 385, 386],
      generation: 3
    },
    {
      label: 'Sinnoh (Gen 4)',
      value: 'sinnoh',
      range: [387, 493],
      regionalDex: [387, 388, 389, 390, 391, 392, 393, 394, 395, 396, 397, 398, 399, 400, 401, 402, 403, 404, 405, 406, 407, 408, 409, 410, 411, 412, 413, 414, 415, 416, 417, 418, 419, 420, 421, 422, 423, 424, 425, 426, 427, 428, 429, 430, 431, 432, 433, 434, 435, 436, 437, 438, 439, 440, 441, 442, 443, 444, 445, 446, 447, 448, 449, 450, 451, 452, 453, 454, 455, 456, 457, 458, 459, 460, 461, 462, 463, 464, 465, 466, 467, 468, 469, 470, 471, 472, 473, 474, 475, 476, 477, 478, 479, 480, 481, 482, 483, 484, 485, 486, 487, 488, 489, 490, 491, 492, 493],
      generation: 4
    },
    {
      label: 'Unova (Gen 5)',
      value: 'unova',
      range: [494, 649],
      regionalDex: [494, 495, 496, 497, 498, 499, 500, 501, 502, 503, 504, 505, 506, 507, 508, 509, 510, 511, 512, 513, 514, 515, 516, 517, 518, 519, 520, 521, 522, 523, 524, 525, 526, 527, 528, 529, 530, 531, 532, 533, 534, 535, 536, 537, 538, 539, 540, 541, 542, 543, 544, 545, 546, 547, 548, 549, 550, 551, 552, 553, 554, 555, 556, 557, 558, 559, 560, 561, 562, 563, 564, 565, 566, 567, 568, 569, 570, 571, 572, 573, 574, 575, 576, 577, 578, 579, 580, 581, 582, 583, 584, 585, 586, 587, 588, 589, 590, 591, 592, 593, 594, 595, 596, 597, 598, 599, 600, 601, 602, 603, 604, 605, 606, 607, 608, 609, 610, 611, 612, 613, 614, 615, 616, 617, 618, 619, 620, 621, 622, 623, 624, 625, 626, 627, 628, 629, 630, 631, 632, 633, 634, 635, 636, 637, 638, 639, 640, 641, 642, 643, 644, 645, 646, 647, 648, 649],
      generation: 5
    },
    {
      label: 'Kalos (Gen 6)',
      value: 'kalos',
      range: [650, 721],
      regionalDex: [650, 651, 652, 653, 654, 655, 656, 657, 658, 659, 660, 661, 662, 663, 664, 665, 666, 667, 668, 669, 670, 671, 672, 673, 674, 675, 676, 677, 678, 679, 680, 681, 682, 683, 684, 685, 686, 687, 688, 689, 690, 691, 692, 693, 694, 695, 696, 697, 698, 699, 700, 701, 702, 703, 704, 705, 706, 707, 708, 709, 710, 711, 712, 713, 714, 715, 716, 717, 718, 719, 720, 721],
      generation: 6
    },
    {
      label: 'Alola (Gen 7)',
      value: 'alola',
      range: [722, 809],
      regionalDex: [722, 723, 724, 725, 726, 727, 728, 729, 730, 731, 732, 733, 734, 735, 736, 737, 738, 739, 740, 741, 742, 743, 744, 745, 746, 747, 748, 749, 750, 751, 752, 753, 754, 755, 756, 757, 758, 759, 760, 761, 762, 763, 764, 765, 766, 767, 768, 769, 770, 771, 772, 773, 774, 775, 776, 777, 778, 779, 780, 781, 782, 783, 784, 785, 786, 787, 788, 789, 790, 791, 792, 793, 794, 795, 796, 797, 798, 799, 800, 801, 802, 803, 804, 805, 806, 807, 808, 809],
      generation: 7
    },
    {
      label: 'Galar (Gen 8)',
      value: 'galar',
      range: [810, 905],
      regionalDex: [810, 811, 812, 813, 814, 815, 816, 817, 818, 819, 820, 821, 822, 823, 824, 825, 826, 827, 828, 829, 830, 831, 832, 833, 834, 835, 836, 837, 838, 839, 840, 841, 842, 843, 844, 845, 846, 847, 848, 849, 850, 851, 852, 853, 854, 855, 856, 857, 858, 859, 860, 861, 862, 863, 864, 865, 866, 867, 868, 869, 870, 871, 872, 873, 874, 875, 876, 877, 878, 879, 880, 881, 882, 883, 884, 885, 886, 887, 888, 889, 890, 891, 892, 893, 894, 895, 896, 897, 898],
      generation: 8
    },
    {
      label: 'Paldea (Gen 9)',
      value: 'paldea',
      range: [906, 1025],
      regionalDex: [906, 907, 908, 909, 910, 911, 912, 913, 914, 915, 916, 917, 918, 919, 920, 921, 922, 923, 924, 925, 926, 927, 928, 929, 930, 931, 932, 933, 934, 935, 936, 937, 938, 939, 940, 941, 942, 943, 944, 945, 946, 947, 948, 949, 950, 951, 952, 953, 954, 955, 956, 957, 958, 959, 960, 961, 962, 963, 964, 965, 966, 967, 968, 969, 970, 971, 972, 973, 974, 975, 976, 977, 978, 979, 980, 981, 982, 983, 984, 985, 986, 987, 988, 989, 990, 991, 992, 993, 994, 995, 996, 997, 998, 999, 1000, 1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008, 1009, 1010, 1011, 1012, 1013, 1014, 1015, 1016, 1017, 1018, 1019, 1020, 1021, 1022, 1023, 1024, 1025],
      generation: 9
    },
  ]


  useEffect(() => {
    fetchPokemonList()
  }, [])

  useEffect(() => {
    filterPokemonList()
  }, [searchQuery, selectedRegion, pokemonList])

  useEffect(() => {
    // Load basic data for filtered pokemon
    loadBasicDataForFiltered()
  }, [filteredPokemon])

  const fetchPokemonList = async () => {
    try {
      setLoading(true)
      const response = await fetch('https://pokeapi.co/api/v2/pokemon?limit=1025')
      const data = await response.json()
      setPokemonList(data.results)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching Pokemon list:', error)
      setLoading(false)
    }
  }

  const loadBasicDataForFiltered = async () => {
    // Load basic data for filtered Pokemon (for display in list)
    const region = regions.find(r => r.value === selectedRegion)
    if (!region) return

    const startId = region.range[0]
    const endId = region.range[1]

    // Fetch basic data for Pokemon in this region if not already loaded
    for (let id = startId; id <= Math.min(endId, startId + 50); id++) {
      if (!pokemonBasicData.has(id)) {
        fetchBasicPokemonData(id)
      }
    }
  }

  const fetchBasicPokemonData = async (id: number) => {
    try {
      const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`)
      const data = await response.json()

      const basic: PokemonBasic = {
        id: data.id,
        name: data.name,
        types: data.types.map((t: any) => t.type.name),
        stats: {
          hp: data.stats[0].base_stat,
          attack: data.stats[1].base_stat,
          defense: data.stats[2].base_stat,
          specialAttack: data.stats[3].base_stat,
          specialDefense: data.stats[4].base_stat,
          speed: data.stats[5].base_stat,
        },
        sprite: data.sprites.front_default
      }

      setPokemonBasicData(prev => new Map(prev).set(id, basic))
    } catch (error) {
      console.error(`Error fetching basic data for Pokemon ${id}:`, error)
    }
  }

  const filterPokemonList = async () => {
    let filtered: PokemonListItem[] = []

    // Filter by region
    const region = regions.find(r => r.value === selectedRegion)
    if (region) {
      if (region.regionalDex === null) {
        // National dex - show ALL 1,025 Pokemon
        for (let i = 0; i < pokemonList.length; i++) {
          const id = i + 1
          filtered.push({ ...pokemonList[i], id })
        }
      } else {
        // Regional dex - only show Pokemon in that region's specific dex
        for (const id of region.regionalDex) {
          if (pokemonList[id - 1]) {
            filtered.push({ ...pokemonList[id - 1], id })
          }
        }
      }
    }

    // Filter by search query (name, number, type, or move)
    if (searchQuery) {
      const query = searchQuery.toLowerCase().trim()

      // Quick filters for name and number (no API calls needed)
      const quickFiltered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.id === parseInt(query)
      )

      // If the query matches by name/number, use that
      if (quickFiltered.length > 0) {
        filtered = quickFiltered
      } else {
        // Check if searching by type or move (requires loading basic data)
        const matchedIds = new Set<number>()

        for (const pokemon of filtered) {
          const id = pokemon.id!

          // Load basic data if not already loaded (for type checking)
          if (!pokemonBasicData.has(id)) {
            await fetchBasicPokemonData(id)
          }

          const basicData = pokemonBasicData.get(id)

          // Check if type matches
          if (basicData?.types.some(type => type.toLowerCase().includes(query))) {
            matchedIds.add(id)
          }
        }

        // Filter to matched Pokemon
        if (matchedIds.size > 0) {
          filtered = filtered.filter(p => matchedIds.has(p.id!))
        } else {
          // If no matches found, return empty array
          filtered = []
        }
      }
    }

    setFilteredPokemon(filtered)
  }

  const calculateStat = (base: number, level: number, iv: number, isHP: boolean = false): number => {
    if (isHP) {
      return Math.floor(((2 * base + iv) * level) / 100) + level + 10
    } else {
      return Math.floor(((2 * base + iv) * level) / 100) + 5
    }
  }

  const calculateWeaknesses = (types: string[]): Record<string, number> => {
    const weaknesses: Record<string, number> = {}
    Object.keys(TYPE_CHART).forEach(type => {
      weaknesses[type] = 1
    })
    types.forEach(defenderType => {
      Object.entries(TYPE_CHART).forEach(([attackerType, effectiveness]) => {
        const multiplier = effectiveness[defenderType] || 1
        weaknesses[attackerType] *= multiplier
      })
    })
    return weaknesses
  }

  const fetchPokemonDetails = async (url: string, id: number): Promise<Pokemon> => {
    const [pokemonResponse, speciesResponse] = await Promise.all([
      fetch(url),
      fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}`)
    ])

    const pokemonData = await pokemonResponse.json()
    const speciesData = await speciesResponse.json()

    const evolutionResponse = await fetch(speciesData.evolution_chain.url)
    const evolutionData = await evolutionResponse.json()
    const evolutions = await parseEvolutionChain(evolutionData.chain)

    const moves = await fetchMoves(pokemonData.moves, pokemonData.id)

    const genderRate = speciesData.gender_rate
    let genderRatio = null
    if (genderRate !== -1) {
      genderRatio = {
        female: (genderRate / 8) * 100,
        male: ((8 - genderRate) / 8) * 100
      }
    }

    const types = pokemonData.types.map((t: any) => t.type.name)
    const weaknesses = calculateWeaknesses(types)

    return {
      id: pokemonData.id,
      name: pokemonData.name,
      types,
      sprite: pokemonData.sprites.other['official-artwork'].front_default || pokemonData.sprites.front_default,
      stats: {
        hp: pokemonData.stats[0].base_stat,
        attack: pokemonData.stats[1].base_stat,
        defense: pokemonData.stats[2].base_stat,
        specialAttack: pokemonData.stats[3].base_stat,
        specialDefense: pokemonData.stats[4].base_stat,
        speed: pokemonData.stats[5].base_stat,
      },
      height: pokemonData.height / 10,
      weight: pokemonData.weight / 10,
      abilities: pokemonData.abilities.map((a: any) => a.ability.name),
      species: pokemonData.species.name,
      eggGroups: speciesData.egg_groups.map((g: any) => g.name),
      genderRatio,
      evolutions,
      moves,
      weaknesses,
    }
  }

  const parseEvolutionChain = async (chain: any): Promise<EvolutionChain[]> => {
    const evolutions: EvolutionChain[] = []
    let current = chain

    const addEvolution = async (evo: any) => {
      const id = parseInt(evo.species.url.split('/').slice(-2, -1)[0])
      const spriteResponse = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`)
      const spriteData = await spriteResponse.json()

      // Determine which generation this Pokemon was introduced
      let minGeneration = 1
      if (id <= 151) minGeneration = 1
      else if (id <= 251) minGeneration = 2
      else if (id <= 386) minGeneration = 3
      else if (id <= 493) minGeneration = 4
      else if (id <= 649) minGeneration = 5
      else if (id <= 721) minGeneration = 6
      else if (id <= 809) minGeneration = 7
      else if (id <= 905) minGeneration = 8
      else minGeneration = 9

      let method = 'Base'
      let evoGeneration = minGeneration

      if (evo.evolution_details && evo.evolution_details.length > 0) {
        const detail = evo.evolution_details[0]
        if (detail.min_level) {
          method = `Level ${detail.min_level}`
        } else if (detail.item) {
          method = detail.item.name.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
          // Determine item generation
          if (detail.item.name.includes('sinnoh') || detail.item.name.includes('dusk') || detail.item.name.includes('dawn') || detail.item.name.includes('shiny')) {
            evoGeneration = Math.max(evoGeneration, 4)
          } else if (detail.item.name.includes('linking') || detail.item.name === 'prism-scale' || detail.item.name === 'razor-claw') {
            evoGeneration = Math.max(evoGeneration, 5)
          }
        } else if (detail.trigger.name === 'trade') {
          if (detail.held_item) {
            method = `Trade holding ${detail.held_item.name}`
            evoGeneration = Math.max(evoGeneration, 2)
          } else {
            method = 'Trade'
          }
        } else if (detail.min_happiness) {
          method = `Friendship`
          evoGeneration = Math.max(evoGeneration, 2)
        } else if (detail.min_beauty) {
          method = `Beauty ${detail.min_beauty}`
          evoGeneration = Math.max(evoGeneration, 3)
        } else if (detail.known_move) {
          method = `Learn ${detail.known_move.name}`
        } else if (detail.location) {
          method = `At ${detail.location.name}`
        } else {
          method = detail.trigger.name.charAt(0).toUpperCase() + detail.trigger.name.slice(1)
        }
      }

      evolutions.push({
        name: evo.species.name,
        id,
        method,
        sprite: spriteData.sprites.front_default,
        minGeneration: evoGeneration
      })
    }

    while (current) {
      await addEvolution(current)
      current = current.evolves_to[0]
    }

    return evolutions
  }

  const VERSION_GROUP_TO_GEN: Record<string, number> = {
    'red-blue': 1, 'yellow': 1,
    'gold-silver': 2, 'crystal': 2,
    'ruby-sapphire': 3, 'emerald': 3, 'firered-leafgreen': 3,
    'diamond-pearl': 4, 'platinum': 4, 'heartgold-soulsilver': 4,
    'black-white': 5, 'black-2-white-2': 5,
    'x-y': 6, 'omega-ruby-alpha-sapphire': 6,
    'sun-moon': 7, 'ultra-sun-ultra-moon': 7,
    'sword-shield': 8, 'brilliant-diamond-shining-pearl': 8, 'legends-arceus': 8,
    'scarlet-violet': 9
  }

  const fetchMoves = async (movesList: any[], pokemonId: number): Promise<MoveLearnset> => {
    const levelUpMap = new Map<string, LevelUpMove>()
    const tmMap = new Map<string, TMMove>()
    const egg: string[] = []
    const tutor: string[] = []

    // Process all version groups to collect generation data
    for (const moveEntry of movesList) {
      const moveData = await fetch(moveEntry.move.url).then(r => r.json())

      for (const versionDetails of moveEntry.version_group_details) {
        const versionGroup = versionDetails.version_group.name
        const gen = VERSION_GROUP_TO_GEN[versionGroup] || 9
        const method = versionDetails.move_learn_method.name

        const moveInfo = {
          name: moveEntry.move.name,
          type: moveData.type.name,
          category: moveData.damage_class.name,
          power: moveData.power,
          accuracy: moveData.accuracy,
        }

        if (method === 'level-up') {
          const key = moveEntry.move.name
          if (levelUpMap.has(key)) {
            const existing = levelUpMap.get(key)!
            if (!existing.generations.includes(gen)) {
              existing.generations.push(gen)
            }
          } else {
            levelUpMap.set(key, {
              ...moveInfo,
              level: versionDetails.level_learned_at,
              generations: [gen],
              versionGroup
            })
          }
        } else if (method === 'machine') {
          const key = moveEntry.move.name
          if (tmMap.has(key)) {
            const existing = tmMap.get(key)!
            if (!existing.generations.includes(gen)) {
              existing.generations.push(gen)
            }
          } else {
            tmMap.set(key, {
              ...moveInfo,
              generations: [gen],
              versionGroup
            })
          }
        } else if (method === 'egg' && !egg.includes(moveEntry.move.name)) {
          egg.push(moveEntry.move.name)
        } else if (method === 'tutor' && !tutor.includes(moveEntry.move.name)) {
          tutor.push(moveEntry.move.name)
        }
      }
    }

    const levelUp = Array.from(levelUpMap.values()).sort((a, b) => a.level - b.level)
    const tm = Array.from(tmMap.values())

    return { levelUp, tm, egg, tutor }
  }

  const handlePokemonClick = async (pokemon: PokemonListItem, index: number) => {
    const id = pokemon.id || 0

    if (selectedPokemon?.id === id) {
      setSelectedPokemon(null)
      setDetailsLoading(false)
      return
    }

    setDetailsLoading(true)
    document.body.classList.add('loading')
    try {
      const details = await fetchPokemonDetails(pokemon.url, id)
      setSelectedPokemon(details)
    } catch (error) {
      console.error('Error loading Pokemon details:', error)
    } finally {
      setDetailsLoading(false)
      document.body.classList.remove('loading')
    }
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  return (
    <div className="w-full px-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Pokédex</h2>

          {/* Search & Filters */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search by name, #, type, or move..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                {regions.map(region => (
                  <option key={region.value} value={region.value}>{region.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Pokemon List */}
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            filteredPokemon.map((pokemon) => {
              const id = pokemon.id || 0
              const isSelected = selectedPokemon?.id === id
              const basicData = pokemonBasicData.get(id)

              return (
                <div key={id}>
                  {/* Pokemon List Item - Wide Layout */}
                  <button
                    onClick={() => handlePokemonClick(pokemon, id - 1)}
                    className={`w-full px-6 py-4 flex items-center gap-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                      isSelected ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                    }`}
                  >
                    {/* Left: Name & Number */}
                    <div className="flex items-center gap-3 w-48">
                      <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                        #{id.toString().padStart(4, '0')}
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                        {pokemon.name}
                      </span>
                    </div>

                    {/* Middle: Types & Mini Sprite */}
                    <div className="flex items-center gap-3 flex-1">
                      {basicData?.sprite && (
                        <img src={basicData.sprite} alt={pokemon.name} className="w-12 h-12" />
                      )}
                      <div className="flex gap-1">
                        {basicData?.types.map(type => (
                          <span
                            key={type}
                            className={`${TYPE_COLORS[type]} text-white px-2 py-0.5 rounded text-xs font-medium capitalize`}
                          >
                            {type}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Right: Base Stats */}
                    {basicData && (
                      <div className="flex gap-4 text-xs font-mono text-gray-600 dark:text-gray-400">
                        <div className="text-center">
                          <div className="text-gray-500 dark:text-gray-500">HP</div>
                          <div className="font-semibold text-gray-900 dark:text-white">{basicData.stats.hp}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-gray-500 dark:text-gray-500">Atk</div>
                          <div className="font-semibold text-gray-900 dark:text-white">{basicData.stats.attack}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-gray-500 dark:text-gray-500">Def</div>
                          <div className="font-semibold text-gray-900 dark:text-white">{basicData.stats.defense}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-gray-500 dark:text-gray-500">SpA</div>
                          <div className="font-semibold text-gray-900 dark:text-white">{basicData.stats.specialAttack}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-gray-500 dark:text-gray-500">SpD</div>
                          <div className="font-semibold text-gray-900 dark:text-white">{basicData.stats.specialDefense}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-gray-500 dark:text-gray-500">Spe</div>
                          <div className="font-semibold text-gray-900 dark:text-white">{basicData.stats.speed}</div>
                        </div>
                        <div className="text-center border-l border-gray-300 dark:border-gray-600 pl-4">
                          <div className="text-gray-500 dark:text-gray-500">Total</div>
                          <div className="font-bold text-gray-900 dark:text-white">
                            {Object.values(basicData.stats).reduce((a, b) => a + b, 0)}
                          </div>
                        </div>
                      </div>
                    )}
                  </button>

                  {/* Expanded Pokemon Details (inline below) */}
                  {isSelected && (
                    <div className="bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
                      {detailsLoading ? (
                        <div className="flex justify-center items-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                      ) : (
                        <div className="p-4">
                          {/* Header */}
                          <div className="flex items-start gap-4 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shrink-0">
                              <img
                                src={selectedPokemon.sprite}
                                alt={selectedPokemon.name}
                                className="w-32 h-32 object-contain"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white capitalize">
                                  {selectedPokemon.name}
                                </h3>
                                <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                                  #{selectedPokemon.id.toString().padStart(4, '0')}
                                </span>
                              </div>
                              <div className="flex gap-2 mb-3">
                                {selectedPokemon.types.map(type => (
                                  <span
                                    key={type}
                                    className={`${TYPE_COLORS[type]} text-white px-3 py-1 rounded text-xs font-medium capitalize`}
                                  >
                                    {type}
                                  </span>
                                ))}
                              </div>
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                  <p className="text-gray-600 dark:text-gray-400 text-xs">Height</p>
                                  <p className="font-semibold text-gray-900 dark:text-white">{selectedPokemon.height}m</p>
                                </div>
                                <div>
                                  <p className="text-gray-600 dark:text-gray-400 text-xs">Weight</p>
                                  <p className="font-semibold text-gray-900 dark:text-white">{selectedPokemon.weight}kg</p>
                                </div>
                              </div>
                              <div className="mt-3">
                                <p className="text-gray-600 dark:text-gray-400 text-xs mb-1">Abilities</p>
                                <div className="flex flex-wrap gap-1">
                                  {selectedPokemon.abilities.map(ability => (
                                    <span
                                      key={ability}
                                      className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded text-xs capitalize"
                                    >
                                      {ability.replace('-', ' ')}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Stats Section */}
                          <div className="border border-gray-200 dark:border-gray-700 rounded-lg mb-3 bg-white dark:bg-gray-800">
                            <button
                              onClick={() => toggleSection('stats')}
                              className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-t-lg"
                            >
                              <h4 className="font-semibold text-sm text-gray-900 dark:text-white">Base Stats & Calculations</h4>
                              {expandedSections.stats ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                            {expandedSections.stats && (
                              <div className="p-3 border-t border-gray-200 dark:border-gray-700">
                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="border-b border-gray-200 dark:border-gray-700">
                                        <th className="text-left py-1 px-1 text-gray-700 dark:text-gray-300">Stat</th>
                                        <th className="text-center py-1 px-1 text-gray-700 dark:text-gray-300">Base</th>
                                        <th className="text-center py-1 px-1 text-gray-700 dark:text-gray-300">L50(0)</th>
                                        <th className="text-center py-1 px-1 text-gray-700 dark:text-gray-300">L50(31)</th>
                                        <th className="text-center py-1 px-1 text-gray-700 dark:text-gray-300">L100(0)</th>
                                        <th className="text-center py-1 px-1 text-gray-700 dark:text-gray-300">L100(31)</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {[
                                        { name: 'HP', value: selectedPokemon.stats.hp, isHP: true },
                                        { name: 'Atk', value: selectedPokemon.stats.attack, isHP: false },
                                        { name: 'Def', value: selectedPokemon.stats.defense, isHP: false },
                                        { name: 'SpA', value: selectedPokemon.stats.specialAttack, isHP: false },
                                        { name: 'SpD', value: selectedPokemon.stats.specialDefense, isHP: false },
                                        { name: 'Spe', value: selectedPokemon.stats.speed, isHP: false },
                                      ].map(stat => (
                                        <tr key={stat.name} className="border-b border-gray-200 dark:border-gray-700">
                                          <td className="py-1 px-1 font-medium text-gray-900 dark:text-white">{stat.name}</td>
                                          <td className="py-1 px-1 text-center text-gray-900 dark:text-white font-semibold">{stat.value}</td>
                                          <td className="py-1 px-1 text-center text-gray-600 dark:text-gray-400">
                                            {calculateStat(stat.value, 50, 0, stat.isHP)}
                                          </td>
                                          <td className="py-1 px-1 text-center text-gray-600 dark:text-gray-400">
                                            {calculateStat(stat.value, 50, 31, stat.isHP)}
                                          </td>
                                          <td className="py-1 px-1 text-center text-gray-600 dark:text-gray-400">
                                            {calculateStat(stat.value, 100, 0, stat.isHP)}
                                          </td>
                                          <td className="py-1 px-1 text-center text-gray-600 dark:text-gray-400">
                                            {calculateStat(stat.value, 100, 31, stat.isHP)}
                                          </td>
                                        </tr>
                                      ))}
                                      <tr className="font-semibold">
                                        <td className="py-1 px-1 text-gray-900 dark:text-white">Total</td>
                                        <td className="py-1 px-1 text-center text-gray-900 dark:text-white">
                                          {Object.values(selectedPokemon.stats).reduce((a, b) => a + b, 0)}
                                        </td>
                                        <td colSpan={4}></td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Type Effectiveness */}
                          <div className="border border-gray-200 dark:border-gray-700 rounded-lg mb-3 bg-white dark:bg-gray-800">
                            <button
                              onClick={() => toggleSection('weakness')}
                              className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-t-lg"
                            >
                              <h4 className="font-semibold text-sm text-gray-900 dark:text-white">Type Effectiveness</h4>
                              {expandedSections.weakness ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                            {expandedSections.weakness && (
                              <div className="p-3 border-t border-gray-200 dark:border-gray-700">
                                <div className="grid grid-cols-3 gap-1">
                                  {Object.entries(selectedPokemon.weaknesses)
                                    .filter(([_, mult]) => mult !== 1)
                                    .sort(([_, a], [__, b]) => b - a)
                                    .map(([type, multiplier]) => (
                                      <div
                                        key={type}
                                        className={`flex items-center justify-between px-2 py-1 rounded text-xs ${
                                          multiplier === 0
                                            ? 'bg-gray-200 dark:bg-gray-700'
                                            : multiplier >= 2
                                            ? 'bg-red-100 dark:bg-red-900/30'
                                            : 'bg-green-100 dark:bg-green-900/30'
                                        }`}
                                      >
                                        <span className="capitalize font-medium text-gray-900 dark:text-white">{type}</span>
                                        <span className={`font-bold ${
                                          multiplier === 0
                                            ? 'text-gray-600 dark:text-gray-400'
                                            : multiplier >= 2
                                            ? 'text-red-700 dark:text-red-400'
                                            : 'text-green-700 dark:text-green-400'
                                        }`}>
                                          {multiplier === 0 ? '0×' : `${multiplier}×`}
                                        </span>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Evolution Chain */}
                          <div className="border border-gray-200 dark:border-gray-700 rounded-lg mb-3 bg-white dark:bg-gray-800">
                            <button
                              onClick={() => toggleSection('evolution')}
                              className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-t-lg"
                            >
                              <h4 className="font-semibold text-sm text-gray-900 dark:text-white">Evolution Chain</h4>
                              {expandedSections.evolution ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                            {expandedSections.evolution && (
                              <div className="p-3 border-t border-gray-200 dark:border-gray-700">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {selectedPokemon.evolutions
                                    .filter(evo => {
                                      const region = regions.find(r => r.value === selectedRegion)
                                      return region && evo.minGeneration <= region.generation
                                    })
                                    .map((evo, idx, filteredArray) => (
                                    <div key={evo.id} className="flex items-center gap-2">
                                      <div className="text-center">
                                        <img src={evo.sprite} alt={evo.name} className="w-16 h-16 mx-auto" />
                                        <p className="text-xs font-medium text-gray-900 dark:text-white capitalize">{evo.name}</p>
                                        <p className="text-xs text-blue-600 dark:text-blue-400">{evo.method}</p>
                                      </div>
                                      {idx < filteredArray.length - 1 && (
                                        <span className="text-xl text-gray-400">→</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Breeding */}
                          <div className="border border-gray-200 dark:border-gray-700 rounded-lg mb-3 bg-white dark:bg-gray-800">
                            <button
                              onClick={() => toggleSection('breeding')}
                              className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-t-lg"
                            >
                              <h4 className="font-semibold text-sm text-gray-900 dark:text-white">Breeding</h4>
                              {expandedSections.breeding ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                            {expandedSections.breeding && (
                              <div className="p-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
                                <div>
                                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Egg Groups</p>
                                  <div className="flex gap-1">
                                    {selectedPokemon.eggGroups.map(group => (
                                      <span
                                        key={group}
                                        className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-2 py-0.5 rounded text-xs capitalize"
                                      >
                                        {group}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                                {selectedPokemon.genderRatio && (
                                  <div>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Gender Ratio</p>
                                    <div className="flex gap-3 text-xs">
                                      <span className="text-blue-600 dark:text-blue-400">
                                        ♂ {selectedPokemon.genderRatio.male.toFixed(1)}%
                                      </span>
                                      <span className="text-pink-600 dark:text-pink-400">
                                        ♀ {selectedPokemon.genderRatio.female.toFixed(1)}%
                                      </span>
                                    </div>
                                  </div>
                                )}
                                {selectedPokemon.moves.egg.length > 0 && (
                                  <div>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Egg Moves</p>
                                    <div className="flex flex-wrap gap-1">
                                      {selectedPokemon.moves.egg.slice(0, 20).map(move => (
                                        <span
                                          key={move}
                                          className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded text-xs capitalize"
                                        >
                                          {move.replace('-', ' ')}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Moves */}
                          <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                            <button
                              onClick={() => toggleSection('moves')}
                              className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-t-lg"
                            >
                              <h4 className="font-semibold text-sm text-gray-900 dark:text-white">Moves</h4>
                              {expandedSections.moves ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                            {expandedSections.moves && (
                              <div className="p-3 border-t border-gray-200 dark:border-gray-700 space-y-4 max-h-96 overflow-y-auto">
                                {/* Level-up Moves */}
                                <div>
                                  <h5 className="font-semibold text-xs text-gray-900 dark:text-white mb-2">Level-up Moves</h5>
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr className="border-b border-gray-200 dark:border-gray-700">
                                          <th className="text-left py-1 px-1 text-gray-700 dark:text-gray-300">Lv</th>
                                          <th className="text-left py-1 px-1 text-gray-700 dark:text-gray-300">Move</th>
                                          <th className="text-left py-1 px-1 text-gray-700 dark:text-gray-300">Type</th>
                                          <th className="text-left py-1 px-1 text-gray-700 dark:text-gray-300">Cat</th>
                                          <th className="text-center py-1 px-1 text-gray-700 dark:text-gray-300">Pow</th>
                                          <th className="text-center py-1 px-1 text-gray-700 dark:text-gray-300">Acc</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {selectedPokemon.moves.levelUp
                                          .filter(move => {
                                            const region = regions.find(r => r.value === selectedRegion)
                                            return region && move.generations.some(gen => gen <= region.generation)
                                          })
                                          .map((move, idx) => (
                                          <tr key={idx} className="border-b border-gray-200 dark:border-gray-700">
                                            <td className="py-1 px-1 text-gray-900 dark:text-white">{move.level}</td>
                                            <td className="py-1 px-1 text-gray-900 dark:text-white capitalize">
                                              {move.name.replace('-', ' ')}
                                            </td>
                                            <td className="py-1 px-1">
                                              <span className={`${TYPE_COLORS[move.type]} text-white px-1 py-0.5 rounded text-xs capitalize`}>
                                                {move.type.slice(0, 3)}
                                              </span>
                                            </td>
                                            <td className="py-1 px-1 text-gray-600 dark:text-gray-400 capitalize">
                                              {move.category.slice(0, 3)}
                                            </td>
                                            <td className="py-1 px-1 text-center text-gray-600 dark:text-gray-400">
                                              {move.power || '—'}
                                            </td>
                                            <td className="py-1 px-1 text-center text-gray-600 dark:text-gray-400">
                                              {move.accuracy || '—'}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>

                                {/* TM/HM Moves */}
                                {selectedPokemon.moves.tm.length > 0 && (
                                  <div>
                                    <h5 className="font-semibold text-xs text-gray-900 dark:text-white mb-2">TM/HM Moves</h5>
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-xs">
                                        <thead>
                                          <tr className="border-b border-gray-200 dark:border-gray-700">
                                            <th className="text-left py-1 px-1 text-gray-700 dark:text-gray-300">Move</th>
                                            <th className="text-left py-1 px-1 text-gray-700 dark:text-gray-300">Type</th>
                                            <th className="text-left py-1 px-1 text-gray-700 dark:text-gray-300">Cat</th>
                                            <th className="text-center py-1 px-1 text-gray-700 dark:text-gray-300">Pow</th>
                                            <th className="text-center py-1 px-1 text-gray-700 dark:text-gray-300">Acc</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {selectedPokemon.moves.tm
                                            .filter(move => {
                                              const region = regions.find(r => r.value === selectedRegion)
                                              return region && move.generations.some(gen => gen <= region.generation)
                                            })
                                            .map((move, idx) => (
                                            <tr key={idx} className="border-b border-gray-200 dark:border-gray-700">
                                              <td className="py-1 px-1 text-gray-900 dark:text-white capitalize">
                                                {move.name.replace('-', ' ')}
                                              </td>
                                              <td className="py-1 px-1">
                                                <span className={`${TYPE_COLORS[move.type]} text-white px-1 py-0.5 rounded text-xs capitalize`}>
                                                  {move.type.slice(0, 3)}
                                                </span>
                                              </td>
                                              <td className="py-1 px-1 text-gray-600 dark:text-gray-400 capitalize">
                                                {move.category.slice(0, 3)}
                                              </td>
                                              <td className="py-1 px-1 text-center text-gray-600 dark:text-gray-400">
                                                {move.power || '—'}
                                              </td>
                                              <td className="py-1 px-1 text-center text-gray-600 dark:text-gray-400">
                                                {move.accuracy || '—'}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}

                                {/* Tutor Moves */}
                                {selectedPokemon.moves.tutor.length > 0 && (
                                  <div>
                                    <h5 className="font-semibold text-xs text-gray-900 dark:text-white mb-1">Tutor Moves</h5>
                                    <div className="flex flex-wrap gap-1">
                                      {selectedPokemon.moves.tutor.slice(0, 20).map(move => (
                                        <span
                                          key={move}
                                          className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded text-xs capitalize"
                                        >
                                          {move.replace('-', ' ')}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
