import { useEffect, useMemo, useRef, useState } from 'react'
import { buildSegments, keyFigures, sampleTrajectory, stateAt } from './model.js'
import Equation from './Equation.jsx'
import Controls from './Controls.jsx'
import SCurveChart from './SCurveChart.jsx'
import PlatePanel from './PlatePanel.jsx'
import { GrowthRateChart, PerCapitaChart } from './RateCharts.jsx'
import Analysis from './Analysis.jsx'

const PLAY_SECONDS = 10

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function App() {
  const [K, setK] = useState(600)
  const [r, setR] = useState(0.35)
  const [N0, setN0] = useState(10)
  const [tMax, setTMax] = useState(50)
  const [showExp, setShowExp] = useState(true)
  const [events, setEvents] = useState([])
  const [tNow, setTNow] = useState(() => (reducedMotion() ? 50 : 0))
  const [playing, setPlaying] = useState(() => !reducedMotion())
  const nextId = useRef(1)

  const t = Math.min(tNow, tMax)
  const segments = useMemo(() => buildSegments({ K, r, N0, events }), [K, r, N0, events])
  const points = useMemo(() => sampleTrajectory(segments, r, tMax), [segments, r, tMax])
  const figures = useMemo(() => keyFigures({ K, r, N0, tMax }), [K, r, N0, tMax])
  const now = stateAt(segments, r, t)

  useEffect(() => {
    if (!playing) return
    let frame
    let last = performance.now()
    const tick = (ts) => {
      const step = ((ts - last) / 1000) * (tMax / PLAY_SECONDS)
      last = ts
      setTNow((prev) => Math.min(tMax, Math.min(prev, tMax) + step))
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [playing, tMax])

  useEffect(() => {
    if (playing && t >= tMax) setPlaying(false)
  }, [playing, t, tMax])

  const togglePlay = () => {
    if (playing) return setPlaying(false)
    if (t >= tMax) setTNow(0)
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

  const addEvent = (kind) => {
    setEvents((list) => [...list, { id: nextId.current++, t, kind }])
  }

  const inflectionVisible =
    figures.inflectionT !== null &&
    figures.inflectionT <= tMax &&
    events.every((e) => e.t > figures.inflectionT)

  return (
    <div className="page">
      <header className="masthead">
        <div className="masthead-text">
          <h1>Logistic growth</h1>
          <p className="lede">
            Set how many individuals a habitat can support and how fast they reproduce. The
            population climbs an S curve and levels off where the environment stops it.
          </p>
        </div>
        <Equation />
      </header>

      <main className="lab">
        <section className="panel chart-panel" aria-label="Population over time">
          <SCurveChart
            points={points}
            segments={segments}
            r={r}
            N0={N0}
            tMax={tMax}
            tNow={t}
            showExp={showExp}
            events={events}
            inflection={inflectionVisible ? { t: figures.inflectionT, n: K / 2 } : null}
            onScrub={scrub}
          />
        </section>

        <Controls
          K={K}
          setK={setK}
          r={r}
          setR={setR}
          N0={N0}
          setN0={setN0}
          tMax={tMax}
          setTMax={setTMax}
          showExp={showExp}
          setShowExp={setShowExp}
          playing={playing}
          atEnd={t >= tMax}
          day={t}
          onTogglePlay={togglePlay}
          onRestart={restart}
          onAddEvent={addEvent}
          onClearEvents={() => setEvents([])}
          eventCount={events.length}
          habitatReduced={now.k < K - 0.5}
        />

        <PlatePanel n={now.n} k={now.k} rate={now.rate} day={t} />
      </main>

      <section className="analysis" aria-labelledby="analysis-title">
        <h2 id="analysis-title">Why the population stops at <i className="v-k">K</i></h2>
        <div className="analysis-grid">
          <figure className="panel figure">
            <figcaption>
              <h3>Growth rate against population size</h3>
              <p>
                The population grows fastest at half of <i>K</i>. Arrows show which way it moves
                from any size.
              </p>
            </figcaption>
            <GrowthRateChart r={r} k={now.k} n={now.n} />
          </figure>
          <figure className="panel figure">
            <figcaption>
              <h3>Growth per individual</h3>
              <p>
                Each individual contributes less as crowding increases. The shaded gap is the
                growth lost to environmental resistance.
              </p>
            </figcaption>
            <PerCapitaChart r={r} k={now.k} n={now.n} />
          </figure>
          <Analysis K={K} r={r} N0={N0} tMax={tMax} figures={figures} now={now} />
        </div>
      </section>

      <footer className="footnote">
        <p>
          The model assumes a closed population with overlapping generations, no time lags, and a
          fixed carrying capacity unless you change the habitat. Real populations often overshoot
          and oscillate around <i>K</i> because resources respond with a delay.
        </p>
      </footer>
    </div>
  )
}
