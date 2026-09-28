import { useLayoutEffect, useState } from 'react'

export function useSize(ref) {
  const [size, setSize] = useState({ width: 0, height: 0 })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const read = (rect) => setSize({ width: rect.width, height: rect.height })
    read(el.getBoundingClientRect())
    const observer = new ResizeObserver(([entry]) => read(entry.contentRect))
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])
  return size
}

export function useWidth(ref) {
  return useSize(ref).width
}
