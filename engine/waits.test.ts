import { describe, expect, test } from 'bun:test'
import { MeldKind, type Hand } from './hand'
import type { Tile } from './tile'
import { analyseWaits, WaitKind } from './waits'

const tiles = (spec: string): Tile[] => spec.split(' ') as Tile[]
const concealedOnly = (spec: string): Hand => ({ concealed: tiles(spec), melds: [], flowers: [] })

describe('analyseWaits', () => {
  test('一二萬 waits on 三萬 as an edge wait', () => {
    const waits = analyseWaits(concealedOnly('m1 m2 p1 p2 p3 p4 p5 p6 p7 p8 p9 s1 s2 s3 z1 z1'))
    expect(waits).toEqual([{ tile: 'm3', kind: WaitKind.Edge, remaining: 4 }])
  })

  test('八九萬 waits on 七萬 as an edge wait', () => {
    const waits = analyseWaits(concealedOnly('m8 m9 p1 p2 p3 p4 p5 p6 p7 p8 p9 s1 s2 s3 z1 z1'))
    expect(waits).toEqual([{ tile: 'm7', kind: WaitKind.Edge, remaining: 4 }])
  })

  test('一三萬 waits on 二萬 as a closed wait', () => {
    const waits = analyseWaits(concealedOnly('m1 m3 p1 p2 p3 p4 p5 p6 p7 p8 p9 s1 s2 s3 z1 z1'))
    expect(waits).toEqual([{ tile: 'm2', kind: WaitKind.Closed, remaining: 4 }])
  })

  test('five complete sets plus one tile is a single wait on that tile', () => {
    const waits = analyseWaits(concealedOnly('m1 p1 p2 p3 p4 p5 p6 p7 p8 p9 s1 s2 s3 s4 s5 s6'))
    expect(waits).toEqual([{ tile: 'm1', kind: WaitKind.Single, remaining: 3 }])
  })

  test('二三萬 waits on 一萬 and 四萬, neither is a lone wait', () => {
    const waits = analyseWaits(concealedOnly('m2 m3 p1 p2 p3 p4 p5 p6 p7 p8 p9 s1 s2 s3 z1 z1'))
    expect(waits).toEqual([
      { tile: 'm1', kind: WaitKind.Multiple, remaining: 4 },
      { tile: 'm4', kind: WaitKind.Multiple, remaining: 4 },
    ])
  })

  test('小螺絲 一萬 + 三張三萬 waits on two tiles, so neither counts as a lone wait', () => {
    const waits = analyseWaits(concealedOnly('m1 m3 m3 m3 p1 p2 p3 p4 p5 p6 p7 p8 p9 s1 s2 s3'))
    expect(waits.map(w => w.tile)).toEqual(['m1', 'm2'])
    expect(waits.every(w => w.kind === WaitKind.Multiple)).toBe(true)
  })

  test('melds count as completed sets and reduce the tiles remaining', () => {
    const hand: Hand = {
      concealed: tiles('m1 m2 p4 p5 p6 z1 z1'),
      melds: [
        { kind: MeldKind.Pung, tiles: tiles('m3 m3 m3') },
        { kind: MeldKind.Chow, tiles: tiles('s1 s2 s3') },
        { kind: MeldKind.OpenKong, tiles: tiles('z2 z2 z2 z2') },
      ],
      flowers: tiles('f1'),
    }
    expect(analyseWaits(hand)).toEqual([{ tile: 'm3', kind: WaitKind.Edge, remaining: 1 }])
  })

  test('a hand that is not ready has no waits', () => {
    expect(analyseWaits(concealedOnly('m1 m5 m9 p1 p5 p9 s1 s5 s9 z1 z2 z3 z4 z5 z6 z7'))).toEqual([])
  })

  test('a hand that is not 16 tiles has no waits', () => {
    expect(analyseWaits(concealedOnly('m1 m2'))).toEqual([])
  })
})
