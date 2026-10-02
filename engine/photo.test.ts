import { describe, expect, test } from 'bun:test'
import { MeldKind } from './hand'
import { adjustCrop, CropHandle, MeldRow, MIN_CROP, readPhoto, TILE_FOR_CLASS, type Box, type Detection } from './photo'
import type { Tile } from './tile'

const TILE_WIDTH = 40
const TILE_HEIGHT = 56
const TIGHT_GAP = 2
const GROUP_GAP = 30

/** 由左至右排一行牌；`|` 代表兩組副露之間嘅空隙。 */
const row = (y: number, spec: string): Detection[] => {
  let x = 0
  const detections: Detection[] = []
  for (const token of spec.split(' ')) {
    if (token === '|') { x += GROUP_GAP; continue }
    detections.push({ tile: token as Tile, confidence: 0.9, box: { x, y, width: TILE_WIDTH, height: TILE_HEIGHT } })
    x += TILE_WIDTH + TIGHT_GAP
  }
  return detections
}

describe('TILE_FOR_CLASS', () => {
  test('maps the dataset classes onto our tile ids', () => {
    expect(TILE_FOR_CLASS).toHaveLength(42)
    expect([TILE_FOR_CLASS[0], TILE_FOR_CLASS[1], TILE_FOR_CLASS[2]]).toEqual(['s1', 'm1', 'p1'])
    expect([TILE_FOR_CLASS[3], TILE_FOR_CLASS[4]]).toEqual(['f1', 'f5'])
    expect([TILE_FOR_CLASS[18], TILE_FOR_CLASS[19]]).toEqual(['f4', 'f8'])
    expect(TILE_FOR_CLASS.slice(35)).toEqual(['z1', 'z6', 'z4', 'z5', 'z2', 'z7', 'z3'])
    expect(new Set(TILE_FOR_CLASS).size).toBe(42)
  })
})

describe('readPhoto', () => {
  test('a single row is all concealed, with flowers set aside', () => {
    const reading = readPhoto(row(100, 'm1 m2 m3 f1 z1 z1'), MeldRow.Top)
    expect(reading.hand).toEqual({ concealed: ['m1', 'm2', 'm3', 'z1', 'z1'], melds: [], flowers: ['f1'] })
    expect(reading.unmatched).toEqual([])
  })

  test('two rows: the top row is split into melds at the gaps', () => {
    const detections = [
      ...row(0, 'm1 m1 m1 | p1 p2 p3 | z1 z1 z1 z1'),
      ...row(200, 's1 s2 s3 s4 s5'),
    ]
    const reading = readPhoto(detections, MeldRow.Top)
    expect(reading.hand.melds).toEqual([
      { kind: MeldKind.Pung, tiles: ['m1', 'm1', 'm1'] },
      { kind: MeldKind.Chow, tiles: ['p1', 'p2', 'p3'] },
      { kind: MeldKind.OpenKong, tiles: ['z1', 'z1', 'z1', 'z1'] },
    ])
    expect(reading.hand.concealed).toEqual(['s1', 's2', 's3', 's4', 's5'])
  })

  test('the meld row can be the bottom one', () => {
    const detections = [...row(0, 's1 s2 s3 s4 s5'), ...row(200, 'm1 m1 m1')]
    const reading = readPhoto(detections, MeldRow.Bottom)
    expect(reading.hand.melds).toEqual([{ kind: MeldKind.Pung, tiles: ['m1', 'm1', 'm1'] }])
    expect(reading.hand.concealed).toEqual(['s1', 's2', 's3', 's4', 's5'])
  })

  test('a meld-row group that is not a valid meld goes to the hand and is reported', () => {
    const detections = [...row(0, 'm1 m5 m9 | p1 p1 p1'), ...row(200, 's1 s2')]
    const reading = readPhoto(detections, MeldRow.Top)
    expect(reading.unmatched).toEqual([['m1', 'm5', 'm9']])
    expect(reading.hand.concealed).toEqual(['s1', 's2', 'm1', 'm5', 'm9'])
    expect(reading.hand.melds).toEqual([{ kind: MeldKind.Pung, tiles: ['p1', 'p1', 'p1'] }])
  })

  test('tiles in each row are read left to right regardless of detection order', () => {
    const reading = readPhoto(row(100, 'm1 m2 m3').reverse(), MeldRow.Top)
    expect(reading.hand.concealed).toEqual(['m1', 'm2', 'm3'])
  })

  test('nothing detected gives an empty hand', () => {
    expect(readPhoto([], MeldRow.Top)).toEqual({ hand: { concealed: [], melds: [], flowers: [] }, unmatched: [] })
  })
})

