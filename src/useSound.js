import { useEffect, useRef } from 'react'
import { playClip } from './sounds.js'

export function useSound({ enabled, playing, n, k, t }) {
  const run = useRef({ lastT: 0, peak: 0, crashed: false, extinct: false, below: false, arrived: false })

  useEffect(() => {
    const state = run.current
    if (t < state.lastT - 1e-6) {
      state.peak = 0
      state.crashed = false
      state.extinct = false
      state.below = false
      state.arrived = false
    }
    state.lastT = t
    state.peak = Math.max(state.peak, n)
    if (n < 0.95 * k) state.below = true
    if (!enabled || !playing) return
    if (state.below && !state.arrived && n >= 0.95 * k) {
      state.arrived = true
      playClip('yay')
    }
    if (n <= 0 && !state.extinct) {
      state.extinct = true
      state.crashed = true
      playClip('extinct')
    } else if (!state.crashed && state.peak > 0.8 * k && n < 0.4 * state.peak) {
      state.crashed = true
      playClip('crash')
    }
  }, [enabled, playing, n, k, t])
}
