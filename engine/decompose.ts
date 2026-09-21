import { chowStartingAt, PLAYABLE_TILES, type Tile } from './tile'

export enum SetKind {
  Chow = 'chow',
  Pung = 'pung',
}

export interface TileSet {
  kind: SetKind
  tiles: Tile[]
}

/** 一種拆法：一對將加若干組面子。 */
export interface Decomposition {
  pair: Tile
  sets: TileSet[]
}

const TILES_PER_PAIR = 2
const TILES_PER_SET = 3

type Counts = Map<Tile, number>

const countTiles = (tiles: Tile[]): Counts => {
  const counts: Counts = new Map()
  for (const tile of tiles) counts.set(tile, (counts.get(tile) ?? 0) + 1)
  return counts
}

const countIn = (counts: Counts, tile: Tile): number => counts.get(tile) ?? 0
const take = (counts: Counts, tiles: Tile[]) => tiles.forEach(tile => counts.set(tile, countIn(counts, tile) - 1))
const give = (counts: Counts, tiles: Tile[]) => tiles.forEach(tile => counts.set(tile, countIn(counts, tile) + 1))
const isAvailable = (counts: Counts, tiles: Tile[]) =>
  [...countTiles(tiles)].every(([tile, needed]) => countIn(counts, tile) >= needed)

/** 用 `tiles` 組成一組面子後，餘下牌嘅所有拆法。 */
const withSet = (counts: Counts, kind: SetKind, tiles: Tile[]): TileSet[][] => {
  if (!isAvailable(counts, tiles)) return []
  take(counts, tiles)
  const results = extractSets(counts).map(rest => [{ kind, tiles }, ...rest])
  give(counts, tiles)
  return results
}

/** 由最細嗰隻牌開始，每次要麼砌刻子要麼砌順子，枚舉所有面子拆法。 */
const extractSets = (counts: Counts): TileSet[][] => {
  const lowest = PLAYABLE_TILES.find(tile => countIn(counts, tile) > 0)
  if (!lowest) return [[]]
  const chow = chowStartingAt(lowest)
  return [
    ...withSet(counts, SetKind.Pung, Array(TILES_PER_SET).fill(lowest)),
    ...(chow ? withSet(counts, SetKind.Chow, chow) : []),
  ]
}

/** 列出所有「一對將 + 面子」嘅拆法；唔成胡就係空列表。 */
export const decompose = (tiles: Tile[]): Decomposition[] => {
  if (tiles.length % TILES_PER_SET !== TILES_PER_PAIR) return []
  const counts = countTiles(tiles)
  return [...counts.keys()]
    .filter(pair => countIn(counts, pair) >= TILES_PER_PAIR)
    .flatMap((pair) => {
      take(counts, [pair, pair])
      const results = extractSets(counts).map(sets => ({ pair, sets }))
      give(counts, [pair, pair])
      return results
    })
}
