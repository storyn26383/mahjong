import { effectiveWinMethod, finaliseScore, FlowerWin, line, lineIf, lines, scoreFlowerWin, situationalLines, Tai, WinMethod, type Score, type ScoreLine, type Situation } from './scoring'

/** 同組單選嘅台種組別。 */
export enum ManualGroup {
  Front = 'front',
  LoneWait = 'lone-wait',
  Colour = 'colour',
  ConcealedPungs = 'concealed-pungs',
  Dragons = 'dragons',
  Winds = 'winds',
}

/** 手動勾選嘅台種。同組單選用 groups；可計數嘅用數字。 */
export interface ManualSelection {
  groups: Record<ManualGroup, Tai | undefined>
  pingHu: boolean
  pengPengHu: boolean
  dragonPungs: number
  seatWindPung: boolean
  roundWindPung: boolean
  seatFlowers: number
  flowerKongs: number
}

export const MAX_SEAT_FLOWERS = 2
export const MAX_DRAGON_PUNGS = 2
export const MAX_FLOWER_KONGS = 2

export const emptyManualSelection = (): ManualSelection => ({
  groups: {
    [ManualGroup.Front]: undefined,
    [ManualGroup.LoneWait]: undefined,
    [ManualGroup.Colour]: undefined,
    [ManualGroup.ConcealedPungs]: undefined,
    [ManualGroup.Dragons]: undefined,
    [ManualGroup.Winds]: undefined,
  },
  pingHu: false,
  pengPengHu: false,
  dragonPungs: 0,
  seatWindPung: false,
  roundWindPung: false,
  seatFlowers: 0,
  flowerKongs: 0,
})

const optional = (name: Tai | undefined): ScoreLine[] => (name ? [line(name)] : [])

/** 手動模式計台：勾選嘅台加局面台，天地人胡排除規則照用。 */
export const scoreManual = (selection: ManualSelection, situation: Situation): Score => {
  if (situation.flowerWin !== FlowerWin.None) return scoreFlowerWin(situation)
  const isSelfDraw = effectiveWinMethod(situation) === WinMethod.SelfDraw
  const isMenQing = selection.groups[ManualGroup.Front] === Tai.MenQing
  return finaliseScore([
    ...lineIf(isSelfDraw, Tai.ZiMo),
    ...Object.values(selection.groups).flatMap(optional),
    ...lineIf(isMenQing && isSelfDraw, Tai.BuQiuRen),
    ...lineIf(selection.pingHu, Tai.PingHu),
    ...lineIf(selection.pengPengHu, Tai.PengPengHu),
    ...lines(Tai.SanYuanKe, selection.dragonPungs),
    ...lineIf(selection.seatWindPung, Tai.MenFengKe),
    ...lineIf(selection.roundWindPung, Tai.QuanFengKe),
    ...lines(Tai.ZhengHua, selection.seatFlowers),
    ...lines(Tai.HuaGang, selection.flowerKongs),
    ...situationalLines(situation),
  ], situation)
}
