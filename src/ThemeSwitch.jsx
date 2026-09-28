import { useEffect, useState } from 'react'

const MODES = [
  { value: 'auto', label: 'Auto' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

function readMode() {
  try {
    return localStorage.getItem('theme') ?? 'auto'
  } catch {
    return 'auto'
  }
}

export default function ThemeSwitch() {
  const [mode, setMode] = useState(readMode)

  useEffect(() => {
    const root = document.documentElement
    if (mode === 'auto') root.removeAttribute('data-theme')
    else root.dataset.theme = mode
    try {
      localStorage.setItem('theme', mode)
    } catch {}
  }, [mode])

  return (
    <fieldset className="theme-switch">
      <legend className="visually-hidden">Color theme</legend>
      <div className="segmented" style={{ '--count': MODES.length }}>
        {MODES.map((m) => (
          <label key={m.value} className={m.value === mode ? 'is-on' : ''}>
            <input type="radio" name="theme" value={m.value} checked={m.value === mode} onChange={() => setMode(m.value)} />
            {m.label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}
