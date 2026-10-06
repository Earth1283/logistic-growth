import { useEffect, useState } from 'react'
import { usePreloadProgress } from './sounds.js'

export default function SoundLoader() {
  const progress = usePreloadProgress()
  const done = progress >= 1
  const [gone, setGone] = useState(false)

  useEffect(() => {
    if (!done) return
    const id = setTimeout(() => setGone(true), 900)
    return () => clearTimeout(id)
  }, [done])

  if (gone) return null
  const pct = Math.round(progress * 100)

  return (
    <div className={`sound-loader${done ? ' is-done' : ''}`}>
      <span id="sound-loader-label">{done ? 'Cursed sounds loaded' : 'Loading cursed sounds'}</span>
      <div
        className="sound-loader-bar"
        role="progressbar"
        aria-labelledby="sound-loader-label"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
      >
        <span style={{ width: `${pct}%` }} />
      </div>
      <strong>{pct}%</strong>
    </div>
  )
}
