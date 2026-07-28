import { useNavStack } from '../lib/history'
import { useState, useEffect } from 'react'
import { Search } from 'lucide-react'
import { TYPE_COLORS } from '../utils/pokemonConstants'

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

interface PokemonListItem {
  name: string
  url: string
  id?: number
}

// module-level: move details shared across every pokemon and every visit

export default function Pokedex() {
  const { go } = useNavStack()
  const [pokemonList, setPokemonList] = useState<PokemonListItem[]>([])
  const [pokemonBasicData, setPokemonBasicData] = useState<Map<number, PokemonBasic>>(new Map())
  const [filteredPokemon, setFilteredPokemon] = useState<PokemonListItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRegion, setSelectedRegion] = useState<string>('national')
  const [loading, setLoading] = useState(true)

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

  // The grid loads entirely from the bundled dataset (all 1,025 with sprites
  // and stats) - no per-pokemon API calls, no rate limits. PokeAPI is only
  // touched when you open one pokemon's full detail view.
  const fetchPokemonList = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${import.meta.env.BASE_URL}pokemon-data.json`)
      const data = await response.json()

      const basics = new Map<number, PokemonBasic>()
      const list: PokemonListItem[] = data.map((p: any) => {
        basics.set(p.id, {
          id: p.id,
          name: p.name,
          types: p.types,
          stats: {
            hp: p.stats.hp,
            attack: p.stats.attack,
            defense: p.stats.defense,
            specialAttack: p.stats.spAttack,
            specialDefense: p.stats.spDefense,
            speed: p.stats.speed,
          },
          sprite: p.sprite,
        })
        return { name: p.name, url: `https://pokeapi.co/api/v2/pokemon/${p.id}`, id: p.id }
      })
      setPokemonBasicData(basics)
      setPokemonList(list)
      setLoading(false)
    } catch (error) {
      console.error('Error loading Pokemon data:', error)
      setLoading(false)
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
              const basicData = pokemonBasicData.get(id)

              return (
                <div key={id}>
                  {/* Rows open the Pokemon's own page, the same way a Pal card
                      does. Moves and evolutions live there now. */}
                  <button
                    onClick={() => go(`/pokedex/${pokemon.name}`)}
                    className="w-full px-6 py-4 flex items-center gap-6 hover:bg-gray-50 dark:hover:bg-gray-700 tactile-press text-left"
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

                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
