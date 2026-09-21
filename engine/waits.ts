import { decompose, SetKind, type Decomposition } from './decompose'
import { countOf, HAND_SIZE, handSize, type Hand } from './hand'
import { COPIES_PER_TILE, isHighestRank, isLowestRank, PLAYABLE_TILES, type Tile } from './tile'

export enum WaitKind {
  /** 邊張 */
  Edge = 'edge',
  /** 嵌張 */
  Closed = 'closed',
  /** 單吊 */
  Single = 'single',
  /** 雙洞或多面聽，唔算獨聽 */
  Multiple = 'multiple',
}

export interface Wait {
  tile: Tile
  kind: WaitKind
  /** 扣除自己暗牌同副露後仍未見嘅張數 */
  remaining: number
}

const LONE_KIND_PRIORITY = [WaitKind.Single, WaitKind.Edge, WaitKind.Closed]

enum ChowPosition {
  Low = 0,
  Middle = 1,
  High = 2,
}

/** 胡嘅張牌喺順子入面嘅角色：一二等三、八九等七係邊張，中間係嵌張，其餘係兩面。 */
const chowRole = (chow: Tile[], winning: Tile): WaitKind => {
  const position = chow.indexOf(winning)
  if (position === ChowPosition.Middle) return WaitKind.Closed
  const isLowEdge = position === ChowPosition.High && isLowestRank(chow[ChowPosition.Low]!)
  const isHighEdge = position === ChowPosition.Low && isHighestRank(chow[ChowPosition.High]!)
  return isLowEdge || isHighEdge ? WaitKind.Edge : WaitKind.Multiple
}

const rolesIn = (decomposition: Decomposition, winning: Tile): WaitKind[] => [
  ...(decomposition.pair === winning ? [WaitKind.Single] : []),
  ...decomposition.sets
    .filter(set => set.tiles.includes(winning))
    .map(set => (set.kind === SetKind.Chow ? chowRole(set.tiles, winning) : WaitKind.Multiple)),
]

const loneWaitKind = (concealed: Tile[], winning: Tile): WaitKind => {
  const roles = new Set(decompose([...concealed, winning]).flatMap(decomposition => rolesIn(decomposition, winning)))
  return LONE_KIND_PRIORITY.find(kind => roles.has(kind)) ?? WaitKind.Multiple
}

export const isWinningTile = (hand: Hand, winning: Tile): boolean =>
  countOf(hand, winning) < COPIES_PER_TILE && decompose([...hand.concealed, winning]).length > 0

/** 16 張手牌聽咩牌。 */
export const analyseWaits = (hand: Hand): Wait[] => {
  if (handSize(hand) !== HAND_SIZE) return []
  const winning = PLAYABLE_TILES.filter(tile => isWinningTile(hand, tile))
  const kind = winning.length === 1 ? loneWaitKind(hand.concealed, winning[0]!) : WaitKind.Multiple
  return winning.map(tile => ({ tile, kind, remaining: COPIES_PER_TILE - countOf(hand, tile) }))
}
