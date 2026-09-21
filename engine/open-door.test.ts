import { describe, expect, test } from 'bun:test'
import { DrawDirection, openDoor, Position } from './open-door'

describe('openDoor', () => {
  // 總點數由莊家逆時針數定山；莊家喺下方，下家喺右。
  test.each([
    [[1, 1, 1], Position.Top],      // 3 → 對家
    [[1, 2, 2], Position.Bottom],   // 5 → 莊家
    [[2, 2, 4], Position.Left],     // 8 → 上家
    [[3, 3, 4], Position.Right],    // 10 → 下家
    [[6, 6, 5], Position.Bottom],   // 17 → 莊家
    [[6, 6, 6], Position.Right],    // 18 → 下家
  ])('dice %p → wall %s', (dice, wall) => {
    expect(openDoor({ dice: dice as [number, number, number] }).wall).toBe(wall)
  })

  test('skipped stacks equals the dice total', () => {
    expect(openDoor({ dice: [3, 3, 4] }).skippedStacks).toBe(10)
  })

  test('tiles are always drawn clockwise around the table', () => {
    expect(openDoor({ dice: [1, 1, 1] }).drawDirection).toBe(DrawDirection.Clockwise)
  })
})
