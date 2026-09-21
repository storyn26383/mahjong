import { Blessing, FlowerWin, LastTile, ReadyDeclaration, Wind, WinMethod, type Situation } from '~~/engine/scoring'
import { PLAYABLE_TILES } from '~~/engine/tile'

const defaultSituation = (): Situation => ({
  winningTile: PLAYABLE_TILES[0]!,
  winMethod: WinMethod.Discard,
  roundWind: Wind.East,
  seatWind: Wind.East,
  isDealer: false,
  dealerStreak: 0,
  lastTile: LastTile.None,
  isKongReplacement: false,
  isRobbingKong: false,
  blessing: Blessing.None,
  readyDeclaration: ReadyDeclaration.None,
  flowerWin: FlowerWin.None,
})

/** 計台頁嘅局面選項，留喺記憶體，跨頁保留。 */
export const useSituation = () => useState<Situation>('situation', defaultSituation)
