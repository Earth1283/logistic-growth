import { useEffect, useMemo, useRef, useState } from 'react'
import { figures as computeFigures, simulate, stateAt, stepAt } from './sim.js'
import { EVENT_KINDS } from './model.js'
import { DEFAULT_PARAMS, PRESETS, paramsFor, randomWorld } from './presets.js'
import { downloadCSV } from './exportCsv.js'
import Equation from './Equation.jsx'
import Controls from './Controls.jsx'
import ChartToolbar from './ChartToolbar.jsx'
import SCurveChart from './SCurveChart.jsx'
import PlatePanel from './PlatePanel.jsx'
import { GrowthRateChart, PerCapitaChart } from './RateCharts.jsx'
import Analysis from './Analysis.jsx'
import ThemeSwitch from './ThemeSwitch.jsx'
import WelcomeModal, { hasSeenWelcome } from './WelcomeModal.jsx'
import { Term } from './Tip.jsx'
import Narrator from './Narrator.jsx'
import { narrate, peakCurve } from './narrator.js'
import { playEventClip, useSoundsReady } from './sounds.js'
import { useSound } from './useSound.js'
import { useExtinction } from './useExtinction.js'
import ErrorDialog from './ErrorDialog.jsx'
import SoundLoader from './SoundLoader.jsx'
import PlayerBar from './PlayerBar.jsx'
import { useVisibleShare } from './useVisibleShare.js'

