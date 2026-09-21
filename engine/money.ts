import { WinMethod } from './scoring'

export interface Stakes {
  /** 底分 */
  base: number
  /** 台分 */
  perTai: number
}

export const DEFAULT_STAKES: Stakes = { base: 50, perTai: 20 }

const PAYERS_ON_SELF_DRAW = 3
const PAYERS_ON_DISCARD = 1

export interface Settlement {
  perPayer: number
  payers: number
  total: number
}

/** 金額 = 底 + 台 × 台數；自摸三家各賠一份，放槍一家賠。 */
export const settle = (stakes: Stakes, totalTai: number, winMethod: WinMethod): Settlement => {
  const perPayer = stakes.base + stakes.perTai * totalTai
  const payers = winMethod === WinMethod.SelfDraw ? PAYERS_ON_SELF_DRAW : PAYERS_ON_DISCARD
  return { perPayer, payers, total: perPayer * payers }
}
