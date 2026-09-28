import { useEffect, useMemo, useRef, useState } from 'react'
import { figures as computeFigures, simulate, stateAt } from './sim.js'
import { DEFAULT_PARAMS, PRESETS, paramsFor } from './presets.js'
import { downloadCSV } from './exportCsv.js'
import Equation from './Equation.jsx'
import Controls from './Controls.jsx'
import SCurveChart from './SCurveChart.jsx'
import PlatePanel from './PlatePanel.jsx'
import { GrowthRateChart, PerCapitaChart } from './RateCharts.jsx'
import Analysis from './Analysis.jsx'
import { Term } from './Tip.jsx'

const PLAY_SECONDS = 10

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function App() {
  const [p, setP] = useState(DEFAULT_PARAMS)
  const [presetId, setPresetId] = useState('classic')
  const [showExp, setShowExp] = useState(true)
  const [events, setEvents] = useState([])
  const [amounts, setAmounts] = useState({ harvest: 0.6, migrants: 300, shrink: 0.4 })
  const [speed, setSpeed] = useState(1)
  const [tNow, setTNow] = useState(() => (reducedMotion() ? DEFAULT_PARAMS.tMax : 0))
  const [playing, setPlaying] = useState(() => !reducedMotion())
  const nextId = useRef(1)

  const t = Math.min(tNow, p.tMax)
  const sim = useMemo(() => simulate(p, events), [p, events])
  const figures = useMemo(() => computeFigures(sim, p), [sim, p])
  const now = stateAt(sim, p, t)
  const preset = PRESETS.find((x) => x.id === presetId)

  const setParam = (patch) => setP((prev) => ({ ...prev, ...patch }))
  const setFeature = (key, patch) => setP((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }))

  useEffect(() => {
    if (!playing) return
    let frame
    let last = performance.now()
    const tick = (ts) => {
      const step = ((ts - last) / 1000) * ((p.tMax * speed) / PLAY_SECONDS)
      last = ts
      setTNow((prev) => Math.min(p.tMax, Math.min(prev, p.tMax) + step))
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [playing, p.tMax, speed])

  useEffect(() => {
    if (playing && t >= p.tMax) setPlaying(false)
  }, [playing, t, p.tMax])

  const togglePlay = () => {
    if (playing) return setPlaying(false)
    if (t >= p.tMax) setTNow(0)
    setPlaying(true)
  }

  const restart = () => {
    setTNow(0)
    setPlaying(true)
  }

  const scrub = (value) => {
    setPlaying(false)
    setTNow(value)
  }

  const applyPreset = (next) => {
    const params = paramsFor(next)
    setPresetId(next.id)
    setP(params)
    setEvents([])
    if (reducedMotion()) {
      setPlaying(false)
      setTNow(params.tMax)
    } else restart()
  }

  const addEvent = (kind) => {
    const amount = kind === 'boom' ? p.tMax / 10 : amounts[kind]
    setEvents((list) => [...list, { id: nextId.current++, t, kind, amount }])
  }

  return (
    <div className="page">
      <header className="masthead">
        <div className="masthead-text">
          <h1>Logistic growth</h1>
          <p className="lede">
            Set how many individuals a habitat can support and how fast they reproduce. The population
            climbs an S curve and levels off at the habitat’s{' '}
            <Term id="carryingCapacity">carrying capacity</Term>. Then make it messier, like real
            nature.
          </p>
        </div>
        <Equation p={p} events={events} />
      </header>

      <main className="lab">
        <section className="panel chart-panel" aria-label="Population over time">
          <SCurveChart
            sim={sim}
            p={p}
            figures={figures}
            tNow={t}
            showExp={showExp}
            data={preset?.data}
            sceneKey={presetId}
            onScrub={scrub}
          />
        </section>

        <Controls
          p={p}
          setParam={setParam}
          setFeature={setFeature}
          presetId={presetId}
          onPreset={applyPreset}
          playback={{ playing, day: t, speed, setSpeed, onTogglePlay: togglePlay, onRestart: restart }}
          amounts={amounts}
          setAmount={(kind, v) => setAmounts((a) => ({ ...a, [kind]: v }))}
          events={events}
          now={now}
          onAddEvent={addEvent}
          onRemoveEvent={(id) => setEvents((list) => list.filter((e) => e.id !== id))}
          onClearEvents={() => setEvents([])}
          showExp={showExp}
          setShowExp={setShowExp}
          onExport={() => downloadCSV(sim, p)}
        />

        <PlatePanel n={now.n} k={now.k} rate={now.rate} day={t} unit={p.unit} />
      </main>

      <section className="analysis" aria-labelledby="analysis-title">
        <h2 id="analysis-title">
          Why the population stops at <i className="v-k">K</i>
        </h2>
        <div className="analysis-grid">
          <figure className="panel figure">
            <figcaption>
              <h3>Growth rate against population size</h3>
              <p>
                Where the curve crosses zero, births and deaths balance: an{' '}
                <Term id="equilibrium">equilibrium</Term>. Arrows show which way the population moves
                from any size. Switch on the Allee effect, harvest or predators to see the crossings
                shift.
              </p>
            </figcaption>
            <GrowthRateChart sim={sim} k={now.k} n={now.n} t={t} lagTau={p.lag.on ? p.lag.tau : 0} unit={p.unit} />
          </figure>
          <figure className="panel figure">
            <figcaption>
              <h3>Growth per individual</h3>
              <p>
                Each individual contributes less as crowding increases. The shaded gap is the growth
                lost to <Term id="resistance">environmental resistance</Term>.
              </p>
            </figcaption>
            <PerCapitaChart sim={sim} k={now.k} n={now.n} t={t} unit={p.unit} />
          </figure>
          <Analysis p={p} figures={figures} now={now} />
        </div>
      </section>

      <footer className="footnote">
        <p>
          The classic model assumes a closed population, overlapping generations, no time lags and a
          fixed carrying capacity. Each realism switch removes one of those assumptions. Parameters in
          the scenarios are illustrative unless a source is given.
        </p>
        <p className="aside">
          The assignment said to “build, test, and debug the HTML webpage.” The HTML file is 17 lines
          long. Everything else is React. We may have overdone it.
        </p>
      </footer>
    </div>
  )
}
