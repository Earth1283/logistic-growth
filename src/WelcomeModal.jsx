import { useEffect, useRef } from 'react'

const STORAGE_KEY = 'welcomed'

const REQUIREMENTS = [
  {
    quote: 'Select ONE ecological model.',
    reply: 'Option 3, logistic growth. We picked one model, then added six ways to break it.',
  },
  {
    quote: 'Build, test, and debug the HTML webpage.',
    reply: 'The HTML file is 17 lines long. Everything else is React.',
  },
  {
    quote: 'Design the webpage’s layout and styling, and ensure stable webpage operation.',
    reply: 'The webpage is stable. The populations are not.',
  },
  {
    quote: 'Create webpage controls to modify carrying capacity and intrinsic growth rate.',
    reply: 'Two sliders were requested. There are fourteen, plus six switches and a meteor.',
  },
  {
    quote:
      'Observe live updates to the S curve and analyse how environmental constraints stabilize population size.',
    reply: 'The charts under the main graph do the analysing live, so you can watch it happen.',
  },
]

export function hasSeenWelcome() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export default function WelcomeModal({ open, onClose }) {
  const ref = useRef(null)

  useEffect(() => {
    const dialog = ref.current
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  const close = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {}
    onClose()
  }

  return (
    <dialog
      ref={ref}
      className="welcome"
      aria-labelledby="welcome-title"
      onCancel={(e) => {
        e.preventDefault()
        close()
      }}
      onClick={(e) => e.target === ref.current && close()}
    >
      <div className="welcome-body">
        <h2 id="welcome-title" tabIndex={-1} autoFocus>
          Welcome to the logistic growth lab
        </h2>
        <p className="welcome-lede">
          A population simulator for our ecology project. Set how many individuals a habitat can
          support and how fast they breed, press play, and watch the S curve level off at the
          carrying capacity. Then switch on time lags, luck and seasons, or press buttons nature would
          never allow.
        </p>

        <h3>What the assignment asked for</h3>
        <ol className="requirements">
          {REQUIREMENTS.map((r) => (
            <li key={r.quote}>
              <span className="req-check" aria-hidden="true">
                ✓
              </span>
              <div>
                <q>{r.quote}</q>
                <p>{r.reply}</p>
              </div>
            </li>
          ))}
        </ol>

        <p className="welcome-tips">
          Hover any word with a dotted underline for a definition. Click a slider’s value to type an
          exact number.
        </p>
        <button type="button" className="btn btn-primary welcome-start" onClick={close}>
          Start exploring
        </button>
      </div>
    </dialog>
  )
}
