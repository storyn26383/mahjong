import { decompose, SetKind, type Decomposition } from './decompose'
import { HAND_SIZE, handSize, MeldKind, type Hand, type Meld } from './hand'
import { DRAGON_TILES, isHonour, isSuited, PLANT_FLOWERS, SEASON_FLOWERS, suitOf, WIND_TILES, type Tile } from './tile'
import { analyseWaits, WaitKind } from './waits'

export enum Wind {
  East = 1,
  South = 2,
  West = 3,
  North = 4,
}

export enum WinMethod {
  SelfDraw = 'self-draw',
  Discard = 'discard',
}

export enum LastTile {
  None = 'none',
  /** 海底撈月：自摸最後一張 */
  Sea = 'sea',
  /** 河底撈魚：最後一張打出被胡 */
  River = 'river',
}

export enum Blessing {
  None = 'none',
  Heaven = 'heaven',
  Earth = 'earth',
  Human = 'human',
}

export enum ReadyDeclaration {
  None = 'none',
  Heaven = 'heaven',
  Earth = 'earth',
  Migi = 'migi',
}

export enum FlowerWin {
  None = 'none',
  SevenRobOne = 'seven-rob-one',
  EightImmortals = 'eight-immortals',
}

export interface Situation {
  winningTile: Tile
  winMethod: WinMethod
  roundWind: Wind
  seatWind: Wind
  isDealer: boolean
  /** 連莊次數 n，每連 +2 */
  dealerStreak: number
  lastTile: LastTile
  /** 槓上開花 */
  isKongReplacement: boolean
  /** 搶槓 */
  isRobbingKong: boolean
  blessing: Blessing
  readyDeclaration: ReadyDeclaration
  flowerWin: FlowerWin
}

/** 台種，名稱跟 shifu.tw，直接用作顯示。 */
export enum Tai {
  ZiMo = '自摸',
  MenQing = '門清',
  BuQiuRen = '不求人',
  QuanQiuRen = '全求人',
  BanQiuRen = '半求人',
  BianZhang = '邊張',
  QianZhang = '嵌張',
  DanDiao = '單吊',
  ZhengHua = '正花',
  HuaGang = '花槓',
  SanYuanKe = '三元刻',
  XiaoSanYuan = '小三元',
  DaSanYuan = '大三元',
  MenFengKe = '門風刻',
  QuanFengKe = '圈風刻',
  XiaoSiXi = '小四喜',
  DaSiXi = '大四喜',
  HunYiSe = '混一色',
  QingYiSe = '清一色',
  ZiYiSe = '字一色',
  SanAnKe = '三暗刻',
  SiAnKe = '四暗刻',
  WuAnKe = '五暗刻',
  PingHu = '平胡',
  PengPengHu = '碰碰胡',
  ZhuangJia = '莊家',
  LianZhuang = '連莊',
  HaiDiLaoYue = '海底撈月',
  HeDiLaoYu = '河底撈魚',
  GangShangKaiHua = '槓上開花',
  QiangGang = '搶槓',
  TianHu = '天胡',
  DiHu = '地胡',
  RenHu = '人胡',
  TianTing = '天聽',
  DiTing = '地聽',
  MiJi = '咪幾',
  QiQiangYi = '七搶一',
  BaXianGuoHai = '八仙過海',
}

export const TAI_VALUES: Record<Tai, number> = {
  [Tai.ZiMo]: 1,
  [Tai.MenQing]: 1,
  [Tai.BuQiuRen]: 1,
  [Tai.QuanQiuRen]: 2,
  [Tai.BanQiuRen]: 1,
  [Tai.BianZhang]: 1,
  [Tai.QianZhang]: 1,
  [Tai.DanDiao]: 1,
  [Tai.ZhengHua]: 1,
  [Tai.HuaGang]: 2,
  [Tai.SanYuanKe]: 1,
  [Tai.XiaoSanYuan]: 4,
  [Tai.DaSanYuan]: 8,
  [Tai.MenFengKe]: 1,
  [Tai.QuanFengKe]: 1,
  [Tai.XiaoSiXi]: 8,
  [Tai.DaSiXi]: 16,
  [Tai.HunYiSe]: 4,
  [Tai.QingYiSe]: 8,
  [Tai.ZiYiSe]: 16,
  [Tai.SanAnKe]: 2,
  [Tai.SiAnKe]: 5,
  [Tai.WuAnKe]: 8,
  [Tai.PingHu]: 2,
  [Tai.PengPengHu]: 4,
  [Tai.ZhuangJia]: 1,
  [Tai.LianZhuang]: 2,
  [Tai.HaiDiLaoYue]: 1,
  [Tai.HeDiLaoYu]: 1,
  [Tai.GangShangKaiHua]: 1,
  [Tai.QiangGang]: 1,
  [Tai.TianHu]: 24,
  [Tai.DiHu]: 16,
  [Tai.RenHu]: 16,
  [Tai.TianTing]: 8,
  [Tai.DiTing]: 4,
  [Tai.MiJi]: 8,
  [Tai.QiQiangYi]: 8,
  [Tai.BaXianGuoHai]: 8,
}

