import { EVENT_KINDS, UNITS, cap, fmt } from './model.js'
import { PRESETS } from './presets.js'
import { delayRegimes, discreteRegimes } from './sim.js'
import Slider from './Slider.jsx'
import { Info, Term } from './Tip.jsx'

const WINDOWS = [25, 50, 100, 200]
const SPEEDS = [0.5, 1, 2, 4]

function Segmented({ name, legend, options, value, onChange, format }) {
  return (
    <fieldset className="window">
      <legend>{legend}</legend>
      <div className="segmented" style={{ '--count': options.length }}>
        {options.map((o) => (
          <label key={o} className={o === value ? 'is-on' : ''}>
            <input type="radio" name={name} value={o} checked={o === value} onChange={() => onChange(o)} />
            {format(o)}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function Section({ title, children, open = true }) {
  return (
    <details className="group" open={open}>
      <summary>
        <h2>{title}</h2>
      </summary>
      <div className="group-body">{children}</div>
    </details>
  )
}

function Feature({ id, title, term, on, onToggle, summary, children }) {
  return (
    <div className={`feature${on ? ' is-on' : ''}`}>
      <div className="feature-head">
        <button
          id={`feature-${id}`}
          type="button"
          role="switch"
          aria-checked={on}
          className="switch"
          onClick={() => onToggle(!on)}
        >
          <span className="switch-knob" />
        </button>
        <label htmlFor={`feature-${id}`}>{title}</label>
        <Info label={title}>{term}</Info>
      </div>
      <p className="feature-summary">{summary}</p>
      {on && <div className="feature-body">{children}</div>}
    </div>
  )
}

function Explain({ children, calc }) {
  return (
    <>
      <p>{children}</p>
      {calc && <p className="pop-calc">{calc}</p>}
    </>
  )
}

export default function Controls({
  p, setParam, setFeature, presetId, onPreset, playback, amounts, setAmount,
  events, now, onAddEvent, onRemoveEvent, onClearEvents, showExp, setShowExp, onExport,
}) {
  const u = UNITS[p.unit]
  const per = `per ${u.one}`
  const tauMax = Math.max(1, Math.ceil(2.6 / p.r))
  const preset = PRESETS.find((x) => x.id === presetId)
  const predatorsReleased = events.some((e) => e.kind === 'predators')
  const atEnd = playback.day >= p.tMax

  const disabled = (kind) =>
    atEnd ||
    (kind === 'restore' && now.baseK >= p.K - 0.5) ||
    (kind === 'predators' && predatorsReleased)

  const eventButton = (kind) => (
    <button key={kind} type="button" className="btn" disabled={disabled(kind)} onClick={() => onAddEvent(kind)}>
      {EVENT_KINDS[kind].button(amounts[kind])}
    </button>
  )

  return (
    <section className="panel controls" aria-label="Model controls">
      <div className="playback">
        <button type="button" className="btn btn-primary" onClick={playback.onTogglePlay}>
          {playback.playing ? 'Pause' : atEnd ? 'Replay' : 'Play'}
        </button>
        <button type="button" className="btn" onClick={playback.onRestart}>
          Restart
        </button>
        <span className="day">
          {cap(u.one)} <strong>{fmt(playback.day, 1)}</strong>
        </span>
      </div>
      <Segmented
        name="speed"
        legend="Playback speed"
        options={SPEEDS}
        value={playback.speed}
        onChange={playback.setSpeed}
        format={(s) => `${s}×`}
      />

      <Section title="Start from a scenario">
        <div className="presets">
          {PRESETS.map((x) => (
            <button
              key={x.id}
              type="button"
              className={`preset${x.id === presetId ? ' is-on' : ''}`}
              aria-pressed={x.id === presetId}
              onClick={() => onPreset(x)}
            >
              {x.name}
            </button>
          ))}
        </div>
        {preset && <p className="preset-blurb">{preset.blurb}</p>}
      </Section>

      <Section title="The basics">
        <Slider
          id="k"
          tone="k"
          label="Carrying capacity"
          symbol={<i className="v-k">K</i>}
          value={p.K}
          min={100}
          max={1000}
          step={10}
          onChange={(K) => setParam({ K })}
          display={`${fmt(p.K)} individuals`}
          info={
            <Explain calc="K sets where the curve levels off. It has no effect on the early, nearly exponential part.">
              The most individuals the habitat’s food, space and shelter can support. Raise it and the
              plateau rises, but the early climb looks the same.
            </Explain>
          }
        />
        <Slider
          id="r"
          label="Growth rate"
          symbol={<i>r</i>}
          value={p.r}
          min={0.05}
          max={3}
          step={0.01}
          onChange={(r) => setParam({ r })}
          display={`${fmt(p.r, 2)} ${per}`}
          bands={p.discrete.on ? discreteRegimes : undefined}
          ends={p.discrete.on ? undefined : ['Slow breeders', 'Fast breeders']}
          info={
            <Explain calc={`Early doubling time is ln 2 / r = ${fmt(Math.LN2 / p.r, 1)} ${u.many}.`}>
              Births minus deaths per individual when resources are unlimited. A higher <i>r</i> makes
              the S steeper but does not change where it levels off.
              {p.discrete.on && ' With once-a-year breeding, a high r causes overshoots, cycles and chaos.'}
            </Explain>
          }
        />
        <Slider
          id="n0"
          label="Starting population"
          symbol={
            <i>
              N<sub>0</sub>
            </i>
          }
          value={p.N0}
          min={1}
          max={1000}
          log
          onChange={(N0) => setParam({ N0 })}
          display={`${fmt(p.N0)} founders`}
          marks={[{ at: p.K, label: 'K' }]}
          info={
            <Explain>
              The founders placed in the habitat at time 0. The scale stretches small numbers because
              small populations behave most differently. Start above <i>K</i> and the population
              shrinks down to it.
            </Explain>
          }
        />
        <Segmented
          name="window"
          legend="Time shown"
          options={WINDOWS}
          value={p.tMax}
          onChange={(tMax) => setParam({ tMax })}
          format={(w) => `${w} ${u.many}`}
        />
        <label className="check" htmlFor="show-exp">
          <input id="show-exp" type="checkbox" checked={showExp} onChange={(e) => setShowExp(e.target.checked)} />
          <span>
            Compare with unlimited <Term id="exponential">exponential growth</Term>
          </span>
        </label>
      </Section>

      <Section title="Make it realistic">
        <p className="hint">
          Real populations rarely follow a perfect S. Switch on what real habitats add, then set how
          extreme each one is.
        </p>

        <Feature
          id="lag"
          title="Time lag"
          on={p.lag.on}
          onToggle={(on) => setFeature('lag', { on })}
          term={<Explain calc="dN/dt = rN(1 − N(t−τ)/K). It oscillates forever once rτ > π/2.">Crowding takes time to bite. Adults born in good times keep breeding after the food runs short, so the population overshoots K.</Explain>}
          summary="Crowding takes a while to slow growth, so the population overshoots."
        >
          <Slider
            id="tau"
            label="Delay"
            symbol={<i>τ</i>}
            value={p.lag.tau}
            min={0}
            max={tauMax}
            step={0.1}
            onChange={(tau) => setFeature('lag', { tau })}
            display={`${fmt(p.lag.tau, 1)} ${u.many}, rτ = ${fmt(p.r * p.lag.tau, 2)}`}
            bands={delayRegimes(p.r)}
          />
        </Feature>

        <Feature
          id="chance"
          title="Random chance"
          on={p.chance.on}
          onToggle={(on) => setFeature('chance', { on })}
          term={<Explain>Births and deaths happen one individual at a time, by luck. The chart runs 8 separate worlds with the same rules so you can see how much luck matters. Small populations can die out by accident.</Explain>}
          summary="Births and deaths happen by luck. Eight runs show the spread."
        >
          <Slider
            id="chance-level"
            label="Turnover"
            value={p.chance.level}
            min={0.05}
            max={1}
            step={0.01}
            onChange={(level) => setFeature('chance', { level })}
            display={`lifespan ≈ ${fmt(1 / (p.chance.level * (p.discrete.on ? 2 : 5 * p.r)), 1)} ${u.many}`}
            ends={['Long-lived, steady', 'Short-lived, jumpy']}
            info={
              <Explain>
                How quickly individuals are replaced. Short lives mean many births and deaths per day
                for the same net growth, and each one is a roll of the dice. Mice are jumpier than
                tortoises.
              </Explain>
            }
          />
          <button type="button" className="btn" onClick={() => setParam({ seed: p.seed + 1 })}>
            Reroll the dice
          </button>
        </Feature>

        <Feature
          id="allee"
          title="Allee effect"
          on={p.allee.on}
          onToggle={(on) => setFeature('allee', { on })}
          term={<Explain calc="Growth is multiplied by (N − A)/(N + A), which turns negative below A.">Individuals in tiny groups can’t find mates or defend themselves. Below the threshold A the population shrinks toward extinction instead of growing.</Explain>}
          summary="Below a threshold, too few individuals to find mates. The group dies out."
        >
          <Slider
            id="allee-a"
            label="Threshold"
            symbol={<i>A</i>}
            value={p.allee.A}
            min={1}
            max={Math.round(p.K / 2)}
            step={1}
            onChange={(A) => setFeature('allee', { A })}
            display={`${fmt(p.allee.A)} individuals`}
            bands={[
              { to: p.N0 + 0.5, tone: 0, label: 'Founders can take off', note: `The ${fmt(p.N0)} founders start above the threshold.` },
              { to: Infinity, tone: 3, label: 'Founders are doomed', note: `The ${fmt(p.N0)} founders are too few. Without migrants they dwindle away.` },
            ]}
            marks={[{ at: p.N0, label: `Start, ${fmt(p.N0)}` }]}
          />
          <p className="hint">
            Related: the <Term id="mvp">minimum viable population</Term>.
          </p>
        </Feature>

        <Feature
          id="season"
          title="Seasons and bad years"
          on={p.season.on}
          onToggle={(on) => setFeature('season', { on })}
          term={<Explain>Food and space change with the seasons and with good and bad years. The carrying capacity moves, and the population chases it.</Explain>}
          summary="The carrying capacity rises and falls, and the population chases it."
        >
          <Slider
            id="season-amp"
            tone="k"
            label="Seasonal swing"
            value={p.season.amp}
            min={0}
            max={0.8}
            step={0.01}
            onChange={(amp) => setFeature('season', { amp })}
            display={`K ± ${fmt(p.season.amp * 100)}%`}
            ends={['Mild climate', 'Harsh winters']}
          />
          <Slider
            id="season-period"
            tone="k"
            label="Season length"
            value={p.season.period}
            min={2}
            max={Math.max(p.tMax, 52)}
            step={1}
            onChange={(period) => setFeature('season', { period })}
            display={`${fmt(p.season.period)} ${u.many} per cycle`}
            info={
              <Explain>
                Short cycles are too quick for the population to follow, so it averages them out. Long
                cycles let it track K closely.
              </Explain>
            }
          />
          <Slider
            id="season-noise"
            tone="k"
            label="Unpredictable years"
            value={p.season.noise}
            min={0}
            max={0.6}
            step={0.01}
            onChange={(noise) => setFeature('season', { noise })}
            display={`± ${fmt(p.season.noise * 100)}%`}
            ends={['Reliable', 'Droughts and floods']}
          />
        </Feature>

        <Feature
          id="discrete"
          title="Breed once a year"
          on={p.discrete.on}
          onToggle={(on) => setFeature('discrete', { on })}
          term={<Explain calc="Ricker model: N(t+1) = N(t)·e^(r(1 − N(t)/K)).">Insects, annual plants and many fish reproduce in one burst per season. The whole season’s growth happens at once, with no chance to adjust, so it can overshoot, cycle, or turn chaotic. Push r past 2 to see it.</Explain>}
          summary="Growth happens in yearly jumps. High r gives cycles and chaos."
        />

        <Feature
          id="harvest"
          title="Steady harvest"
          on={p.harvest.on}
          onToggle={(on) => setFeature('harvest', { on })}
          term={<Explain calc="Removing hN moves the equilibrium to K(1 − h/r). The catch is largest at h = r/2.">Fishing or hunting that removes the same share of the population every day. It lowers the equilibrium, and too much drives the population to zero.</Explain>}
          summary="Remove a fixed share continuously, like a fishery."
        >
          <Slider
            id="harvest-effort"
            label="Effort"
            value={p.harvest.effort}
            min={0}
            max={1.3}
            step={0.01}
            onChange={(effort) => setFeature('harvest', { effort })}
            display={`${fmt(p.harvest.effort * p.r * 100, 1)}% of stock ${per}`}
            bands={[
              { to: 0.5, tone: 0, label: 'Light fishing', note: 'The stock stays high. Fishing harder would catch more.' },
              { to: 1, tone: 2, label: 'Overfishing', note: 'The stock shrinks so much that the total catch falls.' },
              { to: Infinity, tone: 3, label: 'Collapse', note: 'Fishing removes individuals faster than they can be replaced.' },
            ]}
            marks={[{ at: 0.5, label: 'Max. sustainable yield' }]}
          />
          <p className="hint">
            Catch right now: <strong>{fmt(p.harvest.effort * p.r * now.n, 1)}</strong> {per}. The best
            sustainable catch is about {fmt((p.r * p.K) / 4, 1)}. See{' '}
            <Term id="msy">maximum sustainable yield</Term>.
          </p>
        </Feature>
      </Section>

      <Section title="Disturb the population">
        <p className="hint">
          Each disturbance happens at the playhead. Pause, or click the chart, to pick the moment.
        </p>
        <div className="amounts">
          <Slider id="amt-harvest" compact label="Harvest size" value={amounts.harvest} min={0.1} max={0.95} step={0.05} onChange={(v) => setAmount('harvest', v)} display={`${fmt(amounts.harvest * 100)}%`} />
          <Slider id="amt-migrants" compact label="Migrants" value={amounts.migrants} min={10} max={1000} log onChange={(v) => setAmount('migrants', v)} display={fmt(amounts.migrants)} />
          <Slider id="amt-shrink" compact tone="k" label="Habitat loss" value={amounts.shrink} min={0.1} max={0.9} step={0.05} onChange={(v) => setAmount('shrink', v)} display={`${fmt(amounts.shrink * 100)}%`} />
        </div>
        <div className="disturb-buttons">{['harvest', 'migrants', 'shrink', 'restore'].map(eventButton)}</div>

        <h3 className="subhead">
          Wild cards
          <Info label="wild cards">
            <Explain>
              Rare, extreme events. Each one shows a real idea: a meteor is a density-independent
              disaster, plague is density-dependent, a baby boom is a temporary jump in r, and
              predators create a <i>predator pit</i>.
            </Explain>
          </Info>
        </h3>
        <div className="disturb-buttons wild">{['meteor', 'plague', 'boom', 'predators'].map(eventButton)}</div>

        {atEnd && <p className="hint">Replay or move the playhead back to add a disturbance.</p>}
        {events.length > 0 && (
          <>
            <ul className="event-list">
              {[...events].sort((a, b) => a.t - b.t).map((e) => (
                <li key={e.id}>
                  <span>
                    {EVENT_KINDS[e.kind].short}, {u.one} {fmt(e.t, 1)}
                  </span>
                  <button
                    type="button"
                    className="event-remove"
                    aria-label={`Remove ${EVENT_KINDS[e.kind].short} on ${u.one} ${fmt(e.t, 1)}`}
                    onClick={() => onRemoveEvent(e.id)}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" className="btn-link" onClick={onClearEvents}>
              Clear all {events.length} {events.length === 1 ? 'disturbance' : 'disturbances'}
            </button>
          </>
        )}
      </Section>

      <button type="button" className="btn export" onClick={onExport}>
        Download data as CSV
      </button>
    </section>
  )
}
