import { UNITS, fmt, fmtRate, sci } from './model.js'
import { Term } from './Tip.jsx'

function BigNumber({ value }) {
  const s = sci(value)
  if (s.text) return <>{s.text}</>
  return (
    <>
      {s.mantissa} × 10<sup>{s.exp}</sup>
    </>
  )
}

function Outcome({ outcome, u }) {
  switch (outcome.kind) {
    case 'extinct':
      return <>Dies out around {u.one} {fmt(outcome.t, 1)}</>
    case 'climbing':
      return <>Still climbing when time runs out</>
    case 'settles':
      return <>Settles near {fmt(outcome.n)}</>
    default:
      return <>Keeps swinging, {fmt(outcome.min)} to {fmt(outcome.max)}</>
  }
}

export default function Analysis({ p, figures, now }) {
  const u = UNITS[p.unit]
  const lost = now.n / now.k
  const overshoot = figures.expAtEnd / p.K
  const direction =
    now.n <= 0
      ? 'The population is gone. Only migrants can bring it back.'
      : now.rate > 0.01
        ? 'Births still outnumber deaths, so the population keeps rising.'
        : now.rate < -0.01
          ? 'Deaths now outnumber births, so the population is shrinking.'
          : 'Births and deaths balance, so the population holds steady.'
  const multi = figures.runCount > 1

  return (
    <article className="panel notes">
      <div className="notes-prose">
        <h3>What the numbers say</h3>
        <p>
          Every individual starts with the same potential growth rate, <i>r</i> = {fmt(p.r, 2)} per{' '}
          {u.one}. Crowding cuts that in proportion to how full the habitat is. Right now <i>N</i> ={' '}
          {fmt(now.n)}, the habitat is {fmt(lost * 100)}% full, and each individual adds{' '}
          {fmtRate(now.perCapita)} per {u.one} <Term id="perCapita">per capita</Term>. {direction}
        </p>
        <p>
          This is <Term id="negativeFeedback">negative feedback</Term>. Below <i>K</i> growth pushes
          the population up; above <i>K</i> it pulls the population down. That makes <i>K</i> a
          stable <Term id="equilibrium">equilibrium</Term>, as long as the feedback is quick.
          {p.lag.on && (
            <>
              {' '}With a <Term id="timeLag">time lag</Term> of {fmt(p.lag.tau, 1)} {u.many}, the
              brake arrives late, so the population <Term id="overshoot">overshoots</Term>.
            </>
          )}
          {p.discrete.on && (
            <>
              {' '}Breeding in one yearly pulse is the most extreme lag of all. With <i>r</i> above 2
              the population can never settle, and above about 2.7 it turns to{' '}
              <Term id="chaos">chaos</Term>.
            </>
          )}
        </p>
        {multi && (
          <p>
            Chance matters most when numbers are small. Of {figures.runCount} runs with identical rules,{' '}
            {figures.extinctRuns === 0
              ? 'all survived'
              : `${figures.extinctRuns} died out`}{' '}
            by {u.one} {p.tMax}. That randomness is <Term id="stochasticity">demographic stochasticity</Term>,
            and it is why conservation biologists worry about tiny populations.
          </p>
        )}
        <p>
          Without limits, {fmt(p.N0)} founders growing at the same rate would number{' '}
          <BigNumber value={figures.expAtEnd} /> after {p.tMax} {u.many},{' '}
          {overshoot >= 1 ? (
            <>
              about <BigNumber value={overshoot} /> times what this habitat can support.
            </>
          ) : (
            <>still below the carrying capacity. Lengthen the time shown to see it pass.</>
          )}
        </p>
      </div>

      <div className="notes-side">
        <dl className="figures">
          <div>
            <dt>Long run{multi && ', without chance'}</dt>
            <dd><Outcome outcome={figures.outcome} u={u} /></dd>
          </div>
          <div>
            <dt>Peak population</dt>
            <dd>
              {fmt(figures.peak)} at {u.one} {fmt(figures.peakT, 1)}
            </dd>
          </div>
          <div>
            <dt>
              Fastest growth (<Term id="inflection">inflection</Term>)
            </dt>
            <dd>
              {figures.fastestT === null
                ? 'Never grows'
                : `${fmtRate(figures.fastestRate)} per ${u.one}, ${u.one} ${fmt(figures.fastestT, 1)}`}
            </dd>
          </div>
          <div>
            <dt>First reaches 95% of <i>K</i></dt>
            <dd>{figures.reach95T === null ? 'Never' : `${u.one} ${fmt(figures.reach95T, 1)}`}</dd>
          </div>
          <div>
            <dt>Early doubling time</dt>
            <dd>
              {fmt(figures.doublingT, 1)} {u.many}
            </dd>
          </div>
          {multi && (
            <div>
              <dt>Runs that died out</dt>
              <dd>
                {figures.extinctRuns} of {figures.runCount}
              </dd>
            </div>
          )}
        </dl>

        <h3>Try this</h3>
        <ul className="experiments">
          <li>
            Let the population settle, then harvest it. Time the recovery, double <i>r</i>, and
            repeat.
          </li>
          <li>
            Turn on the time lag and drag the delay slider through each colored band. Watch the
            smooth S turn into waves, then into boom and bust.
          </li>
          <li>
            Load <em>Rare species released</em> and reroll a few times. How often does the group
            survive? Now raise the starting population.
          </li>
          <li>
            Load <em>Fishery under pressure</em>. Find the effort that gives the biggest catch that
            lasts, then push past it.
          </li>
        </ul>
      </div>
    </article>
  )
}
