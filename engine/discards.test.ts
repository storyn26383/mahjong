import { describe, expect, test } from 'bun:test'
import { suggestDiscards } from './discards'
import type { Hand } from './hand'
import type { Tile } from './tile'

const tiles = (spec: string): Tile[] => spec.split(' ') as Tile[]
const concealedOnly = (spec: string): Hand => ({ concealed: tiles(spec), melds: [], flowers: [] })

describe('suggestDiscards', () => {
  test('lists only the discards that leave the hand waiting', () => {
    const hand = concealedOnly('m2 m3 p1 p2 p3 p4 p5 p6 p7 p8 p9 s1 s2 s3 z1 z1 z7')
    expect(suggestDiscards(hand)).toEqual([{ discard: 'z7', waits: ['m1', 'm4'] }])
  })

  test('each distinct tile is tried once even when held twice', () => {
    const hand = concealedOnly('m2 m3 p1 p2 p3 p4 p5 p6 p7 p8 p9 s1 s2 s3 z1 z1 z7')
    const discards = suggestDiscards(hand).map(option => option.discard)
    expect(new Set(discards).size).toBe(discards.length)
  })

  test('options with more kinds of waiting tile come first', () => {
    const hand = concealedOnly('m2 m3 m4 p1 p2 p3 p4 p5 p6 p7 p8 p9 s1 s2 s3 z1 z1')
    const options = suggestDiscards(hand)
    expect(options).toContainEqual({ discard: 'm2', waits: ['m2', 'm5'] })
    expect(options).toContainEqual({ discard: 'm3', waits: ['m3'] })
    const kinds = options.map(option => option.waits.length)
    expect(kinds).toEqual([...kinds].sort((first, second) => second - first))
  })

  test('a 17-tile hand that cannot wait after any discard has no suggestions', () => {
    expect(suggestDiscards(concealedOnly('m1 m5 m9 p1 p5 p9 s1 s5 s9 z1 z2 z3 z4 z5 z6 z7 z7'))).toEqual([])
  })

  test('only a 17-tile hand gets suggestions', () => {
    expect(suggestDiscards(concealedOnly('m2 m3 p1 p2 p3 p4 p5 p6 p7 p8 p9 s1 s2 s3 z1 z1'))).toEqual([])
  })
})
