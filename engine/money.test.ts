import { describe, expect, test } from 'bun:test'
import { settle } from './money'
import { WinMethod } from './scoring'

describe('settle', () => {
  const stakes = { base: 50, perTai: 20 }

  test('金額 = 底 + 台 × 台數, a discard win is paid by one player', () => {
    expect(settle(stakes, 4, WinMethod.Discard)).toEqual({ perPayer: 130, payers: 1, total: 130 })
  })

  test('a self-draw win is paid by all three players', () => {
    expect(settle(stakes, 4, WinMethod.SelfDraw)).toEqual({ perPayer: 130, payers: 3, total: 390 })
  })

  test('zero tai still pays the base', () => {
    expect(settle(stakes, 0, WinMethod.Discard)).toEqual({ perPayer: 50, payers: 1, total: 50 })
  })
})
