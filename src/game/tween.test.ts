import { describe, expect, it } from 'vitest'
import { easeOutBack, reelOffset, stopDelays } from './tween'

describe('easing', () => {
  it('starts at 0, ends at 1 and overshoots in between', () => {
    expect(easeOutBack(0)).toBeCloseTo(0)
    expect(easeOutBack(1)).toBeCloseTo(1)
    expect(Math.max(...[0.6, 0.7, 0.8, 0.9].map(easeOutBack))).toBeGreaterThan(1)
  })

  it('clamps the reel offset to the travel distance', () => {
    expect(reelOffset(-10, 1000, 500)).toBe(0)
    expect(reelOffset(2000, 1000, 500)).toBe(500)
  })

  it('stops reels one after another', () => {
    expect(stopDelays(3, 900, 300)).toEqual([900, 1200, 1500])
  })
})