export interface ScoreLine {
  name: Tai
  tai: number
}

export interface Score {
  lines: ScoreLine[]
  total: number
}

const LONE_WAIT_TAI: Partial<Record<WaitKind, Tai>> = {
  [WaitKind.Edge]: Tai.BianZhang,
  [WaitKind.Closed]: Tai.QianZhang,
  [WaitKind.Single]: Tai.DanDiao,
}
const CONCEALED_PUNG_TAI: Partial<Record<number, Tai>> = {
  3: Tai.SanAnKe,
  4: Tai.SiAnKe,
  5: Tai.WuAnKe,
}
const LAST_TILE_TAI: Partial<Record<LastTile, Tai>> = {
  [LastTile.Sea]: Tai.HaiDiLaoYue,
  [LastTile.River]: Tai.HeDiLaoYu,
}
const BLESSING_TAI: Partial<Record<Blessing, Tai>> = {
  [Blessing.Heaven]: Tai.TianHu,
  [Blessing.Earth]: Tai.DiHu,
  [Blessing.Human]: Tai.RenHu,
}
const READY_DECLARATION_TAI: Partial<Record<ReadyDeclaration, Tai>> = {
  [ReadyDeclaration.Heaven]: Tai.TianTing,
  [ReadyDeclaration.Earth]: Tai.DiTing,
  [ReadyDeclaration.Migi]: Tai.MiJi,
}
const FLOWER_WIN_TAI: Partial<Record<FlowerWin, Tai>> = {
  [FlowerWin.SevenRobOne]: Tai.QiQiangYi,
  [FlowerWin.EightImmortals]: Tai.BaXianGuoHai,
}
/** 天胡、地胡唔計門清一摸三；人胡唔計門清。 */
const EXCLUDED_BY_BLESSING: Record<Blessing, Tai[]> = {
  [Blessing.None]: [],
  [Blessing.Heaven]: [Tai.MenQing, Tai.BuQiuRen, Tai.ZiMo],
  [Blessing.Earth]: [Tai.MenQing, Tai.BuQiuRen, Tai.ZiMo],
  [Blessing.Human]: [Tai.MenQing],
}
/** 局面本身決定咗胡法：槓上開花同八仙過海必然自摸，七搶一只可以放槍。 */
const FORCED_WIN_METHOD: Partial<Record<FlowerWin, WinMethod>> = {
  [FlowerWin.EightImmortals]: WinMethod.SelfDraw,
  [FlowerWin.SevenRobOne]: WinMethod.Discard,
}

const LAST_TILE_IN_HAND = 1
const DRAGONS_FOR_BIG = 3
const DRAGONS_FOR_SMALL = 2
const WINDS_FOR_BIG = 4
const WINDS_FOR_SMALL = 3

export const effectiveWinMethod = (situation: Situation): WinMethod => {
  if (situation.isKongReplacement) return WinMethod.SelfDraw
  return FORCED_WIN_METHOD[situation.flowerWin] ?? situation.winMethod
}

/** 統一睇法：拆法入面嘅面子 + 副露，每組標明係咪暗嘅。 */
interface HandSet {
  kind: SetKind
  tile: Tile
  isConcealed: boolean
}

interface Context {
  hand: Hand
  situation: Situation
  winMethod: WinMethod
  decomposition: Decomposition
  sets: HandSet[]
  loneWaitKind: WaitKind | undefined
}

const MELD_SET_KIND: Record<MeldKind, SetKind> = {
  [MeldKind.Chow]: SetKind.Chow,
  [MeldKind.Pung]: SetKind.Pung,
  [MeldKind.OpenKong]: SetKind.Pung,
  [MeldKind.ConcealedKong]: SetKind.Pung,
}

const meldToSet = (meld: Meld): HandSet =>
  ({ kind: MELD_SET_KIND[meld.kind], tile: meld.tiles[0]!, isConcealed: meld.kind === MeldKind.ConcealedKong })

