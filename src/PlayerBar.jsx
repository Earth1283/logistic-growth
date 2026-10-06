import { UNITS, cap, fmt } from './model.js'

export default function PlayerBar({ hidden, playing, atEnd, t, tMax, unit, now, events, onTogglePlay, onScrub }) {
  const u = UNITS[unit]
  const pct = (t / tMax) * 100

  return (
    <div
      className={`player${hidden ? ' is-hidden' : ''}`}
      role="region"
      aria-label="Playback bar"
      aria-hidden={hidden}
      inert={hidden ? '' : undefined}
    >
      <button
        type="button"
        className="player-play"
        onClick={onTogglePlay}
        aria-label={playing ? 'Pause' : atEnd ? 'Replay' : 'Play'}
      >
        {playing ? (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : atEnd ? (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 5a7 7 0 1 1-6.7 9h2.1A5 5 0 1 0 12 7v3L7 6l5-4z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      <div className="player-track">
        <div className="player-ticks" aria-hidden="true">
          {events.map((e) => (
            <span key={e.id} style={{ left: `${(e.t / tMax) * 100}%` }} />
          ))}
        </div>
        <input
          type="range"
          min={0}
          max={tMax}
          step={tMax / 1000}
          value={t}
          style={{ '--pct': `${pct}%` }}
          aria-label={`Time in ${u.many}`}
          aria-valuetext={`${cap(u.one)} ${fmt(t, 1)} of ${fmt(tMax)}`}
          onChange={(e) => onScrub(Number(e.target.value))}
        />
        <div className="player-times">
          <span>{fmt(t, 1)}</span>
          <span>{fmt(tMax)} {u.many}</span>
        </div>
      </div>

      <span className="player-readout">
        N <strong>{fmt(now.n)}</strong>
      </span>
    </div>
  )
}
