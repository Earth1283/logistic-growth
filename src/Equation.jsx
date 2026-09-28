function Frac({ top, bottom }) {
  return (
    <span className="frac">
      <span className="frac-top">{top}</span>
      <span className="frac-bottom">{bottom}</span>
    </span>
  )
}

export default function Equation() {
  return (
    <p className="equation" role="img" aria-label="dN over dt equals r N times, 1 minus N over K">
      <Frac
        top={
          <>
            d<i className="v-n">N</i>
          </>
        }
        bottom={<>dt</>}
      />
      <span className="op">=</span>
      <i>r</i>
      <i className="v-n">N</i>
      <span className="paren">(</span>
      1<span className="op">−</span>
      <Frac top={<i className="v-n">N</i>} bottom={<i className="v-k">K</i>} />
      <span className="paren">)</span>
    </p>
  )
}
