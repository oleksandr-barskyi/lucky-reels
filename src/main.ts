import './style.css'
import {
  buildStrip,
  PAYLINES,
  PAYTABLE,
  type SymbolId,
  seeded,
  spin,
  theoreticalRtp,
  Wallet,
} from './game/engine'
import { SlotView } from './game/view'

const BETS = [1, 2, 5]
const START_BALANCE = 500

const app = document.querySelector<HTMLDivElement>('#app')
if (!app) throw new Error('#app is missing')

app.innerHTML = `
  <main class="shell">
    <header>
      <h1>Lucky Reels</h1>
      <p class="muted">3 reels, ${PAYLINES.length} lines, designed RTP ${(theoreticalRtp() * 100).toFixed(1)}%</p>
    </header>
    <div id="stage"></div>
    <section class="hud">
      <div><span>Balance</span><strong id="balance"></strong></div>
      <div><span>Bet per line</span><div id="bets" class="bets"></div></div>
      <div><span>Last win</span><strong id="win">0</strong></div>
      <button id="spin" type="button">Spin</button>
    </section>
    <p id="status" class="muted" role="status"></p>
    <section class="paytable" id="paytable"></section>
  </main>
`

const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T
const rng = seeded(Date.now())
const strips = [buildStrip(rng), buildStrip(rng), buildStrip(rng)]
const wallet = new Wallet(START_BALANCE)
const view = new SlotView()
let betPerLine = BETS[0]
let busy = false

function render(): void {
  el('balance').textContent = String(wallet.balance)
  el('bets').innerHTML = BETS.map(
    (b) =>
      `<button type="button" data-bet="${b}" class="${b === betPerLine ? 'active' : ''}">${b}</button>`,
  ).join('')
  const total = betPerLine * PAYLINES.length
  el<HTMLButtonElement>('spin').disabled = busy || !wallet.canBet(total)
  el<HTMLButtonElement>('spin').textContent = `Spin (${total})`
}

el('paytable').innerHTML = (Object.entries(PAYTABLE) as [SymbolId, number][])
  .map(([s, x]) => `<div><span>${s}</span><strong>x${x}</strong></div>`)
  .join('')

el('bets').addEventListener('click', (e) => {
  const value = (e.target as HTMLElement).dataset.bet
  if (!value || busy) return
  betPerLine = Number(value)
  render()
})

async function play(): Promise<void> {
  const total = betPerLine * PAYLINES.length
  if (busy || !wallet.canBet(total)) return
  busy = true
  el('status').textContent = ''
  render()
  const result = spin(strips, betPerLine, rng)
  await view.spinTo(result.stops)
  wallet.settle(total, result.totalWin)
  view.showWins(result.wins)
  el('win').textContent = String(result.totalWin)
  el('status').textContent = result.wins.length
    ? result.wins.map((w) => `Line ${w.line + 1}: ${w.symbol} pays ${w.amount}`).join(' · ')
    : 'No win this time.'
  busy = false
  if (!wallet.canBet(BETS[0] * PAYLINES.length))
    el('status').textContent = 'Out of credits. Reload to start again.'
  render()
}

el('spin').addEventListener('click', play)
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault()
    play()
  }
})

await view.mount(el('stage'), strips)
render()
