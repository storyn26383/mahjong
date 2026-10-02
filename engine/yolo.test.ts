import { describe, expect, test } from 'bun:test'
import type { Tile } from './tile'
import { decodeYolo, letterboxFor, medianTileWidth, mergeDetections, rotateBack, windowsForTileWidth } from './yolo'

const CLASSES = 42
const BOX_FIELDS = 4

/** 砌一個 YOLO 輸出：每個 anchor 一個框加 42 個類別分數，按 [欄位, anchor] 排。 */
const output = (anchors: { box: [number, number, number, number], classIndex: number, score: number }[]): Float32Array => {
  const data = new Float32Array((BOX_FIELDS + CLASSES) * anchors.length)
  anchors.forEach(({ box, classIndex, score }, anchor) => {
    box.forEach((value, field) => { data[field * anchors.length + anchor] = value })
    data[(BOX_FIELDS + classIndex) * anchors.length + anchor] = score
  })
  return data
}

describe('letterboxFor', () => {
  test('scales the long side to the model size and centres the short side', () => {
    expect(letterboxFor(1280, 640, 640)).toEqual({ scale: 0.5, padX: 0, padY: 160 })
  })
})

describe('decodeYolo', () => {
  const letterbox = { scale: 0.5, padX: 10, padY: 0 }

  test('maps boxes back to the original image and classes to tiles', () => {
    const detections = decodeYolo(output([{ box: [100, 100, 20, 30], classIndex: 1, score: 0.9 }]), letterbox)
    expect(detections).toHaveLength(1)
    expect(detections[0]!.tile).toBe('m1')
    expect(detections[0]!.confidence).toBeCloseTo(0.9)
    expect(detections[0]!.box).toEqual({ x: 160, y: 170, width: 40, height: 60 })
  })

  test('drops low-confidence boxes', () => {
    expect(decodeYolo(output([{ box: [100, 100, 20, 30], classIndex: 1, score: 0.1 }]), letterbox)).toEqual([])
  })

  test('keeps only the most confident of heavily overlapping boxes, whatever their class', () => {
    const detections = decodeYolo(output([
      { box: [100, 100, 20, 30], classIndex: 1, score: 0.8 },
      { box: [101, 100, 20, 30], classIndex: 2, score: 0.9 },
      { box: [200, 100, 20, 30], classIndex: 3, score: 0.7 },
    ]), letterbox)
    expect(detections.map(detection => detection.tile)).toEqual(['p1', 'f1'])
  })
})

describe('windowsForTileWidth', () => {
  test('tiles that are large compared to the photo are read in one go', () => {
    // 牌闊 400：窗口邊長 400 × 640 / 80 = 3200，大過成張相
    expect(windowsForTileWidth(3000, 750, 400, 640)).toEqual([{ x: 0, y: 0, width: 3000, height: 750 }])
  })

  test('big tiles are read through overlapping windows sized so each tile is about the target size', () => {
    // 牌闊 200，目標 80：窗口邊長 200 × 640 / 80 = 1600，高度唔夠就用全高
    const windows = windowsForTileWidth(3000, 750, 200, 640)
    expect(windows.map(window => window.x)).toEqual([0, 700, 1400])
    expect(windows.every(window => window.width === 1600 && window.height === 750 && window.y === 0)).toBe(true)
  })

  test('the number of windows is capped by growing them', () => {
    const windows = windowsForTileWidth(4000, 3000, 100, 640)
    expect(windows.length).toBeLessThanOrEqual(8)
    expect(windows[windows.length - 1]!.x + windows[windows.length - 1]!.width).toBe(4000)
    expect(windows[windows.length - 1]!.y + windows[windows.length - 1]!.height).toBe(3000)
  })
})

describe('medianTileWidth', () => {
  test('is the middle width of the detected tiles', () => {
    const detection = (width: number) => ({ tile: 'm1' as const, confidence: 0.9, box: { x: 0, y: 0, width, height: 10 } })
    expect(medianTileWidth([detection(10), detection(50), detection(30)])).toBe(30)
    expect(medianTileWidth([])).toBe(0)
  })
})

describe('rotateBack', () => {
  test('maps a box found in a 180° rotated image back onto the upright image', () => {
    const detection = { tile: 'f1' as const, confidence: 0.9, box: { x: 10, y: 20, width: 30, height: 40 } }
    expect(rotateBack(detection, 200, 100).box).toEqual({ x: 160, y: 40, width: 30, height: 40 })
  })
})

describe('mergeDetections', () => {
  const detection = (tile: Tile, x: number, confidence: number, width = 40) =>
    ({ tile, confidence, box: { x, y: 0, width, height: 50 } })

  test('the same tile found by two overlapping windows is kept once, most confident first', () => {
    const merged = mergeDetections([[detection('m1', 0, 0.6)], [detection('m2', 2, 0.9)]])
    expect(merged.map(found => found.tile)).toEqual(['m2'])
  })

  test('a tile cut at a window edge does not survive next to the full tile', () => {
    const merged = mergeDetections([[detection('m1', 0, 0.9)], [detection('m1', 20, 0.5, 20)]])
    expect(merged).toHaveLength(1)
  })

  test('separate tiles are all kept', () => {
    expect(mergeDetections([[detection('m1', 0, 0.9)], [detection('m2', 60, 0.8)]])).toHaveLength(2)
  })
})
