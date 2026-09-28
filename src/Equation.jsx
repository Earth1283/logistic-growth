import { Term } from './Tip.jsx'

function Frac({ top, bottom, inline }) {
  if (inline) {
    return (
      <span className="frac-inline">
        {top}/{bottom}
      </span>
    )
  }
  return (
    <span className="frac">
      <span className="frac-top">{top}</span>
      <span className="frac-bottom">{bottom}</span>
    </span>
  )
}

const Op = ({ children }) => <span className="op">{children}</span>
const N = ({ sub }) => (
  <i className="v-n">
    N{sub && <sub>{sub}</sub>}
  </i>
)

function GrowthTerms({ p, predators, inline }) {
  const lagged = p.lag.on ? (
    <Term id="timeLag">{inline ? <N sub="t−τ" /> : <><N />(<i>t</i>−<i>τ</i>)</>}</Term>
  ) : (
    <N sub={inline ? 't' : undefined} />
  )
  const K = p.season.on ? (
    <Term id="seasons"><i className="v-k">K</i>(<i>t</i>)</Term>
  ) : (
    <Term id="carryingCapacity"><i className="v-k">K</i></Term>
  )
  const [open, close] = inline ? ['(', ')'] : [<span className="paren">(</span>, <span className="paren">)</span>]

  return (
    <>
      <Term id="growthRate"><i>r</i></Term>
      {!inline && <N />}
      {open}
      1<Op>−</Op>
      <Frac inline={inline} top={lagged} bottom={K} />
      {close}
      {p.allee.on && (
        <>
          <Op>·</Op>
          <Term id="allee">
            <Frac inline={inline} top={<><N /><Op>−</Op><i>A</i></>} bottom={<><N /><Op>+</Op><i>A</i></>} />
          </Term>
        </>
      )}
      {p.harvest.on && (
        <>
          <Op>−</Op>
          <Term id="msy"><i>h</i>{!inline && <N />}</Term>
        </>
      )}
      {predators && (
        <>
          <Op>−</Op>
          <Term id="predatorPit">
            <Frac inline={inline} top={<><i>c</i>{!inline && <N />}</>} bottom={<><N /><Op>+</Op><i>H</i></>} />
          </Term>
        </>
      )}
    </>
  )
}

function describe(p, predators) {
  const lagged = p.lag.on ? 'N at t minus tau' : 'N'
  const K = p.season.on ? 'K of t' : 'K'
  let rhs = `r times ${p.discrete.on ? '' : 'N times '}1 minus ${lagged} over ${K}`
  if (p.allee.on) rhs += ', times N minus A over N plus A'
  if (p.harvest.on) rhs += ', minus h' + (p.discrete.on ? '' : ' N')
  if (predators) rhs += ', minus predation'
  return p.discrete.on ? `N next year equals N times e to the power of ${rhs}` : `dN over dt equals ${rhs}`
}

export default function Equation({ p, events }) {
  const predators = events.some((e) => e.kind === 'predators' && e.t <= p.tMax)
  const extras = [p.lag.on, p.season.on, p.allee.on, p.harvest.on, predators, p.discrete.on].filter(Boolean).length
  const size = Math.min(extras, 3)

  return (
    <div className="equation-wrap">
      <p className={`equation eq-size-${size}`} role="img" aria-label={describe(p, predators)}>
        {p.discrete.on ? (
          <>
            <Term id="discrete"><N sub="t+1" /></Term>
            <Op>=</Op>
            <N sub="t" />
            <i className="e-base">e</i>
            <sup className="exponent">
              <GrowthTerms p={p} predators={predators} inline />
            </sup>
          </>
        ) : (
          <>
            <Frac top={<>d<N /></>} bottom={<>d<i>t</i></>} />
            <Op>=</Op>
            <GrowthTerms p={p} predators={predators} />
          </>
        )}
      </p>
      <p className="equation-note">
        {extras === 0
          ? 'Hover any symbol to see what it means. Switching on realism features adds terms here.'
          : 'The equation grows as you switch features on. Hover a term to see what it adds.'}
      </p>
    </div>
  )
}
