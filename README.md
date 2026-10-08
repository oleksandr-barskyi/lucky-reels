# Lucky Reels

A small 3-reel slot game rendered with **Pixi.js v8** and TypeScript. The game maths is a
pure module with tests; the renderer only animates what the maths already decided.

Live demo: https://oleksandr-barskyi.github.io/lucky-reels/

Space or the Spin button plays; bet 1, 2 or 5 per line across 5 lines.

## How it works

- **Maths first.** `engine.ts` builds weighted reel strips, picks stops with a seeded RNG,
  reads the 3x3 window, pays 5 lines (3 rows and 2 diagonals) and settles the wallet. The
  result is known before any pixel moves.
- **RTP is designed and checked.** `theoreticalRtp()` computes the return analytically
  (pay x (weight / strip length)^3 per line), and a 200,000-spin simulation must agree
  with it. The first paytable returned 46%; the test caught it and the table was tuned
  to about 94%.
- **Rendering.** Symbol textures are generated once with `renderer.generateTexture`; each reel
  is a masked container with a fixed pool of four sprites that are re-pointed at new
  textures as the reel scrolls, so a spin allocates nothing. The ticker drives positions,
  reels stop one after another with an ease-out-back overshoot, and winning lines are drawn
  with `Graphics`.

```
src/game/engine.ts     strips, RNG, evaluation, wallet, RTP
src/game/tween.ts      easing, reel offset, stop delays
src/game/view.ts       Pixi application, reels, masks, sprite pool, win lines
src/main.ts            HUD, bets, keyboard, game loop
```

## Run

```bash
npm install
npm run dev
npm test
npm run build
```

14 Vitest tests: strip weights and wrap-around, line evaluation including diagonals,
reproducible spins, wallet rules, analytic and simulated RTP, easing and reel timing.

Stack: TypeScript, Pixi.js v8, Vite, Vitest, Biome.
