import { EVENT_KINDS, UNITS, fmt } from './model.js'
import { saveBlob } from './exportCsv.js'

const PAGE = { w: 595, h: 842, margin: 56 }
const MONO = 'F1'
const MONO_BOLD = 'F2'
const HEAD = 'F3'
const INK = [0.08, 0.08, 0.08]
const RED = [0.75, 0.1, 0.1]
const GREY = [0.4, 0.4, 0.4]
const STAMP_ANGLE = (18 * Math.PI) / 180

const CHARGES = {
  harvest: 'Culling in the First Degree',
  migrants: 'Aiding and Abetting Population Growth',
  shrink: 'Unlicensed Habitat Demolition',
  restore: 'Suspicious Remorse',
  meteor: 'Orbital Homicide',
  plague: 'Deployment of a Biological Weapon',
  predators: 'Releasing the Hounds',
  tribbles: 'Tribble Endangerment',
  mood: 'Aggravated Mood Killing',
  clones: 'Unauthorized Cloning (Duplicate Counts Apply)',
  timewarp: 'Tampering With Time',
  fertilizer: 'Eutrophication With Intent',
  iceAge: 'Climate Misconduct',
  farming: 'Inventing Agriculture, Where It All Went Wrong',
}

const FEATURES = {
  lag: 'Time lag (the delay made everything worse)',
  chance: 'Random chance (luck, but bad)',
  allee: 'Allee effect (too lonely to survive)',
  season: 'Seasons (winter was involved)',
  discrete: 'Discrete generations (no overlap, no mercy)',
  harvest: 'Constant harvest (the slow kind of crime)',
}

const ascii = (s) =>
  s
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[−–—]/g, '-')
    .replace(/×/g, 'x')
    .replace(/…/g, '...')
    .replace(/[^\x20-\x7e]/g, '?')

const escapeText = (s) => ascii(s).replace(/[\\()]/g, '\\$&')
const num = (x) => Number(x.toFixed(2))

function createDoc() {
  const pages = []
  let ops
  let y

  const newPage = () => {
    ops = []
    pages.push(ops)
    y = PAGE.h - PAGE.margin
  }
  newPage()

  const text = (x, baseline, str, font, size, color) =>
    ops.push(
      `BT /${font} ${size} Tf ${color.join(' ')} rg ${num(x)} ${num(baseline)} Td (${escapeText(str)}) Tj ET`,
    )

  const line = (str, { font = MONO, size = 10, color = INK, indent = 0 } = {}) => {
    const height = size * 1.45
    if (y - height < PAGE.margin) newPage()
    y -= height
    text(PAGE.margin + indent, y, str, font, size, color)
  }

  const wrap = (str, maxChars) => {
    const lines = []
    let current = ''
    for (const word of ascii(str).split(/\s+/)) {
      if (current && current.length + word.length + 1 > maxChars) {
        lines.push(current)
        current = word
      } else current = current ? `${current} ${word}` : word
    }
    if (current) lines.push(current)
    return lines
  }

  const paragraph = (str, { size = 10, indent = 0, ...rest } = {}) => {
    const width = PAGE.w - 2 * PAGE.margin - indent
    wrap(str, Math.floor(width / (0.6 * size))).forEach((l) => line(l, { size, indent, ...rest }))
  }

  const space = (h) => {
    y -= h
  }

  const rule = () => {
    space(6)
    ops.push(`${GREY.join(' ')} RG 0.5 w ${PAGE.margin} ${num(y)} m ${PAGE.w - PAGE.margin} ${num(y)} l S`)
    space(6)
  }

  const heading = (str) => {
    space(10)
    line(str, { font: MONO_BOLD, size: 12, color: RED })
    rule()
  }

  const stamp = (str, x, baseline) => {
    const c = Math.cos(STAMP_ANGLE)
    const s = Math.sin(STAMP_ANGLE)
    pages[0].push(
      `q ${num(c)} ${num(s)} ${num(-s)} ${num(c)} ${x} ${baseline} cm`,
      `${RED.join(' ')} RG 3 w -10 -12 ${str.length * 25 + 12} 52 re S`,
      `BT /${HEAD} 38 Tf ${RED.join(' ')} rg 0 0 Td (${escapeText(str)}) Tj ET Q`,
    )
  }

  const serialize = () => {
    pages.forEach((p, i) =>
      p.push(
        `BT /${MONO} 8 Tf ${GREY.join(' ')} rg ${PAGE.margin} 28 Td (population.exe crime report   page ${i + 1} of ${pages.length}   sent to nobody) Tj ET`,
      ),
    )
    const objects = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      `<< /Type /Pages /Kids [${pages.map((_, i) => `${6 + 2 * i} 0 R`).join(' ')}] /Count ${pages.length} >>`,
      ...['Courier', 'Courier-Bold', 'Helvetica-Bold'].map(
        (name) => `<< /Type /Font /Subtype /Type1 /BaseFont /${name} /Encoding /WinAnsiEncoding >>`,
      ),
    ]
    pages.forEach((p, i) => {
      const body = p.join('\n')
      objects.push(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE.w} ${PAGE.h}] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents ${7 + 2 * i} 0 R >>`,
        `<< /Length ${body.length} >>\nstream\n${body}\nendstream`,
      )
    })
    let out = '%PDF-1.4\n'
    const offsets = objects.map((obj, i) => {
      const at = out.length
      out += `${i + 1} 0 obj\n${obj}\nendobj\n`
      return at
    })
    const xrefAt = out.length
    out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
    offsets.forEach((o) => {
      out += `${String(o).padStart(10, '0')} 00000 n \n`
    })
    out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF`
    return new Blob([out], { type: 'application/pdf' })
  }

  return { line, paragraph, space, rule, heading, stamp, serialize }
}