describe('adjustCrop', () => {
  const crop = { x: 0.2, y: 0.2, width: 0.5, height: 0.5 }
  const expectBox = (actual: Box, expected: Box) => {
    for (const key of ['x', 'y', 'width', 'height'] as const) expect(actual[key]).toBeCloseTo(expected[key])
  }

  test('dragging inside moves the whole box without resizing', () => {
    expectBox(adjustCrop(crop, CropHandle.Move, 0.1, -0.1), { x: 0.3, y: 0.1, width: 0.5, height: 0.5 })
  })

  test('the box cannot be moved off the photo', () => {
    expectBox(adjustCrop(crop, CropHandle.Move, 0.9, -0.9), { x: 0.5, y: 0, width: 0.5, height: 0.5 })
  })

  test('a corner moves its two edges and keeps the opposite corner', () => {
    expectBox(adjustCrop(crop, CropHandle.TopLeft, -0.1, 0.1), { x: 0.1, y: 0.3, width: 0.6, height: 0.4 })
    expectBox(adjustCrop(crop, CropHandle.BottomRight, 0.1, 0.1), { x: 0.2, y: 0.2, width: 0.6, height: 0.6 })
  })

  test('an edge moves only itself', () => {
    expectBox(adjustCrop(crop, CropHandle.Right, -0.2, 0.3), { x: 0.2, y: 0.2, width: 0.3, height: 0.5 })
    expectBox(adjustCrop(crop, CropHandle.Top, 0.3, -0.1), { x: 0.2, y: 0.1, width: 0.5, height: 0.6 })
  })

  test('edges stop at the photo border', () => {
    expectBox(adjustCrop(crop, CropHandle.BottomLeft, -1, 1), { x: 0, y: 0.2, width: 0.7, height: 0.8 })
  })

  test('the box never shrinks below the minimum size', () => {
    expectBox(adjustCrop(crop, CropHandle.Left, 0.9, 0), { x: 0.7 - MIN_CROP, y: 0.2, width: MIN_CROP, height: 0.5 })
    expectBox(adjustCrop(crop, CropHandle.Bottom, 0, -0.9), { x: 0.2, y: 0.2, width: 0.5, height: MIN_CROP })
  })
})

describe('readPhoto: splitting a run of meld-row tiles', () => {
  test('a pung touching misread tiles is still found, the rest goes to the hand', () => {
    const detections = [...row(0, 'z5 z5 z5 p7 s1'), ...row(200, 's2 s3')]
    const reading = readPhoto(detections, MeldRow.Top)
    expect(reading.hand.melds).toEqual([{ kind: MeldKind.Pung, tiles: ['z5', 'z5', 'z5'] }])
    expect(reading.unmatched).toEqual([['p7', 's1']])
    expect(reading.hand.concealed).toEqual(['s2', 's3', 'p7', 's1'])
  })

  test('melds laid edge to edge without gaps are still told apart', () => {
    const detections = [...row(0, 'm1 m1 m1 p1 p2 p3 z1 z1 z1 z1'), ...row(200, 's1')]
    expect(readPhoto(detections, MeldRow.Top).hand.melds).toEqual([
      { kind: MeldKind.Pung, tiles: ['m1', 'm1', 'm1'] },
      { kind: MeldKind.Chow, tiles: ['p1', 'p2', 'p3'] },
      { kind: MeldKind.OpenKong, tiles: ['z1', 'z1', 'z1', 'z1'] },
    ])
  })
})
