import { isChow, MeldKind, TILES_PER_KONG, TILES_PER_PUNG, type Hand, type Meld } from './hand'
import { isFlower, sortTiles, type Tile } from './tile'

/**
 * 模型輸出類別嘅次序，跟 ml/dataset.yaml 嘅 names（Jon Chan Mahjong 資料集）。
 * B 條、C 萬、D 筒、F 花（梅蘭菊竹）、S 季（春夏秋冬）、W 風、D 三元。
 */
const DATASET_CLASSES = ['1B', '1C', '1D', '1F', '1S', '2B', '2C', '2D', '2F', '2S', '3B', '3C', '3D', '3F', '3S', '4B', '4C', '4D', '4F', '4S', '5B', '5C', '5D', '6B', '6C', '6D', '7B', '7C', '7D', '8B', '8C', '8D', '9B', '9C', '9D', 'EW', 'GD', 'NW', 'RD', 'SW', 'WD', 'WW'] as const

const HONOUR_CLASSES: Record<string, Tile> = { EW: 'z1', SW: 'z2', WW: 'z3', NW: 'z4', RD: 'z5', GD: 'z6', WD: 'z7' }
const SUIT_FOR_CLASS: Record<string, string> = { B: 's', C: 'm', D: 'p' }
const SEASON_OFFSET = 4

const tileForClass = (name: string): Tile => {
  if (HONOUR_CLASSES[name]) return HONOUR_CLASSES[name]
  const rank = Number(name[0])
  const kind = name[1]!
  if (kind === 'F') return `f${rank}`
  if (kind === 'S') return `f${rank + SEASON_OFFSET}`
  return `${SUIT_FOR_CLASS[kind]}${rank}` as Tile
}

export const TILE_FOR_CLASS: Tile[] = DATASET_CLASSES.map(tileForClass)

export interface Box {
  x: number
  y: number
  width: number
  height: number
}

export interface Point {
  x: number
  y: number
}

export interface Detection {
  tile: Tile
  box: Box
  confidence: number
}

/** 信心低過呢個數，確認畫面會標色提示用戶檢查。 */
export const LOW_CONFIDENCE = 0.6

/** 副露喺上面嗰行（離鏡頭遠）定下面嗰行。 */
export enum MeldRow {
  Top = 'top',
  Bottom = 'bottom',
}

export interface PhotoReading {
  hand: Hand
  /** 副露行入面湊唔成吃碰槓嘅組，已經撥入手牌，要用戶留意。 */
  unmatched: Tile[][]
}

/** 兩行中心之間嘅距離要超過牌高嘅幾多倍先當係兩行。 */
const ROW_GAP_RATIO = 0.6
/** 副露行入面，牌之間嘅空隙超過牌闊嘅幾多倍就當係另一組。 */
const GROUP_GAP_RATIO = 0.3

const median = (values: number[]): number => {
  const sorted = [...values].sort((first, second) => first - second)
  return sorted[Math.floor(sorted.length / 2)] ?? 0
}
const centreY = (detection: Detection): number => detection.box.y + detection.box.height / 2
const byX = (first: Detection, second: Detection): number => first.box.x - second.box.x

/** 按高低分做一行或者兩行；返回 [上行, 下行]，一行時下行係空。 */
const splitRows = (detections: Detection[]): [Detection[], Detection[]] => {
  const sorted = [...detections].sort((first, second) => centreY(first) - centreY(second))
  const threshold = ROW_GAP_RATIO * median(sorted.map(detection => detection.box.height))
  const widest = sorted.slice(1)
    .map((detection, index) => ({ splitAt: index + 1, gap: centreY(detection) - centreY(sorted[index]!) }))
    .reduce((best, candidate) => (candidate.gap > best.gap ? candidate : best), { splitAt: -1, gap: threshold })
  if (widest.splitAt < 0) return [sorted, []]
  return [sorted.slice(0, widest.splitAt), sorted.slice(widest.splitAt)]
}

/** 由左至右，空隙大過門檻就開新一組。 */
const splitGroups = (row: Detection[]): Tile[][] => {
  const sorted = [...row].sort(byX)
  const threshold = GROUP_GAP_RATIO * median(sorted.map(detection => detection.box.width))
  return sorted.reduce<Tile[][]>((groups, detection, index) => {
    const previous = sorted[index - 1]
    const isNewGroup = !previous || detection.box.x - (previous.box.x + previous.box.width) > threshold
    return isNewGroup
      ? [...groups, [detection.tile]]
      : [...groups.slice(0, -1), [...groups[groups.length - 1]!, detection.tile]]
  }, [])
}

/** 由左至右拆組時，先試槓再試碰同吃。 */
const MELD_LENGTHS = [TILES_PER_KONG, TILES_PER_PUNG]

const meldKindOf = (tiles: Tile[]): MeldKind | undefined => {
  const isAllSame = tiles.every(tile => tile === tiles[0])
  if (isAllSame && tiles.length === TILES_PER_KONG) return MeldKind.OpenKong
  if (isAllSame && tiles.length === TILES_PER_PUNG) return MeldKind.Pung
  if (isChow(tiles)) return MeldKind.Chow
  return undefined
}

