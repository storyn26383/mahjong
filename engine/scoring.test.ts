import { describe, expect, test } from 'bun:test'
import { MeldKind, type Hand, type Meld } from './hand'
import { Blessing, effectiveWinMethod, FlowerWin, LastTile, ReadyDeclaration, scoreHand, Tai, Wind, WinMethod, type Score, type Situation } from './scoring'
import type { Tile } from './tile'

const tiles = (spec: string): Tile[] => spec.split(' ') as Tile[]
const hand = (concealed: string, melds: Meld[] = [], flowers = ''): Hand =>
  ({ concealed: tiles(concealed), melds, flowers: flowers ? tiles(flowers) : [] })
const chow = (spec: string): Meld => ({ kind: MeldKind.Chow, tiles: tiles(spec) })
const pung = (spec: string): Meld => ({ kind: MeldKind.Pung, tiles: tiles(spec) })
const openKong = (spec: string): Meld => ({ kind: MeldKind.OpenKong, tiles: tiles(spec) })
const concealedKong = (spec: string): Meld => ({ kind: MeldKind.ConcealedKong, tiles: tiles(spec) })

const discard = (winningTile: Tile, overrides: Partial<Situation> = {}): Situation => ({
  winningTile,
  winMethod: WinMethod.Discard,
  roundWind: Wind.East,
  seatWind: Wind.South,
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
const selfDraw = (winningTile: Tile, overrides: Partial<Situation> = {}): Situation =>
  discard(winningTile, { winMethod: WinMethod.SelfDraw, ...overrides })

/** 台種 → 合計台數，方便唔理次序咁比較。 */
const breakdown = (score: Score | null): Record<string, number> => {
  if (!score) throw new Error('expected a winning hand')
  const result: Record<string, number> = {}
  for (const line of score.lines) result[line.name] = (result[line.name] ?? 0) + line.tai
  return result
}

const FOUR_CHOWS_AND_EAST_PAIR = 'm2 m3 m4 m5 m6 p1 p2 p3 p4 p5 p6 p7 p8 p9 z1 z1'

describe('scoreHand: win check', () => {
  test('a hand that cannot form 5 sets and a pair is not a win', () => {
    expect(scoreHand(hand('m1 m5 m9 p1 p5 p9 s1 s5 s9 z1 z2 z3 z4 z5 z6 z7'), discard('m1'))).toBeNull()
  })

  test('a hand that is not 16 tiles is not a win', () => {
    expect(scoreHand(hand('m1 m2'), discard('m3'))).toBeNull()
  })
})

describe('scoreHand: 門前 and 自摸', () => {
  test('winning by discard with no open melds is 門清 only', () => {
    expect(breakdown(scoreHand(hand(FOUR_CHOWS_AND_EAST_PAIR), discard('m7')))).toEqual({ [Tai.MenQing]: 1 })
  })

  test('winning by self-draw with no open melds is 門清一摸三', () => {
    expect(breakdown(scoreHand(hand(FOUR_CHOWS_AND_EAST_PAIR), selfDraw('m7'))))
      .toEqual({ [Tai.MenQing]: 1, [Tai.BuQiuRen]: 1, [Tai.ZiMo]: 1 })
  })

  test('a concealed kong does not break 門清', () => {
    const h = hand('m2 m3 m4 m5 m6 p1 p2 p3 p4 p5 p6 z1 z1', [concealedKong('z3 z3 z3 z3')])
    expect(breakdown(scoreHand(h, discard('m7')))).toEqual({ [Tai.MenQing]: 1 })
  })

  test('an open meld breaks 門清', () => {
    const h = hand('m2 m3 m4 m5 m6 p1 p2 p3 p4 p5 p6 z1 z1', [chow('s1 s2 s3')])
    expect(breakdown(scoreHand(h, discard('m7')))).toEqual({})
  })

  test('全求人: everything melded, one tile in hand, win by discard, stacks with 單吊', () => {
    const h = hand('m1', [chow('p1 p2 p3'), chow('p4 p5 p6'), chow('p7 p8 p9'), chow('s1 s2 s3'), pung('z3 z3 z3')])
    expect(breakdown(scoreHand(h, discard('m1')))).toEqual({ [Tai.QuanQiuRen]: 2, [Tai.DanDiao]: 1 })
  })

  test('半求人: everything melded, one tile in hand, self-draw, stacks with 自摸 and 單吊', () => {
    const h = hand('m1', [chow('p1 p2 p3'), chow('p4 p5 p6'), chow('p7 p8 p9'), chow('s1 s2 s3'), openKong('z3 z3 z3 z3')])
    expect(breakdown(scoreHand(h, selfDraw('m1')))).toEqual({ [Tai.BanQiuRen]: 1, [Tai.ZiMo]: 1, [Tai.DanDiao]: 1 })
  })
})

describe('scoreHand: 獨聽', () => {
  const FOUR_SETS_AND_PAIR = 'p1 p2 p3 p4 p5 p6 p7 p8 p9 s1 s2 s3 z1 z1'

  test('邊張', () => {
    expect(breakdown(scoreHand(hand(`m1 m2 ${FOUR_SETS_AND_PAIR}`), discard('m3'))))
      .toEqual({ [Tai.MenQing]: 1, [Tai.BianZhang]: 1 })
  })

  test('嵌張', () => {
    expect(breakdown(scoreHand(hand(`m1 m3 ${FOUR_SETS_AND_PAIR}`), discard('m2'))))
      .toEqual({ [Tai.MenQing]: 1, [Tai.QianZhang]: 1 })
  })

  test('a two-sided wait earns no 獨聽', () => {
    expect(breakdown(scoreHand(hand(`m2 m3 ${FOUR_SETS_AND_PAIR}`), discard('m4'))))
      .toEqual({ [Tai.MenQing]: 1 })
  })
})

describe('scoreHand: 牌型', () => {
  const ALL_CHOWS_SUITED_PAIR = 'm2 m3 m4 m5 m6 p1 p2 p3 p4 p5 p6 p7 p8 p9 s5 s5'

  test('平胡 needs no honours, no flowers, no pungs, not a lone wait, not self-drawn; stacks with 門清', () => {
    expect(breakdown(scoreHand(hand(ALL_CHOWS_SUITED_PAIR), discard('m7'))))
      .toEqual({ [Tai.MenQing]: 1, [Tai.PingHu]: 2 })
  })

  test('平胡 is lost on self-draw', () => {
    expect(breakdown(scoreHand(hand(ALL_CHOWS_SUITED_PAIR), selfDraw('m7'))))
      .toEqual({ [Tai.MenQing]: 1, [Tai.BuQiuRen]: 1, [Tai.ZiMo]: 1 })
  })

  test('平胡 is lost when holding a flower; a seat flower scores 正花', () => {
    expect(breakdown(scoreHand(hand(ALL_CHOWS_SUITED_PAIR, [], 'f2'), discard('m7'))))
      .toEqual({ [Tai.MenQing]: 1, [Tai.ZhengHua]: 1 })
  })

  test('碰碰胡 by discard: the pung completed by the discard is not concealed', () => {
    expect(breakdown(scoreHand(hand('m1 m1 m1 p2 p2 p2 s3 s3 s3 z5 z5 z5 z1 z1 s9 s9'), discard('s9'))))
      .toEqual({ [Tai.MenQing]: 1, [Tai.PengPengHu]: 4, [Tai.SanYuanKe]: 1, [Tai.SiAnKe]: 5 })
  })

  test('碰碰胡 by self-draw: all five pungs are concealed', () => {
    expect(breakdown(scoreHand(hand('m1 m1 m1 p2 p2 p2 s3 s3 s3 z5 z5 z5 z1 z1 s9 s9'), selfDraw('s9'))))
      .toEqual({ [Tai.MenQing]: 1, [Tai.BuQiuRen]: 1, [Tai.ZiMo]: 1, [Tai.PengPengHu]: 4, [Tai.SanYuanKe]: 1, [Tai.WuAnKe]: 8 })
  })

  test('三暗刻 counts concealed pungs only; an open pung of the seat wind is 門風刻', () => {
    const h = hand('m1 m1 m1 p2 p2 p2 s3 s3 s3 s5 s6 z1 z1', [pung('z2 z2 z2')])
    expect(breakdown(scoreHand(h, discard('s4')))).toEqual({ [Tai.SanAnKe]: 2, [Tai.MenFengKe]: 1 })
  })

  test('an open pung of the round wind is 圈風刻', () => {
    const h = hand('m2 m3 m4 m5 m6 p1 p2 p3 p4 p5 p6 s5 s5', [pung('z1 z1 z1')])
    expect(breakdown(scoreHand(h, discard('m7')))).toEqual({ [Tai.QuanFengKe]: 1 })
  })
})

describe('scoreHand: 一色', () => {
  test('混一色: one suit plus honours', () => {
    expect(breakdown(scoreHand(hand('m1 m2 m3 m4 m5 m6 m7 m8 m9 m1 m1 m1 z5 z5 z5 z6'), discard('z6'))))
      .toEqual({ [Tai.MenQing]: 1, [Tai.HunYiSe]: 4, [Tai.SanYuanKe]: 1, [Tai.DanDiao]: 1 })
  })

  test('清一色: one suit only', () => {
    const h = hand('m1 m1 m1 m7 m8 m5 m5', [chow('m1 m2 m3'), pung('m9 m9 m9'), chow('m4 m5 m6')])
    expect(breakdown(scoreHand(h, discard('m9')))).toEqual({ [Tai.QingYiSe]: 8 })
  })

  test('字一色 stacks with 碰碰胡, 小三元, wind pungs and 單吊', () => {
    const h = hand('z5 z5 z5 z6 z6 z6 z7', [pung('z1 z1 z1'), pung('z2 z2 z2'), pung('z3 z3 z3')])
    expect(breakdown(scoreHand(h, discard('z7')))).toEqual({
      [Tai.ZiYiSe]: 16, [Tai.PengPengHu]: 4, [Tai.XiaoSanYuan]: 4, [Tai.MenFengKe]: 1, [Tai.QuanFengKe]: 1, [Tai.DanDiao]: 1,
    })
  })
})

describe('scoreHand: 三元 and 四喜', () => {
  test('大三元 does not add 三元刻', () => {
    const h = hand('m2 m3 z1 z1', [pung('z5 z5 z5'), pung('z6 z6 z6'), pung('z7 z7 z7'), chow('p1 p2 p3')])
    expect(breakdown(scoreHand(h, discard('m4')))).toEqual({ [Tai.DaSanYuan]: 8 })
  })

  test('小四喜 still adds 門風刻 and 圈風刻', () => {
    const h = hand('z4 z4 p1 p2 p3 s5 s6', [pung('z1 z1 z1'), pung('z2 z2 z2'), pung('z3 z3 z3')])
    expect(breakdown(scoreHand(h, discard('s7')))).toEqual({ [Tai.XiaoSiXi]: 8, [Tai.MenFengKe]: 1, [Tai.QuanFengKe]: 1 })
  })

  test('大四喜 does not add 門風刻 or 圈風刻', () => {
    const h = hand('p1 p2 p3 s9', [pung('z1 z1 z1'), pung('z2 z2 z2'), pung('z3 z3 z3'), pung('z4 z4 z4')])
    expect(breakdown(scoreHand(h, discard('s9')))).toEqual({ [Tai.DaSiXi]: 16, [Tai.DanDiao]: 1 })
  })
})

describe('scoreHand: 花', () => {
  test('花槓 adds the seat flower inside the set; both seat flowers count', () => {
    expect(breakdown(scoreHand(hand(FOUR_CHOWS_AND_EAST_PAIR, [], 'f1 f2 f3 f4 f6'), discard('m7'))))
      .toEqual({ [Tai.MenQing]: 1, [Tai.HuaGang]: 2, [Tai.ZhengHua]: 2 })
  })
})

describe('scoreHand: 局面台種', () => {
  test('莊家 adds 1', () => {
    expect(breakdown(scoreHand(hand(FOUR_CHOWS_AND_EAST_PAIR), discard('m7', { isDealer: true }))))
      .toEqual({ [Tai.MenQing]: 1, [Tai.ZhuangJia]: 1 })
  })

  test('連莊 adds 2 per streak on top of 莊家 (2n + 1)', () => {
    expect(breakdown(scoreHand(hand(FOUR_CHOWS_AND_EAST_PAIR), discard('m7', { isDealer: true, dealerStreak: 2 }))))
      .toEqual({ [Tai.MenQing]: 1, [Tai.ZhuangJia]: 1, [Tai.LianZhuang]: 4 })
  })

  test('海底撈月', () => {
    expect(breakdown(scoreHand(hand(FOUR_CHOWS_AND_EAST_PAIR), selfDraw('m7', { lastTile: LastTile.Sea }))))
      .toEqual({ [Tai.MenQing]: 1, [Tai.BuQiuRen]: 1, [Tai.ZiMo]: 1, [Tai.HaiDiLaoYue]: 1 })
  })

  test('河底撈魚', () => {
    expect(breakdown(scoreHand(hand(FOUR_CHOWS_AND_EAST_PAIR), discard('m7', { lastTile: LastTile.River }))))
      .toEqual({ [Tai.MenQing]: 1, [Tai.HeDiLaoYu]: 1 })
  })

  test('槓上開花 stacks with 自摸', () => {
    expect(breakdown(scoreHand(hand(FOUR_CHOWS_AND_EAST_PAIR), selfDraw('m7', { isKongReplacement: true }))))
      .toEqual({ [Tai.MenQing]: 1, [Tai.BuQiuRen]: 1, [Tai.ZiMo]: 1, [Tai.GangShangKaiHua]: 1 })
  })

  test('搶槓', () => {
    expect(breakdown(scoreHand(hand(FOUR_CHOWS_AND_EAST_PAIR), discard('m7', { isRobbingKong: true }))))
      .toEqual({ [Tai.MenQing]: 1, [Tai.QiangGang]: 1 })
  })

  test('天胡 drops 門清一摸三 but keeps 莊家', () => {
    expect(breakdown(scoreHand(hand(FOUR_CHOWS_AND_EAST_PAIR), selfDraw('m7', { blessing: Blessing.Heaven, isDealer: true }))))
      .toEqual({ [Tai.TianHu]: 24, [Tai.ZhuangJia]: 1 })
  })

  test('地胡 drops 門清一摸三', () => {
    expect(breakdown(scoreHand(hand(FOUR_CHOWS_AND_EAST_PAIR), selfDraw('m7', { blessing: Blessing.Earth }))))
      .toEqual({ [Tai.DiHu]: 16 })
  })

  test('人胡 drops 門清', () => {
    expect(breakdown(scoreHand(hand(FOUR_CHOWS_AND_EAST_PAIR), discard('m7', { blessing: Blessing.Human }))))
      .toEqual({ [Tai.RenHu]: 16 })
  })

  test.each([
    [ReadyDeclaration.Heaven, Tai.TianTing, 8],
    [ReadyDeclaration.Earth, Tai.DiTing, 4],
    [ReadyDeclaration.Migi, Tai.MiJi, 8],
  ])('%s declaration stacks with everything else', (readyDeclaration, tai, value) => {
    expect(breakdown(scoreHand(hand(FOUR_CHOWS_AND_EAST_PAIR), selfDraw('m7', { readyDeclaration }))))
      .toEqual({ [Tai.MenQing]: 1, [Tai.BuQiuRen]: 1, [Tai.ZiMo]: 1, [tai]: value })
  })

  test('八仙過海 needs no winning shape, counts as 自摸, adds no other flower tai, keeps 莊家', () => {
    const h = hand('m1 m5 m9 p1 p5 p9 s1 s5 s9 z1 z2 z3 z4 z5 z6 z7', [], 'f1 f2 f3 f4 f5 f6 f7 f8')
    expect(breakdown(scoreHand(h, discard('m1', { flowerWin: FlowerWin.EightImmortals, isDealer: true }))))
      .toEqual({ [Tai.BaXianGuoHai]: 8, [Tai.ZiMo]: 1, [Tai.ZhuangJia]: 1 })
  })

  test('七搶一 needs no winning shape and adds no flower tai', () => {
    const h = hand('m1 m5 m9 p1 p5 p9 s1 s5 s9 z1 z2 z3 z4 z5 z6 z7', [], 'f1 f2 f3 f4 f5 f6 f7')
    expect(breakdown(scoreHand(h, discard('m1', { flowerWin: FlowerWin.SevenRobOne }))))
      .toEqual({ [Tai.QiQiangYi]: 8 })
  })
})

describe('scoreHand: win method implied by the situation', () => {
  test('槓上開花 is always a self-draw, even if 放槍 was left selected', () => {
    expect(breakdown(scoreHand(hand(FOUR_CHOWS_AND_EAST_PAIR), discard('m7', { isKongReplacement: true }))))
      .toEqual({ [Tai.MenQing]: 1, [Tai.BuQiuRen]: 1, [Tai.ZiMo]: 1, [Tai.GangShangKaiHua]: 1 })
    expect(effectiveWinMethod(discard('m7', { isKongReplacement: true }))).toBe(WinMethod.SelfDraw)
  })

  test('八仙過海 counts as a self-draw for money too', () => {
    expect(effectiveWinMethod(discard('m1', { flowerWin: FlowerWin.EightImmortals }))).toBe(WinMethod.SelfDraw)
  })

  test('七搶一 can only be won off a discard', () => {
    expect(effectiveWinMethod(selfDraw('m1', { flowerWin: FlowerWin.SevenRobOne }))).toBe(WinMethod.Discard)
  })

  test('a flower win still stacks the other situational tai', () => {
    const h = hand('m1 m5 m9 p1 p5 p9 s1 s5 s9 z1 z2 z3 z4 z5 z6 z7', [], 'f1 f2 f3 f4 f5 f6 f7 f8')
    expect(breakdown(scoreHand(h, discard('m1', { flowerWin: FlowerWin.EightImmortals, readyDeclaration: ReadyDeclaration.Heaven }))))
      .toEqual({ [Tai.BaXianGuoHai]: 8, [Tai.ZiMo]: 1, [Tai.TianTing]: 8 })
  })
})