/** 放槍完成嘅刻子當明刻。 */
const decompositionSets = (decomposition: Decomposition, winningTile: Tile, winMethod: WinMethod): HandSet[] =>
  decomposition.sets.map((set) => {
    const completedByDiscard = set.kind === SetKind.Pung && set.tiles[0] === winningTile && winMethod === WinMethod.Discard
    return { kind: set.kind, tile: set.tiles[0]!, isConcealed: !completedByDiscard }
  })

export const line = (name: Tai): ScoreLine => ({ name, tai: TAI_VALUES[name] })
export const lines = (name: Tai, count: number): ScoreLine[] => Array.from({ length: count }, () => line(name))
export const lineIf = (condition: boolean, name: Tai): ScoreLine[] => (condition ? [line(name)] : [])
const optionalLine = (name: Tai | undefined): ScoreLine[] => (name ? [line(name)] : [])
const isSelfDraw = ({ winMethod }: Context) => winMethod === WinMethod.SelfDraw
const isMenQing = ({ hand }: Context) => hand.melds.every(meld => meld.kind === MeldKind.ConcealedKong)
const isAllMelded = ({ hand }: Context) => hand.concealed.length === LAST_TILE_IN_HAND
const pungs = ({ sets }: Context) => sets.filter(set => set.kind === SetKind.Pung)
const pungsOf = (context: Context, tiles: Tile[]) => pungs(context).filter(set => tiles.includes(set.tile))
const hasPungOf = (context: Context, tile: Tile) => pungsOf(context, [tile]).length > 0
const allTiles = ({ hand, situation }: Context): Tile[] =>
  [...hand.concealed, situation.winningTile, ...hand.melds.flatMap(meld => meld.tiles)]
/** Wind 由 1 起數，牌表由 0 起數。 */
const windIndex = (wind: Wind): number => wind - Wind.East
const windTile = (wind: Wind): Tile => WIND_TILES[windIndex(wind)]!

const selfDrawLines = (context: Context): ScoreLine[] => lineIf(isSelfDraw(context), Tai.ZiMo)

const menQingLines = (context: Context): ScoreLine[] => [
  ...lineIf(isMenQing(context), Tai.MenQing),
  ...lineIf(isMenQing(context) && isSelfDraw(context), Tai.BuQiuRen),
]

const allMeldedLines = (context: Context): ScoreLine[] =>
  lineIf(isAllMelded(context), isSelfDraw(context) ? Tai.BanQiuRen : Tai.QuanQiuRen)

const loneWaitLines = ({ loneWaitKind }: Context): ScoreLine[] =>
  optionalLine(loneWaitKind && LONE_WAIT_TAI[loneWaitKind])

const pingHuLines = (context: Context): ScoreLine[] => {
  const isPingHu
    = !isSelfDraw(context)
      && context.loneWaitKind === undefined
      && context.hand.flowers.length === 0
      && pungs(context).length === 0
      && !allTiles(context).some(isHonour)
  return lineIf(isPingHu, Tai.PingHu)
}

const pengPengHuLines = (context: Context): ScoreLine[] =>
  lineIf(pungs(context).length === context.sets.length, Tai.PengPengHu)

const oneColourLines = (context: Context): ScoreLine[] => {
  const tiles = allTiles(context)
  const suits = new Set(tiles.filter(isSuited).map(suitOf))
  if (suits.size === 0) return [line(Tai.ZiYiSe)]
  if (suits.size > 1) return []
  return [line(tiles.some(isHonour) ? Tai.HunYiSe : Tai.QingYiSe)]
}

const concealedPungLines = (context: Context): ScoreLine[] =>
  optionalLine(CONCEALED_PUNG_TAI[pungs(context).filter(set => set.isConcealed).length])

const dragonLines = (context: Context): ScoreLine[] => {
  const dragonPungs = pungsOf(context, DRAGON_TILES).length
  const pairIsDragon = DRAGON_TILES.includes(context.decomposition.pair)
  if (dragonPungs === DRAGONS_FOR_BIG) return [line(Tai.DaSanYuan)]
  if (dragonPungs === DRAGONS_FOR_SMALL && pairIsDragon) return [line(Tai.XiaoSanYuan)]
  return lines(Tai.SanYuanKe, dragonPungs)
}

