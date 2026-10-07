import { useEffect, useRef } from 'react'

export function useExtinction({ playing, n, t, onExtinct }) {
  const run = useRef({ lastT: 0, seenAlive: false, fired: false })
  const callback = useRef(onExtinct)
  callback.current = onExtinct

  useEffect(() => {
    const state = run.current
    if (t < state.lastT - 1e-6) {
      state.seenAlive = false
      state.fired = false
    }
    state.lastT = t
    if (n > 0) state.seenAlive = true
    if (playing && state.seenAlive && n <= 0 && !state.fired) {
      state.fired = true
      callback.current()
    }
  }, [playing, n, t])
}
