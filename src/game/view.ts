import { Application, Container, Graphics, Sprite, Text, type Texture } from 'pixi.js'
import { type LineWin, PAYLINES, ROWS, type SymbolId } from './engine'
import { reelOffset, stopDelays } from './tween'

const CELL = 120
const GAP = 12
const PAD = 20

const LOOK: Record<SymbolId, { glyph: string; color: number }> = {
  cherry: { glyph: '🍒', color: 0xfde2e4 },
  lemon: { glyph: '🍋', color: 0xfff3bf },
  bell: { glyph: '🔔', color: 0xffe8cc },
  star: { glyph: '⭐', color: 0xe7f5ff },
  seven: { glyph: '7', color: 0xffe3e3 },
  gem: { glyph: '💎', color: 0xe3fafc },
}

interface ReelState {
  strip: SymbolId[]
  sprites: Sprite[]
  position: number
  from: number
  to: number
  stopAt: number
  spinning: boolean
}

export class SlotView {
  readonly app = new Application()
  private readonly textures = new Map<SymbolId, Texture>()
  private readonly reels: ReelState[] = []
  private readonly highlight = new Graphics()
  private elapsed = 0
  private resolve: (() => void) | null = null

  async mount(host: HTMLElement, strips: SymbolId[][]): Promise<void> {
    const width = PAD * 2 + strips.length * CELL + (strips.length - 1) * GAP
    const height = PAD * 2 + ROWS * CELL
    await this.app.init({
      width,
      height,
      background: 0x1b1f3b,
      antialias: true,
      resolution: window.devicePixelRatio,
      autoDensity: true,
    })
    host.appendChild(this.app.canvas)

    for (const id of Object.keys(LOOK) as SymbolId[]) this.textures.set(id, this.makeTexture(id))

    strips.forEach((strip, i) => {
      const reel = new Container()
      reel.x = PAD + i * (CELL + GAP)
      reel.y = PAD
      const mask = new Graphics().roundRect(0, 0, CELL, ROWS * CELL, 14).fill(0xffffff)
      reel.addChild(mask)
      reel.mask = mask
      const sprites = Array.from({ length: ROWS + 1 }, () => {
        const s = new Sprite()
        reel.addChild(s)
        return s
      })
      this.app.stage.addChild(reel)
      const state: ReelState = {
        strip,
        sprites,
        position: 0,
        from: 0,
        to: 0,
        stopAt: 0,
        spinning: false,
      }
      this.reels.push(state)
      this.layout(state)
    })

    this.app.stage.addChild(this.highlight)
    this.app.ticker.add((ticker) => this.update(ticker.deltaMS))
  }

  spinTo(stops: number[]): Promise<void> {
    this.highlight.clear()
    this.elapsed = 0
    const delays = stopDelays(this.reels.length, 900, 300)
    this.reels.forEach((r, i) => {
      const n = r.strip.length
      const target = (((stops[i] - 1) % n) + n) % n
      const start = Math.round(r.position)
      const delta = (((target - start) % n) + n) % n
      r.from = start
      r.to = start + n * (2 + i) + delta
      r.stopAt = delays[i]
      r.spinning = true
    })
    return new Promise((res) => {
      this.resolve = res
    })
  }

  showWins(wins: LineWin[]): void {
    this.highlight.clear()
    for (const win of wins) {
      const points = PAYLINES[win.line].map((row, reel) => ({
        x: PAD + reel * (CELL + GAP) + CELL / 2,
        y: PAD + row * CELL + CELL / 2,
      }))
      this.highlight.moveTo(points[0].x, points[0].y)
      for (const p of points.slice(1)) this.highlight.lineTo(p.x, p.y)
      this.highlight.stroke({ width: 6, color: 0xffd43b, alpha: 0.9, cap: 'round' })
    }
  }

  private update(deltaMs: number): void {
    if (!this.reels.some((r) => r.spinning)) return
    this.elapsed += deltaMs
    for (const r of this.reels) {
      if (!r.spinning) continue
      r.position = r.from + reelOffset(this.elapsed, r.stopAt, r.to - r.from)
      if (this.elapsed >= r.stopAt) {
        r.position = r.to
        r.spinning = false
      }
      this.layout(r)
    }
    if (!this.reels.some((r) => r.spinning) && this.resolve) {
      const done = this.resolve
      this.resolve = null
      done()
    }
  }

  private layout(r: ReelState): void {
    const n = r.strip.length
    const top = Math.floor(r.position)
    const frac = r.position - top
    r.sprites.forEach((sprite, k) => {
      const symbol = r.strip[(((top + k) % n) + n) % n]
      const texture = this.textures.get(symbol)
      if (texture && sprite.texture !== texture) sprite.texture = texture
      sprite.y = (k - frac) * CELL
    })
  }

  private makeTexture(id: SymbolId): Texture {
    const box = new Container()
    box.addChild(new Graphics().roundRect(6, 6, CELL - 12, CELL - 12, 18).fill(LOOK[id].color))
    const label = new Text({
      text: LOOK[id].glyph,
      style: { fontSize: id === 'seven' ? 72 : 60, fontWeight: '800', fill: 0xc92a2a },
    })
    label.anchor.set(0.5)
    label.position.set(CELL / 2, CELL / 2)
    box.addChild(label)
    return this.app.renderer.generateTexture({ target: box, frame: undefined })
  }
}
