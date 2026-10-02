import { TILE_FOR_CLASS, type Box, type Detection } from './photo'

/** 模型輸入係正方形；原相縮放後置中，兩邊補邊。 */
export interface Letterbox {
  scale: number
  padX: number
  padY: number
}

const BOX_FIELDS = 4
const MIN_CONFIDENCE = 0.35
/** 重疊部份佔較細嗰個框超過呢個比例，就當係同一隻牌（包括窗口邊界切開嘅半隻）。 */
const MAX_OVERLAP = 0.5
/** 相鄰兩格最少重疊幾多。 */
const MIN_WINDOW_OVERLAP = 0.2

export const letterboxFor = (width: number, height: number, size: number): Letterbox => {
  const scale = Math.min(size / width, size / height)
  return { scale, padX: (size - width * scale) / 2, padY: (size - height * scale) / 2 }
}

const overlap = (first: Box, second: Box): number => {
  const width = Math.max(0, Math.min(first.x + first.width, second.x + second.width) - Math.max(first.x, second.x))
  const height = Math.max(0, Math.min(first.y + first.height, second.y + second.height) - Math.max(first.y, second.y))
  return (width * height) / Math.min(first.width * first.height, second.width * second.height)
}

/** 由信心最高開始，同已保留嘅框重疊太多就棄掉。 */
const suppressOverlaps = (detections: Detection[]): Detection[] =>
  [...detections]
    .sort((first, second) => second.confidence - first.confidence)
    .reduce<Detection[]>((kept, candidate) => (kept.some(other => overlap(other.box, candidate.box) > MAX_OVERLAP) ? kept : [...kept, candidate]), [])

const bestClass = (output: Float32Array, anchors: number, anchor: number): { classIndex: number, score: number } =>
  TILE_FOR_CLASS.reduce((best, _, classIndex) => {
    const score = output[(BOX_FIELDS + classIndex) * anchors + anchor]!
    return score > best.score ? { classIndex, score } : best
  }, { classIndex: -1, score: 0 })

/** 解讀 YOLO 輸出 [1, 4 + 類別數, anchor 數]：揀分數夠高嘅框、去重疊、還原到原相座標。 */
export const decodeYolo = (output: Float32Array, letterbox: Letterbox): Detection[] => {
  const anchors = output.length / (BOX_FIELDS + TILE_FOR_CLASS.length)
  const field = (index: number, anchor: number) => output[index * anchors + anchor]!
  const candidates = Array.from({ length: anchors }, (_, anchor) => ({ anchor, ...bestClass(output, anchors, anchor) }))
    .filter(candidate => candidate.score >= MIN_CONFIDENCE)
    .map(({ anchor, classIndex, score }): Detection => {
      const [centreX, centreY, width, height] = [0, 1, 2, 3].map(index => field(index, anchor)) as [number, number, number, number]
      return {
        tile: TILE_FOR_CLASS[classIndex]!,
        confidence: score,
        box: {
          x: (centreX - width / 2 - letterbox.padX) / letterbox.scale,
          y: (centreY - height / 2 - letterbox.padY) / letterbox.scale,
          width: width / letterbox.scale,
          height: height / letterbox.scale,
        },
      }
    })
  return suppressOverlaps(candidates)
}

/** 一隻牌喺 640 輸入入面大約幾闊認得最準（用實拍手牌照試出嚟）。 */
export const TARGET_TILE_SIZE = 80
/** 窗口數上限，避免牌好細嘅大相要跑好耐。 */
const MAX_WINDOWS = 8
/** 窗口數超過上限時，每次將窗口放大幾多。 */
const WINDOW_GROWTH = 1.25

/** 沿一條邊排窗口：由頭到尾平均分佈，相鄰最少重疊 MIN_WINDOW_OVERLAP。 */
const positionsAlong = (length: number, size: number): number[] => {
  if (size >= length) return [0]
  const count = Math.ceil((length - size) / (size * (1 - MIN_WINDOW_OVERLAP))) + 1
  return Array.from({ length: count }, (_, index) => Math.round(index * (length - size) / (count - 1)))
}

/**
 * 按牌嘅闊度切窗口，令每隻牌送入模型時大約 TARGET_TILE_SIZE 闊。
 * 牌夠大就成張一格；窗口太多就放大窗口。
 */
export const windowsForTileWidth = (width: number, height: number, tileWidth: number, modelSize: number): Box[] => {
  const tile = (side: number): Box[] => {
    const windowWidth = Math.min(width, Math.round(side))
    const windowHeight = Math.min(height, Math.round(side))
    const windows = positionsAlong(width, windowWidth)
      .flatMap(x => positionsAlong(height, windowHeight).map(y => ({ x, y, width: windowWidth, height: windowHeight })))
    return windows.length > MAX_WINDOWS ? tile(side * WINDOW_GROWTH) : windows
  }
  return tile(tileWidth * modelSize / TARGET_TILE_SIZE)
}

/** 牌嘅中位闊度，用嚟估計牌喺相入面有幾大。 */
export const medianTileWidth = (detections: Detection[]): number => {
  const widths = detections.map(detection => detection.box.width).sort((first, second) => first - second)
  return widths[Math.floor(widths.length / 2)] ?? 0
}

/** 喺轉咗 180 度嘅相入面搵到嘅框，還原到正放嘅位置。 */
export const rotateBack = (detection: Detection, width: number, height: number): Detection => ({
  ...detection,
  box: { ...detection.box, x: width - detection.box.x - detection.box.width, y: height - detection.box.y - detection.box.height },
})

/** 合併幾格、正反兩次嘅結果，重疊嘅只留信心最高嗰個。 */
export const mergeDetections = (lists: Detection[][]): Detection[] => suppressOverlaps(lists.flat())