const toMeld = (tiles: Tile[]): Meld => {
  const kind = meldKindOf(tiles)!
  return { kind, tiles: kind === MeldKind.Chow ? sortTiles(tiles) : tiles }
}

/**
 * 由左至右拆出槓、碰、吃；拆唔到嘅牌留低。
 * 咁就算兩組貼埋冇空隙，或者有認錯嘅牌夾喺中間，其餘嘅組都拆得出。
 */
const parseMelds = (tiles: Tile[]): { melds: Meld[], leftover: Tile[] } => {
  if (tiles.length === 0) return { melds: [], leftover: [] }
  const head = MELD_LENGTHS.map(length => tiles.slice(0, length)).find(candidate => meldKindOf(candidate) !== undefined)
  if (!head) {
    const rest = parseMelds(tiles.slice(1))
    return { melds: rest.melds, leftover: [tiles[0]!, ...rest.leftover] }
  }
  const rest = parseMelds(tiles.slice(head.length))
  return { melds: [toMeld(head), ...rest.melds], leftover: rest.leftover }
}

/** 將模型認到嘅牌按位置分做手牌、副露同花牌。 */
export const readPhoto = (detections: Detection[], meldRow: MeldRow): PhotoReading => {
  const flowers = sortTiles(detections.filter(detection => isFlower(detection.tile)).map(detection => detection.tile))
  const [top, bottom] = splitRows(detections.filter(detection => !isFlower(detection.tile)))
  const hasTwoRows = bottom.length > 0
  const meldDetections = hasTwoRows ? (meldRow === MeldRow.Top ? top : bottom) : []
  const concealedDetections = hasTwoRows ? (meldRow === MeldRow.Top ? bottom : top) : top

  const parsed = splitGroups(meldDetections).map(parseMelds)
  const melds = parsed.flatMap(group => group.melds)
  const unmatched = parsed.map(group => group.leftover).filter(leftover => leftover.length > 0)
  const concealed = [...concealedDetections].sort(byX).map(detection => detection.tile)
  return { hand: { concealed: [...concealed, ...unmatched.flat()], melds, flowers }, unmatched }
}

/** 裁剪框可以拖嘅位置：成個框、四條邊、四隻角。 */
export enum CropHandle {
  Move = 'move',
  Top = 'top',
  Right = 'right',
  Bottom = 'bottom',
  Left = 'left',
  TopLeft = 'top-left',
  TopRight = 'top-right',
  BottomRight = 'bottom-right',
  BottomLeft = 'bottom-left',
}

/** 每個位置拖動時郁邊幾條邊。 */
const MOVING_EDGES: Record<CropHandle, { left: boolean, top: boolean, right: boolean, bottom: boolean }> = {
  [CropHandle.Move]: { left: true, top: true, right: true, bottom: true },
  [CropHandle.Top]: { left: false, top: true, right: false, bottom: false },
  [CropHandle.Right]: { left: false, top: false, right: true, bottom: false },
  [CropHandle.Bottom]: { left: false, top: false, right: false, bottom: true },
  [CropHandle.Left]: { left: true, top: false, right: false, bottom: false },
  [CropHandle.TopLeft]: { left: true, top: true, right: false, bottom: false },
  [CropHandle.TopRight]: { left: false, top: true, right: true, bottom: false },
  [CropHandle.BottomRight]: { left: false, top: false, right: true, bottom: true },
  [CropHandle.BottomLeft]: { left: true, top: false, right: false, bottom: true },
}

/** 成張照片，座標以照片闊高為 1。 */
export const FULL_CROP: Box = { x: 0, y: 0, width: 1, height: 1 }
/** 裁剪框邊長最少佔照片幾多。 */
export const MIN_CROP = 0.1

const clampBetween = (value: number, low: number, high: number): number => Math.min(high, Math.max(low, value))

/** 拖動 handle 移動 (dx, dy) 之後嘅裁剪框；唔會出界，亦唔會細過 MIN_CROP。 */
export const adjustCrop = (crop: Box, handle: CropHandle, dx: number, dy: number): Box => {
  if (handle === CropHandle.Move) {
    return { ...crop, x: clampBetween(crop.x + dx, 0, 1 - crop.width), y: clampBetween(crop.y + dy, 0, 1 - crop.height) }
  }
  const moving = MOVING_EDGES[handle]
  const right = crop.x + crop.width
  const bottom = crop.y + crop.height
  const left = moving.left ? clampBetween(crop.x + dx, 0, right - MIN_CROP) : crop.x
  const top = moving.top ? clampBetween(crop.y + dy, 0, bottom - MIN_CROP) : crop.y
  const newRight = moving.right ? clampBetween(right + dx, left + MIN_CROP, 1) : right
  const newBottom = moving.bottom ? clampBetween(bottom + dy, top + MIN_CROP, 1) : bottom
  return { x: left, y: top, width: newRight - left, height: newBottom - top }
}
