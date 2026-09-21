export enum Suit {
  Characters = 'm',
  Dots = 'p',
  Bamboos = 's',
  Honours = 'z',
  Flowers = 'f',
}

export type Tile = `${Suit}${number}`

export const SUITED_RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const
export const HONOUR_RANKS = [1, 2, 3, 4, 5, 6, 7] as const
export const FLOWER_RANKS = [1, 2, 3, 4, 5, 6, 7, 8] as const
export const COPIES_PER_TILE = 4
export const TILES_PER_CHOW = 3

const SUITED_SUITS: Suit[] = [Suit.Characters, Suit.Dots, Suit.Bamboos]
const LOWEST_RANK = SUITED_RANKS[0]!
const HIGHEST_RANK = SUITED_RANKS[SUITED_RANKS.length - 1]!
const HIGHEST_CHOW_START = HIGHEST_RANK - (TILES_PER_CHOW - 1)

export const tileOf = (suit: Suit, rank: number): Tile => `${suit}${rank}`
export const suitOf = (tile: Tile): Suit => tile[0] as Suit
export const rankOf = (tile: Tile): number => Number(tile.slice(1))
export const isSuited = (tile: Tile): boolean => SUITED_SUITS.includes(suitOf(tile))
export const isHonour = (tile: Tile): boolean => suitOf(tile) === Suit.Honours
export const isFlower = (tile: Tile): boolean => suitOf(tile) === Suit.Flowers
export const isLowestRank = (tile: Tile): boolean => rankOf(tile) === LOWEST_RANK
export const isHighestRank = (tile: Tile): boolean => rankOf(tile) === HIGHEST_RANK

/** 以 `lowest` 起嘅順子（例如 一二三萬）；起唔到就係 undefined。 */
export const chowStartingAt = (lowest: Tile): Tile[] | undefined => {
  if (!isSuited(lowest) || rankOf(lowest) > HIGHEST_CHOW_START) return undefined
  return Array.from({ length: TILES_PER_CHOW }, (_, offset) => tileOf(suitOf(lowest), rankOf(lowest) + offset))
}

export const SUITED_TILES: Tile[] = SUITED_SUITS.flatMap(suit => SUITED_RANKS.map(rank => tileOf(suit, rank)))
export const HONOUR_TILES: Tile[] = HONOUR_RANKS.map(rank => tileOf(Suit.Honours, rank))
export const FLOWER_TILES: Tile[] = FLOWER_RANKS.map(rank => tileOf(Suit.Flowers, rank))
export const PLAYABLE_TILES: Tile[] = [...SUITED_TILES, ...HONOUR_TILES]
export const ALL_TILES: Tile[] = [...PLAYABLE_TILES, ...FLOWER_TILES]

const WIND_COUNT = 4
export const WIND_TILES: Tile[] = HONOUR_TILES.slice(0, WIND_COUNT)
export const DRAGON_TILES: Tile[] = HONOUR_TILES.slice(WIND_COUNT)

const FLOWERS_PER_GROUP = 4
/** 梅蘭菊竹 */
export const PLANT_FLOWERS: Tile[] = FLOWER_TILES.slice(0, FLOWERS_PER_GROUP)
/** 春夏秋冬 */
export const SEASON_FLOWERS: Tile[] = FLOWER_TILES.slice(FLOWERS_PER_GROUP)

const CHINESE_NUMERALS = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九']
const SUIT_NAMES: Record<Suit, string> = {
  [Suit.Characters]: '萬',
  [Suit.Dots]: '筒',
  [Suit.Bamboos]: '條',
  [Suit.Honours]: '',
  [Suit.Flowers]: '',
}
const HONOUR_NAMES = ['', '東', '南', '西', '北', '中', '發', '白']
const FLOWER_NAMES = ['', '梅', '蘭', '菊', '竹', '春', '夏', '秋', '冬']

export const tileName = (tile: Tile): string => {
  const rank = rankOf(tile)
  if (isHonour(tile)) return HONOUR_NAMES[rank]!
  if (isFlower(tile)) return FLOWER_NAMES[rank]!
  return `${CHINESE_NUMERALS[rank]}${SUIT_NAMES[suitOf(tile)]}`
}

export const sortTiles = (tiles: Tile[]): Tile[] =>
  [...tiles].sort((first, second) => ALL_TILES.indexOf(first) - ALL_TILES.indexOf(second))
