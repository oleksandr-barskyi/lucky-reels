export type SymbolId = 'cherry' | 'lemon' | 'bell' | 'star' | 'seven' | 'gem'

export type Grid = SymbolId[][]

export interface LineWin {
  line: number
  symbol: SymbolId
  amount: number
}

export interface SpinResult {
  stops: number[]
  grid: Grid
  wins: LineWin[]
  totalWin: number
}

export type Rng = () => number

export const ROWS = 3

export const PAYTABLE: Record<SymbolId, number> = {
  cherry: 10,
  lemon: 16,
  bell: 30,
  star: 50,
  seven: 120,
  gem: 300,
}

export const PAYLINES: [number, number, number][] = [
  [1, 1, 1],
  [0, 0, 0],
  [2, 2, 2],
  [0, 1, 2],
  [2, 1, 0],
]

const WEIGHTS: Record<SymbolId, number> = {
  cherry: 9,
  lemon: 8,
  bell: 6,
  star: 4,
  seven: 3,
  gem: 2,
}

export function buildStrip(rng: Rng): SymbolId[] {
  const strip: SymbolId[] = []
  for (const [symbol, weight] of Object.entries(WEIGHTS) as [SymbolId, number][]) {
    for (let i = 0; i < weight; i++) strip.push(symbol)
  }
  for (let i = strip.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[strip[i], strip[j]] = [strip[j], strip[i]]
  }
  return strip
}

export function seeded(seed: number): Rng {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function visible(strip: SymbolId[], stop: number): SymbolId[] {
  const n = strip.length
  return [strip[(stop - 1 + n) % n], strip[stop % n], strip[(stop + 1) % n]]
}

export function evaluate(grid: Grid, betPerLine: number): LineWin[] {
  const wins: LineWin[] = []
  PAYLINES.forEach((rows, line) => {
    const symbols = rows.map((row, reel) => grid[reel][row])
    if (symbols.every((s) => s === symbols[0])) {
      wins.push({ line, symbol: symbols[0], amount: PAYTABLE[symbols[0]] * betPerLine })
    }
  })
  return wins
}

export function spin(strips: SymbolId[][], betPerLine: number, rng: Rng): SpinResult {
  const stops = strips.map((strip) => Math.floor(rng() * strip.length))
  const grid = strips.map((strip, i) => visible(strip, stops[i]))
  const wins = evaluate(grid, betPerLine)
  return { stops, grid, wins, totalWin: wins.reduce((sum, w) => sum + w.amount, 0) }
}

export class Wallet {
  private credits: number

  constructor(credits: number) {
    this.credits = credits
  }

  get balance(): number {
    return this.credits
  }

  canBet(totalBet: number): boolean {
    return Number.isInteger(totalBet) && totalBet > 0 && totalBet <= this.credits
  }

  settle(totalBet: number, win: number): number {
    if (!this.canBet(totalBet)) throw new Error('Insufficient balance')
    this.credits = this.credits - totalBet + win
    return this.credits
  }
}

export function theoreticalRtp(): number {
  const total = Object.values(WEIGHTS).reduce((a, b) => a + b, 0)
  return (Object.keys(WEIGHTS) as SymbolId[]).reduce(
    (sum, s) => sum + PAYTABLE[s] * (WEIGHTS[s] / total) ** 3,
    0,
  )
}

export function returnToPlayer(strips: SymbolId[][], spins: number, rng: Rng): number {
  let paid = 0
  for (let i = 0; i < spins; i++) paid += spin(strips, 1, rng).totalWin
  return paid / (spins * PAYLINES.length)
}
