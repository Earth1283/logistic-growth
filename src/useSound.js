import { useEffect, useRef } from 'react'
import { playClip } from './sounds.js'

export function useSound({ enabled, playing, n, k, t }) {
  const run = useRef({ lastT: 0, extinct: false, below: false, arrived: false })

  useEffect(() => {
    const state = run.current
    if (t < state.lastT - 1e-6) {
      state.extinct = false
      state.below = false
      state.arrived = false
    }
    state.lastT = t
    if (n < 0.95 * k) state.below = true
    if (!enabled || !playing) return
    if (state.below && !state.arrived && n >= 0.95 * k) {
      state.arrived = true
      playClip('yay')
    }
    if (n <= 0 && !state.extinct) {
      state.extinct = true
      playClip('extinct')
    }
  }, [enabled, playing, n, k, t])
}
