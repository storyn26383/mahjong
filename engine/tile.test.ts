import { describe, expect, test } from 'bun:test'
import { ALL_TILES } from './tile'

describe('tile', () => {
  test('there are 42 distinct tile faces: 27 suited, 7 honours, 8 flowers', () => {
    expect(ALL_TILES).toHaveLength(42)
  })
})
