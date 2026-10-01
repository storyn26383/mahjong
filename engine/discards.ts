import { handSize, MAX_HAND_SIZE, type Hand } from './hand'
import { sortTiles, type Tile } from './tile'
import { analyseWaits, type Wait } from './waits'

export interface DiscardOption {
  discard: Tile
  waits: Tile[]
}

const withoutOne = (hand: Hand, tile: Tile): Hand => {
  const concealed = [...hand.concealed]
  concealed.splice(concealed.indexOf(tile), 1)
  return { ...hand, concealed }
}

/** 打出去嗰張已經見到，唔再算做未見。 */
const unseenCount = (waits: Wait[], discard: Tile): number =>
  waits.reduce((sum, wait) => sum + wait.remaining - (wait.tile === discard ? 1 : 0), 0)

/** 17 張手牌：列出打完即刻聽牌嘅打法，聽嘅種數多排前，再比未見張數，再按牌序。 */
export const suggestDiscards = (hand: Hand): DiscardOption[] => {
  if (handSize(hand) !== MAX_HAND_SIZE) return []
  return sortTiles([...new Set(hand.concealed)])
    .map(discard => ({ discard, waits: analyseWaits(withoutOne(hand, discard)) }))
    .filter(option => option.waits.length > 0)
    .sort((first, second) =>
      second.waits.length - first.waits.length
      || unseenCount(second.waits, second.discard) - unseenCount(first.waits, first.discard))
    .map(option => ({ discard: option.discard, waits: option.waits.map(wait => wait.tile) }))
}
