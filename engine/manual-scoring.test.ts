import { describe, expect, test } from 'bun:test'
import { emptyManualSelection, ManualGroup, scoreManual, type ManualSelection } from './manual-scoring'
import { Blessing, FlowerWin, LastTile, ReadyDeclaration, Tai, Wind, WinMethod, type Situation } from './scoring'

const situation = (overrides: Partial<Situation> = {}): Situation => ({
  winningTile: 'm1',
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
  ...overrides,
})
const selection = (overrides: Partial<ManualSelection> = {}, groups: Partial<ManualSelection['groups']> = {}): ManualSelection => {
  const base = emptyManualSelection()
  return { ...base, ...overrides, groups: { ...base.groups, ...groups } }
}
const breakdown = (lines: { name: Tai, tai: number }[]) =>
  lines.reduce<Record<string, number>>((acc, line) => ({ ...acc, [line.name]: (acc[line.name] ?? 0) + line.tai }), {})

describe('scoreManual', () => {
  test('nothing selected by discard scores zero', () => {
    expect(scoreManual(selection(), situation())).toEqual({ lines: [], total: 0 })
  })

  test('single-select groups and toggles are summed from the tai table', () => {
    const score = scoreManual(selection({ pengPengHu: true }, { [ManualGroup.Front]: Tai.QuanQiuRen, [ManualGroup.LoneWait]: Tai.DanDiao, [ManualGroup.Colour]: Tai.QingYiSe }), situation())
    expect(breakdown(score.lines)).toEqual({ [Tai.QuanQiuRen]: 2, [Tai.DanDiao]: 1, [Tai.PengPengHu]: 4, [Tai.QingYiSe]: 8 })
    expect(score.total).toBe(15)
  })

  test('countable tai multiply by their count', () => {
    const score = scoreManual(selection({ seatFlowers: 2, dragonPungs: 2, flowerKongs: 1 }), situation())
    expect(breakdown(score.lines)).toEqual({ [Tai.ZhengHua]: 2, [Tai.SanYuanKe]: 2, [Tai.HuaGang]: 2 })
  })

  test('門清 with self-draw adds 不求人 and 自摸 (門清一摸三)', () => {
    const score = scoreManual(selection({}, { [ManualGroup.Front]: Tai.MenQing }), situation({ winMethod: WinMethod.SelfDraw }))
    expect(breakdown(score.lines)).toEqual({ [Tai.MenQing]: 1, [Tai.BuQiuRen]: 1, [Tai.ZiMo]: 1 })
  })

  test('situational tai and blessing exclusions apply as in automatic mode', () => {
    const score = scoreManual(selection({}, { [ManualGroup.Front]: Tai.MenQing }), situation({ winMethod: WinMethod.SelfDraw, blessing: Blessing.Heaven, isDealer: true, dealerStreak: 1 }))
    expect(breakdown(score.lines)).toEqual({ [Tai.TianHu]: 24, [Tai.ZhuangJia]: 1, [Tai.LianZhuang]: 2 })
  })

  test('槓上開花 forces self-draw', () => {
    const score = scoreManual(selection(), situation({ isKongReplacement: true }))
    expect(breakdown(score.lines)).toEqual({ [Tai.GangShangKaiHua]: 1, [Tai.ZiMo]: 1 })
  })
})

describe('scoreManual: flower wins', () => {
  test('八仙過海 scores in manual mode, counts as self-draw and keeps situational tai', () => {
    const score = scoreManual(selection({ pingHu: true }), situation({ flowerWin: FlowerWin.EightImmortals, isDealer: true }))
    expect(breakdown(score.lines)).toEqual({ [Tai.BaXianGuoHai]: 8, [Tai.ZiMo]: 1, [Tai.ZhuangJia]: 1 })
  })

  test('七搶一 scores in manual mode by discard only', () => {
    const score = scoreManual(selection(), situation({ flowerWin: FlowerWin.SevenRobOne, winMethod: WinMethod.SelfDraw }))
    expect(breakdown(score.lines)).toEqual({ [Tai.QiQiangYi]: 8 })
  })
})
