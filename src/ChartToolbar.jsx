import { UNITS, cap, fmt } from './model.js'

const SPEEDS = [
  { value: 0.25, label: '0.25×' },
  { value: 0.5, label: '0.5×' },
  { value: 1, label: '1×' },
  { value: 2, label: '2×' },
  { value: 4, label: '4×' },
]

export default function ChartToolbar({
  playing, atEnd, day, unit, speed, setSpeed, onTogglePlay, onRestart, onExport,
  sound, onToggleSound, narrator, onToggleNarrator,
}) {
  return (
    <div className="toolbar" role="toolbar" aria-label="Playback">
      <button type="button" className="btn btn-primary" onClick={onTogglePlay}>
        {playing ? 'Pause' : atEnd ? 'Replay' : 'Play'}
      </button>
      <button type="button" className="btn" onClick={onRestart}>
        Restart
      </button>
      <fieldset className="speed">
        <legend className="visually-hidden">Playback speed</legend>
        <div className="segmented" style={{ '--count': SPEEDS.length }}>
          {SPEEDS.map((s) => (
            <label key={s.value} className={s.value === speed ? 'is-on' : ''}>
              <input
                type="radio"
                name="speed"
                value={s.value}
                checked={s.value === speed}
                onChange={() => setSpeed(s.value)}
              />
              {s.label}
            </label>
          ))}
        </div>
      </fieldset>
      <span className="day" aria-live="off">
        {cap(UNITS[unit].one)} <strong>{fmt(day, 1)}</strong>
      </span>
      <button type="button" className="btn" aria-pressed={sound} onClick={onToggleSound}>
        Sound {sound ? 'on' : 'off'}
      </button>
      <button type="button" className="btn" aria-pressed={narrator} onClick={onToggleNarrator}>
        Narrator {narrator ? 'on' : 'off'}
      </button>
      <button type="button" className="btn" onClick={onExport}>
        Download CSV
      </button>
    </div>
  )
}
