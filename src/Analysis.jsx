import { fmt, fmtRate, sci } from './model.js'

function BigNumber({ value }) {
  const s = sci(value)
  if (s.text) return <>{s.text}</>
  return (
    <>
      {s.mantissa} × 10<sup>{s.exp}</sup>
    </>
  )
}

export default function Analysis({ K, r, N0, tMax, figures, now }) {
  const lost = now.n / now.k
  const perCapita = r * (1 - lost)
  const overshoot = figures.expAtEnd / K
  const direction =
    now.n < now.k * 0.995
      ? 'Births still outnumber deaths, so the population keeps rising toward K.'
      : now.n > now.k * 1.005
        ? 'Deaths now outnumber births, so the population is shrinking back toward K.'
        : 'Births and deaths balance, so the population holds steady.'

  return (
    <article className="panel notes">
      <div className="notes-prose">
        <h3>What the numbers say</h3>
        <p>
          Every individual starts with the same potential growth rate, <i>r</i> = {fmt(r, 2)} per
          day. Crowding cuts that in proportion to how full the habitat is. At <i>N</i> ={' '}
          {fmt(now.n)}, the environment takes away {fmt(lost * 100)}% of it, leaving{' '}
          {fmtRate(perCapita)} per individual per day. {direction}
        </p>
        <p>
          This is negative feedback. Below <i>K</i> growth is positive and pushes the population up;
          above <i>K</i> it turns negative and pulls the population down. That makes <i>K</i> a stable
          equilibrium. After a harvest or an influx, the gap to <i>K</i> shrinks by a factor of about
          e every {fmt(figures.recoveryT, 1)} days (1/<i>r</i>).
        </p>
        <p>
          Without limits, {fmt(N0)} founders growing at the same rate would number{' '}
          <BigNumber value={figures.expAtEnd} /> after {tMax} days,{' '}
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
            <dt>Fastest growth</dt>
            <dd>
              {fmtRate(figures.peakRate)} per day at <i>N</i> = {fmt(figures.halfK)}
            </dd>
          </div>
          <div>
            <dt>Inflection point</dt>
            <dd>
              {figures.inflectionT === null
                ? 'Already past it on day 0'
                : `Day ${fmt(figures.inflectionT, 1)}`}
            </dd>
          </div>
          <div>
            <dt>Early doubling time</dt>
            <dd>{fmt(figures.doublingT, 1)} days</dd>
          </div>
          <div>
            <dt>Reaches 95% of <i>K</i></dt>
            <dd>Day {fmt(figures.t95, 1)}</dd>
          </div>
          <div>
            <dt>Recovery time, 1/<i>r</i></dt>
            <dd>{fmt(figures.recoveryT, 1)} days</dd>
          </div>
        </dl>

        <h3>Try this</h3>
        <ul className="experiments">
          <li>
            Let the population settle, then harvest it. Time the recovery, double <i>r</i>, and
            repeat.
          </li>
          <li>
            Shrink the habitat while the population sits at <i>K</i>. It declines to the new limit
            instead of crashing.
          </li>
          <li>
            Move <i>K</i> while playing. The plateau follows <i>K</i>, while how quickly the curve
            rises is set mainly by <i>r</i>.
          </li>
        </ul>
      </div>
    </article>
  )
}