const windLines = (context: Context): ScoreLine[] => {
  const windPungs = pungsOf(context, WIND_TILES).length
  if (windPungs === WINDS_FOR_BIG) return [line(Tai.DaSiXi)]
  const pairIsWind = WIND_TILES.includes(context.decomposition.pair)
  return [
    ...lineIf(windPungs === WINDS_FOR_SMALL && pairIsWind, Tai.XiaoSiXi),
    ...lineIf(hasPungOf(context, windTile(context.situation.seatWind)), Tai.MenFengKe),
    ...lineIf(hasPungOf(context, windTile(context.situation.roundWind)), Tai.QuanFengKe),
  ]
}

const flowerLines = ({ hand, situation }: Context): ScoreLine[] => {
  const has = (tile: Tile) => hand.flowers.includes(tile)
  const seatFlowers = [PLANT_FLOWERS[windIndex(situation.seatWind)]!, SEASON_FLOWERS[windIndex(situation.seatWind)]!]
  return [
    ...lineIf(PLANT_FLOWERS.every(has), Tai.HuaGang),
    ...lineIf(SEASON_FLOWERS.every(has), Tai.HuaGang),
    ...lines(Tai.ZhengHua, seatFlowers.filter(has).length),
  ]
}

const dealerLines = (situation: Situation): ScoreLine[] => {
  if (!situation.isDealer) return []
  const streak = situation.dealerStreak > 0
    ? [{ name: Tai.LianZhuang, tai: TAI_VALUES[Tai.LianZhuang] * situation.dealerStreak }]
    : []
  return [line(Tai.ZhuangJia), ...streak]
}

/** 牌面睇唔到、靠人手講嘅台。 */
export const situationalLines = (situation: Situation): ScoreLine[] => [
  ...dealerLines(situation),
  ...optionalLine(LAST_TILE_TAI[situation.lastTile]),
  ...lineIf(situation.isKongReplacement, Tai.GangShangKaiHua),
  ...lineIf(situation.isRobbingKong, Tai.QiangGang),
  ...optionalLine(BLESSING_TAI[situation.blessing]),
  ...optionalLine(READY_DECLARATION_TAI[situation.readyDeclaration]),
]

const HAND_DETECTORS = [
  selfDrawLines,
  menQingLines,
  allMeldedLines,
  loneWaitLines,
  pingHuLines,
  pengPengHuLines,
  oneColourLines,
  concealedPungLines,
  dragonLines,
  windLines,
  flowerLines,
]

export const toScore = (scored: ScoreLine[]): Score => ({ lines: scored, total: scored.reduce((sum, each) => sum + each.tai, 0) })

/** 套用天地人胡嘅排除規則後合計。 */
export const finaliseScore = (scored: ScoreLine[], situation: Situation): Score => {
  const excluded = EXCLUDED_BY_BLESSING[situation.blessing]
  return toScore(scored.filter(each => !excluded.includes(each.name)))
}

const scoreDecomposition = (context: Context): Score =>
  finaliseScore([...HAND_DETECTORS.flatMap(detect => detect(context)), ...situationalLines(context.situation)], context.situation)

/** 七搶一、八仙過海唔使成胡型，唔加其他花台，其他局面台照疊；八仙過海算自摸。 */
const scoreFlowerWin = (situation: Situation): Score => toScore([
  line(FLOWER_WIN_TAI[situation.flowerWin]!),
  ...lineIf(effectiveWinMethod(situation) === WinMethod.SelfDraw, Tai.ZiMo),
  ...situationalLines(situation),
])

/** 計台；唔胡回傳 null。多種拆法取台數最高嗰種。 */
export const scoreHand = (hand: Hand, situation: Situation): Score | null => {
  if (situation.flowerWin !== FlowerWin.None) return scoreFlowerWin(situation)
  if (handSize(hand) !== HAND_SIZE) return null
  const decompositions = decompose([...hand.concealed, situation.winningTile])
  if (decompositions.length === 0) return null
  const winMethod = effectiveWinMethod(situation)
  const loneWaitKind = analyseWaits(hand).find(wait => wait.tile === situation.winningTile)?.kind
  const isLone = loneWaitKind !== undefined && loneWaitKind !== WaitKind.Multiple
  return decompositions
    .map(decomposition => scoreDecomposition({
      hand,
      situation,
      winMethod,
      decomposition,
      sets: [...decompositionSets(decomposition, situation.winningTile, winMethod), ...hand.melds.map(meldToSet)],
      loneWaitKind: isLone ? loneWaitKind : undefined,
    }))
    .reduce((best, score) => (score.total > best.total ? score : best))
}
