import { describe, expect, test } from 'bun:test'
import { canAddChow, canAddKong, canAddPung, canAddTile, countOf, emptyHand, handSize, isChow, MeldKind } from './hand'

describe('hand', () => {
  const hand = {
    concealed: ['m1', 'm1', 'p5'],
    melds: [{ kind: MeldKind.Pung, tiles: ['z1', 'z1', 'z1'] }, { kind: MeldKind.OpenKong, tiles: ['m9', 'm9', 'm9', 'm9'] }],
    flowers: ['f1'],
  } as const

  test('empty hand has size 0', () => {
    expect(handSize(emptyHand())).toBe(0)
  })

  test('hand size counts concealed tiles plus 3 per meld, kongs included; flowers excluded', () => {
    expect(handSize(hand)).toBe(3 + 3 + 3)
  })

  test('countOf counts a tile across concealed tiles and melds', () => {
    expect(countOf(hand, 'm1')).toBe(2)
    expect(countOf(hand, 'z1')).toBe(3)
    expect(countOf(hand, 'm9')).toBe(4)
    expect(countOf(hand, 's3')).toBe(0)
  })

  test('a tile with 4 copies in play cannot be added', () => {
    expect(canAddTile(hand, 'm9')).toBe(false)
    expect(canAddTile(hand, 'm1')).toBe(true)
  })

  test('a pung needs 3 free copies, a kong needs all 4', () => {
    expect(canAddPung(hand, 'm1')).toBe(false)
    expect(canAddPung(hand, 'p5')).toBe(true)
    expect(canAddKong(hand, 'p5')).toBe(false)
    expect(canAddKong(hand, 's3')).toBe(true)
  })

  test('a chow is three consecutive suited tiles of one suit, any tap order', () => {
    expect(isChow(['m3', 'm1', 'm2'])).toBe(true)
    expect(isChow(['m1', 'm2', 'p3'])).toBe(false)
    expect(isChow(['z1', 'z2', 'z3'])).toBe(false)
    expect(isChow(['m1', 'm1', 'm2'])).toBe(false)
    expect(canAddChow(hand, ['m1', 'm2', 'm3'])).toBe(true)
    expect(canAddChow(hand, ['m7', 'm8', 'm9'])).toBe(false)
  })
})
