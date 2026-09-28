import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { GLOSSARY } from './glossary.js'

const GAP = 8
const EDGE = 12

function Bubble({ anchor, id, children }) {
  const ref = useRef(null)
  const [pos, setPos] = useState(null)

  useLayoutEffect(() => {
    const place = () => {
      const a = anchor.getBoundingClientRect()
      const b = ref.current.getBoundingClientRect()
      const vw = document.documentElement.clientWidth
      const left = Math.min(Math.max(a.left + a.width / 2 - b.width / 2, EDGE), vw - b.width - EDGE)
      const fitsBelow = a.bottom + GAP + b.height < window.innerHeight - EDGE
      const above = !fitsBelow && a.top - GAP - b.height >= EDGE
      setPos({ left, top: above ? a.top - GAP - b.height : a.bottom + GAP, above })
    }
    place()
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [anchor])

  return createPortal(
    <div
      ref={ref}
      id={id}
      role="tooltip"
      className={`pop${pos?.above ? ' is-above' : ''}`}
      style={pos ? { left: pos.left, top: pos.top } : { left: 0, top: 0, visibility: 'hidden' }}
    >
      {children}
    </div>,
    document.body,
  )
}

function useTip() {
  const ref = useRef(null)
  const id = useId()
  const [open, setOpen] = useState(false)
  const [pinned, setPinned] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      setPinned(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const triggerProps = {
    ref,
    type: 'button',
    'aria-describedby': open ? id : undefined,
    onPointerEnter: (e) => e.pointerType === 'mouse' && setOpen(true),
    onPointerLeave: (e) => e.pointerType === 'mouse' && !pinned && setOpen(false),
    onFocus: () => setOpen(true),
    onBlur: () => {
      setOpen(false)
      setPinned(false)
    },
    onClick: () => {
      setPinned(!pinned)
      setOpen(!pinned)
    },
  }
  return { open, id, anchor: ref.current, triggerProps }
}

export function GlossaryCard({ id }) {
  const entry = GLOSSARY[id]
  return (
    <>
      <strong className="pop-title">{entry.term}</strong>
      <p>{entry.body}</p>
      {entry.example && <p className="pop-example">{entry.example}</p>}
      {entry.calc && <p className="pop-calc">{entry.calc}</p>}
    </>
  )
}

export function Term({ id, children, className = '' }) {
  const tip = useTip()
  return (
    <>
      <button className={`term ${className}`} {...tip.triggerProps}>
        {children}
      </button>
      {tip.open && tip.anchor && (
        <Bubble anchor={tip.anchor} id={tip.id}>
          <GlossaryCard id={id} />
        </Bubble>
      )}
    </>
  )
}

export function Info({ label, children }) {
  const tip = useTip()
  return (
    <>
      <button className="info" aria-label={`About ${label}`} {...tip.triggerProps}>
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
          <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <circle cx="8" cy="4.9" r="1" fill="currentColor" />
          <path d="M8 7.2v4.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
      {tip.open && tip.anchor && (
        <Bubble anchor={tip.anchor} id={tip.id}>
          {children}
        </Bubble>
      )}
    </>
  )
}