export function buildCrimeReport({ p, events, extinction, peak }) {
  const doc = createDoc()
  const unit = UNITS[p.unit]
  const when = (t) => `${unit.one} ${fmt(t, 1)}`
  const caseNo = `POP-${String(p.seed).padStart(4, '0')}-${String(events.length).padStart(3, '0')}`
  const active = Object.keys(FEATURES).filter((key) => p[key]?.on)

  doc.line('OFFICIAL ERROR REPORT', { font: HEAD, size: 20 })
  doc.line('Department of Population Services, Extinctions Division', { size: 8, color: GREY })
  doc.line(`Case no. ${caseNo}`, { size: 8, color: GREY })
  doc.stamp('EXTINCT', 365, 745)
  doc.space(30)

  doc.heading('1. SUMMARY OF INCIDENT')
  doc.paragraph(
    `Subject: ${extinction.name}. The population began with ${fmt(p.N0)} individuals in a habitat that could support ${fmt(p.K)}. It peaked at ${fmt(Math.max(peak, p.N0))}. At ${when(extinction.t)} it reached zero and stayed there.`,
  )
  doc.space(6)
  doc.paragraph('Survivors: 0.  Witnesses: 0.  Individuals who understood what was happening: 0.')

  doc.heading('2. THE ACCUSED')
  doc.paragraph('Name: You.')
  doc.paragraph('Occupation: Person who pressed the buttons.')
  doc.paragraph(`Intrinsic growth rate chosen: ${p.r}. The accused knew exactly what they were doing.`)

  doc.heading('3. CHARGES')
  if (events.length === 0) {
    doc.line('COUNT 1: NEGLIGENT SELECTION OF PARAMETERS', { font: MONO_BOLD })
    doc.paragraph(
      `No events were triggered. The population was killed by the settings alone: K = ${fmt(p.K)}, r = ${p.r}, starting from ${fmt(p.N0)}. Nobody forced the accused to choose those numbers.`,
      { indent: 14 },
    )
    if (p.allee.on) {
      doc.space(4)
      doc.paragraph(
        `The Allee threshold (A = ${fmt(p.allee.A)}) was set above the founding population. The court finds this premeditated.`,
        { indent: 14 },
      )
    }
  } else {
    events.forEach((e, i) => {
      const kind = EVENT_KINDS[e.kind]
      doc.line(`COUNT ${i + 1}: ${(CHARGES[e.kind] ?? kind.short).toUpperCase()}`, { font: MONO_BOLD })
      doc.paragraph(`Committed at ${when(e.t)}. Exhibit A-${i + 1}.`, { indent: 14, color: GREY })
      doc.paragraph(kind.what(e.amount, p.unit), { indent: 14 })
      doc.space(8)
    })
  }

  doc.heading('4. ACCOMPLICES')
  if (active.length === 0) doc.paragraph('None. The accused acted alone.')
  else active.forEach((key) => doc.paragraph(`- ${FEATURES[key]}`))

  doc.heading('5. VERDICT')
  doc.line('GUILTY', { font: HEAD, size: 28, color: RED })
  doc.space(4)
  const remaining = Math.max(0, p.tMax - extinction.t)
  doc.paragraph(
    `Sentence: ${fmt(remaining, 1)} ${unit.many} of watching a flat line at zero, to be served concurrently with the rest of the simulation.`,
  )
  doc.space(4)
  doc.paragraph('Appeal: denied. Press Restart.')
  doc.space(18)
  doc.paragraph(
    'This report has been sent to nobody. No individuals were harmed after it was written, because none remained.',
    { size: 8, color: GREY },
  )

  return doc.serialize()
}

export function downloadCrimeReport(data) {
  saveBlob(buildCrimeReport(data), `${data.extinction.name.toLowerCase().replace(/\W+/g, '-')}-crime-report.pdf`)
}
