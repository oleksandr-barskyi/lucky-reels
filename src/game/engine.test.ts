import { describe, expect, it } from 'vitest'
import {
  buildStrip,
  evaluate,
  type Grid,
  PAYLINES,
  PAYTABLE,
  returnToPlayer,
  seeded,
  spin,
  theoreticalRtp,
  visible,
  Wallet,
} from './engine'

const strips = () => {
  const rng = seeded(2026)
  return [buildStrip(rng), buildStrip(rng), buildStrip(rng)]
}

describe('reel strips', () => {
  it('keep the symbol weights after shuffling', () => {
    const strip = buildStrip(seeded(1))
    expect(strip.length).toBe(32)
    expect(strip.filter((s) => s === 'gem').length).toBe(2)
  })

  it('show three neighbouring symbols and wrap around the end', () => {
    const strip = buildStrip(seeded(1))
    expect(visible(strip, 0)).toEqual([strip[strip.length - 1], strip[0], strip[1]])
  })
})

describe('evaluate', () => {
  it('pays every matching line, diagonals included', () => {
    const grid: Grid = [
      ['seven', 'bell', 'gem'],
      ['lemon', 'seven', 'gem'],
      ['cherry', 'lemon', 'seven'],
    ]
    expect(evaluate(grid, 2)).toEqual([{ line: 3, symbol: 'seven', amount: PAYTABLE.seven * 2 }])
  })

  it('pays nothing without three in a row', () => {
    const grid: Grid = [
      ['seven', 'bell', 'gem'],
      ['lemon', 'star', 'cherry'],
      ['cherry', 'lemon', 'bell'],
    ]
    expect(evaluate(grid, 1)).toEqual([])
  })

  it('pays a full screen on all five lines', () => {
    const grid: Grid = Array.from({ length: 3 }, () => ['gem', 'gem', 'gem'])
    expect(evaluate(grid, 1)).toHaveLength(PAYLINES.length)
  })
})

describe('spin', () => {
  it('is reproducible with the same seed', () => {
    const s = strips()
    expect(spin(s, 1, seeded(9))).toEqual(spin(s, 1, seeded(9)))
  })

  it('reports a total equal to the sum of line wins', () => {
    const s = strips()
    const rng = seeded(3)
    for (let i = 0; i < 1000; i++) {
      const r = spin(s, 1, rng)
      expect(r.totalWin).toBe(r.wins.reduce((a, w) => a + w.amount, 0))
    }
  })
})

describe('wallet', () => {
  it('takes the bet and adds the win', () => {
    const w = new Wallet(1000)
    expect(w.settle(50, 120)).toBe(1070)
  })

  it('refuses bets above the balance, zero or fractional bets', () => {
    const w = new Wallet(40)
    expect(w.canBet(50)).toBe(false)
    expect(w.canBet(0)).toBe(false)
    expect(w.canBet(1.5)).toBe(false)
    expect(() => w.settle(50, 0)).toThrow('Insufficient balance')
  })
})

describe('return to player', () => {
  it('is designed at about 94 percent', () => {
    expect(theoreticalRtp()).toBeGreaterThan(0.92)
    expect(theoreticalRtp()).toBeLessThan(0.96)
  })

  it('matches the theory in a long simulation', () => {
    const rtp = returnToPlayer(strips(), 200_000, seeded(42))
    expect(Math.abs(rtp - theoreticalRtp())).toBeLessThan(0.03)
  })
})
