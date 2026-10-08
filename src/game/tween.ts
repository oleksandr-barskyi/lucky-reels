export function easeOutBack(t: number): number {
  const c1 = 1.4
  const c3 = c1 + 1
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2
}

export function reelOffset(elapsedMs: number, durationMs: number, distance: number): number {
  if (elapsedMs <= 0) return 0
  if (elapsedMs >= durationMs) return distance
  return distance * easeOutBack(elapsedMs / durationMs)
}

export function stopDelays(reels: number, baseMs: number, stepMs: number): number[] {
  return Array.from({ length: reels }, (_, i) => baseMs + i * stepMs)
}
