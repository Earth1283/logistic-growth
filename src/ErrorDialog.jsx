import { useEffect, useRef } from 'react'
import { UNITS } from './model.js'

export default function ErrorDialog({ info, onRestart, onClose }) {
  const ref = useRef(null)

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [info])

  if (!info) return null

  const when = `${info.t.toFixed(1)} ${UNITS[info.unit].many}`

  return (
    <dialog
      ref={ref}
      className="xp"
      aria-labelledby="xp-title"
      aria-describedby="xp-message"
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
    >
      <div className="xp-titlebar">
        <span id="xp-title">{info.name}</span>
        <button type="button" className="xp-close" aria-label="Close" onClick={onClose}>
          ×
        </button>
      </div>
      <div className="xp-body">
        <div className="xp-row">
          <span className="xp-icon" aria-hidden="true">
            ×
          </span>
          <div id="xp-message" className="xp-message">
            <p>
              <strong>population.exe has encountered a problem and needs to close.</strong> We are
              sorry for the inconvenience.
            </p>
            <p>
              If you were in the middle of something, the information you were working on might be
              lost. It is. All of it. This happened after {when}.
            </p>
            <p>
              Please tell the other populations about this problem. We have created an error report
              that you can send to help us improve nothing. We will treat this report as
              confidential and anonymous, like the individuals.
            </p>
          </div>
        </div>
        <pre className="xp-signature">
          {`Error signature
AppName: population.exe    AppVer: 0.0.0.0
ModName: carrying_capacity.dll
ModVer: ${info.k.toFixed(0)}.0.0.0    Offset: 0x00000000 (N = 0)`}
        </pre>
        <div className="xp-buttons">
          <button type="button" className="xp-btn" onClick={onRestart} autoFocus>
            Send Error Report
          </button>
          <button type="button" className="xp-btn" onClick={onClose}>
            Don’t Send
          </button>
        </div>
      </div>
    </dialog>
  )
}
