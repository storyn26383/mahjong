import { chowStartingAt, COPIES_PER_TILE, sortTiles, TILES_PER_CHOW, type Tile } from './tile'

export enum MeldKind {
  Chow = 'chow',
  Pung = 'pung',
  OpenKong = 'open-kong',
  ConcealedKong = 'concealed-kong',
}

export interface Meld {
  kind: MeldKind
  tiles: Tile[]
}

export interface Hand {
  concealed: Tile[]
  melds: Meld[]
  flowers: Tile[]
}

export const HAND_SIZE = 16
export const TILES_PER_MELD = 3
export const TILES_PER_PUNG = 3
export const TILES_PER_KONG = 4

export const emptyHand = (): Hand => ({ concealed: [], melds: [], flowers: [] })

/** 手牌張數：暗牌 + 每組副露計 3 張（槓亦計 3），花牌唔計。 */
export const handSize = (hand: Hand): number => hand.concealed.length + hand.melds.length * TILES_PER_MELD

/** 某隻牌喺暗牌同副露入面合共出現幾多張。 */
export const countOf = (hand: Hand, tile: Tile): number =>
  [...hand.concealed, ...hand.melds.flatMap(meld => meld.tiles)].filter(held => held === tile).length

const freeCopies = (hand: Hand, tile: Tile): number => COPIES_PER_TILE - countOf(hand, tile)

export const canAddTile = (hand: Hand, tile: Tile): boolean => freeCopies(hand, tile) >= 1
export const canAddPung = (hand: Hand, tile: Tile): boolean => freeCopies(hand, tile) >= TILES_PER_PUNG
export const canAddKong = (hand: Hand, tile: Tile): boolean => freeCopies(hand, tile) >= TILES_PER_KONG

export const isChow = (tiles: Tile[]): boolean => {
  if (tiles.length !== TILES_PER_CHOW) return false
  const sorted = sortTiles(tiles)
  const expected = chowStartingAt(sorted[0]!)
  return expected !== undefined && expected.every((tile, index) => tile === sorted[index])
}

export const canAddChow = (hand: Hand, tiles: Tile[]): boolean =>
  isChow(tiles) && tiles.every(tile => canAddTile(hand, tile))
