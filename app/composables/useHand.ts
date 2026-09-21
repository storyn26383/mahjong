import { emptyHand, type Hand, type Meld } from '~~/engine/hand'
import type { Tile } from '~~/engine/tile'

/** 聽牌頁同計台頁共用嘅手牌。 */
export const useHand = () => {
  const hand = usePersistedState<Hand>('mahjong.hand', emptyHand)

  const addConcealed = (tile: Tile) => hand.value.concealed.push(tile)
  const removeConcealed = (index: number) => hand.value.concealed.splice(index, 1)
  const addMeld = (meld: Meld) => hand.value.melds.push(meld)
  const removeMeld = (index: number) => hand.value.melds.splice(index, 1)
  const addFlower = (tile: Tile) => hand.value.flowers.push(tile)
  const removeFlower = (index: number) => hand.value.flowers.splice(index, 1)
  const clear = () => { hand.value = emptyHand() }

  return { hand, addConcealed, removeConcealed, addMeld, removeMeld, addFlower, removeFlower, clear }
}
