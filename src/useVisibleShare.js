import { useEffect, useState } from 'react'

const THRESHOLDS = Array.from({ length: 101 }, (_, i) => i / 100)

export function useVisibleShare(ref, share) {
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.intersectionRatio >= share),
      { threshold: THRESHOLDS },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref, share])
  return visible
}