const PLAY_SECONDS = 20

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function App() {
  const [p, setP] = useState(DEFAULT_PARAMS)
  const [presetId, setPresetId] = useState('classic')
  const [sceneKey, setSceneKey] = useState('classic')
  const [showExp, setShowExp] = useState(true)
  const [events, setEvents] = useState([])
  const [amounts, setAmounts] = useState({ harvest: 0.6, migrants: 300, shrink: 0.4 })
  const [speed, setSpeed] = useState(1)
  const [sound, setSound] = useState(false)
  const [narratorOn, setNarratorOn] = useState(false)
  const [welcomeOpen, setWelcomeOpen] = useState(() => !hasSeenWelcome())
  const [tNow, setTNow] = useState(() => (reducedMotion() ? DEFAULT_PARAMS.tMax : 0))
  const [playing, setPlaying] = useState(false)
  const [extinction, setExtinction] = useState(null)
  const soundsReady = useSoundsReady()
  const autoStarted = useRef(false)
  const nextId = useRef(1)
  const chartRef = useRef(null)
  const chartVisible = useVisibleShare(chartRef, 0.2)

  const t = Math.min(tNow, p.tMax)
  const atEnd = t >= p.tMax
  const sim = useMemo(() => simulate(p, events), [p, events])
  const figures = useMemo(() => computeFigures(sim, p), [sim, p])
  const now = stateAt(sim, p, t)
  const preset = PRESETS.find((x) => x.id === presetId)
  const peaks = useMemo(() => peakCurve(sim), [sim])
  const line = narrate({ now, t, p, events, sceneKey, peak: peaks[Math.min(peaks.length - 1, Math.floor(stepAt(sim, t)))] })

  useSound({ enabled: sound, playing, n: now.n, k: now.k, t })
  useExtinction({
    playing,
    n: now.n,
    t,
    onExtinct: () => {
      setPlaying(false)
      setExtinction({ t, k: now.k, unit: p.unit, name: preset?.name ?? 'Untitled population' })
    },
  })

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
    if (autoStarted.current || !soundsReady || welcomeOpen || reducedMotion()) return
    autoStarted.current = true
    if (tNow === 0 && !playing) setPlaying(true)
  }, [soundsReady, welcomeOpen, tNow, playing])

  useEffect(() => {
    if (playing && atEnd) setPlaying(false)
  }, [playing, atEnd])

  const togglePlay = () => {
    if (playing) return setPlaying(false)
    if (atEnd) setTNow(0)
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

  const loadWorld = (params, id) => {
    setPresetId(id)
    setSceneKey(`${id}-${params.seed}`)
    setP(params)
    setEvents([])
    if (reducedMotion()) {
      setPlaying(false)
      setTNow(params.tMax)
    } else restart()
  }

  const closeWelcome = () => {
    setWelcomeOpen(false)
  }

  const addEvent = (kind) => {
    const duration = EVENT_KINDS[kind].duration
    const amount = duration ? duration(p.tMax, p.r) : amounts[kind]
    setEvents((list) => [...list, { id: nextId.current++, t, kind, amount }])
    if (sound) playEventClip(kind)
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
        <div className="masthead-side">
          <ThemeSwitch />
          <Equation p={p} events={events} />
        </div>
      </header>

      <div className="workspace">
        <Controls
          p={p}
          setParam={setParam}
          setFeature={setFeature}
          presetId={presetId}
          onPreset={(x) => loadWorld(paramsFor(x), x.id)}
          onRandomWorld={() => loadWorld(randomWorld(), 'random')}
          amounts={amounts}
          setAmount={(kind, v) => setAmounts((a) => ({ ...a, [kind]: v }))}
          events={events}
          now={now}
          atEnd={atEnd}
          onAddEvent={addEvent}
          onRemoveEvent={(id) => setEvents((list) => list.filter((e) => e.id !== id))}
          onClearEvents={() => setEvents([])}
          showExp={showExp}
          setShowExp={setShowExp}
        />

        <main className="main">
          <section ref={chartRef} className="panel chart-panel" aria-label="Population over time">
            <ChartToolbar
              playing={playing}
              atEnd={atEnd}
              day={t}
              unit={p.unit}
              speed={speed}
              setSpeed={setSpeed}
              onTogglePlay={togglePlay}
              onRestart={restart}
              onExport={() => downloadCSV(sim, p)}
              sound={sound}
              onToggleSound={() => setSound((on) => !on)}
              narrator={narratorOn}
              onToggleNarrator={() => setNarratorOn((on) => !on)}
            />
            {narratorOn && <Narrator line={line} />}
            <SCurveChart
              sim={sim}
              p={p}
              figures={figures}
              tNow={t}
              showExp={showExp}
              data={preset?.data}
              sceneKey={sceneKey}
              onScrub={scrub}
            />
          </section>

          <PlatePanel n={now.n} k={now.k} rate={now.rate} day={t} unit={p.unit} />

          <section className="analysis" aria-labelledby="analysis-title">
            <h2 id="analysis-title">
              Why the population stops at <i className="v-k">K</i>
            </h2>
            <figure className="panel figure">
              <figcaption>
                <h3>Growth rate against population size</h3>
                <p>
                  Where the curve crosses zero, births and deaths balance: an{' '}
                  <Term id="equilibrium">equilibrium</Term>. Arrows show which way the population
                  moves from any size. Switch on the Allee effect, harvest or predators to see the
                  crossings shift.
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
          </section>

          <footer className="footnote">
            <p>
              The classic model assumes a closed population, overlapping generations, no time lags and
              a fixed carrying capacity. Each realism switch removes one of those assumptions.
              Parameters in the scenarios are illustrative unless a source is given.
            </p>
            <p className="aside">
              The assignment said to “build, test, and debug the HTML webpage.” The HTML file is 17
              lines long. Everything else is React. We may have overdone it.{' '}
              <button type="button" className="btn-link" onClick={() => setWelcomeOpen(true)}>
                About this project
              </button>
            </p>
          </footer>
        </main>
      </div>
      <WelcomeModal open={welcomeOpen} onClose={closeWelcome} />
      <ErrorDialog
        info={extinction}
        onClose={() => setExtinction(null)}
        onRestart={() => {
          setExtinction(null)
          restart()
        }}
      />
      <PlayerBar
        hidden={chartVisible}
        playing={playing}
        atEnd={atEnd}
        t={t}
        tMax={p.tMax}
        unit={p.unit}
        now={now}
        events={events}
        onTogglePlay={togglePlay}
        onScrub={scrub}
      />
      <SoundLoader />
    </div>
  )
}
