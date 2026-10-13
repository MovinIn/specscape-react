import { useEffect, useRef } from 'react'
import Highcharts from 'highcharts'

/**
 * Port of the legacy hc-chart wrapper (frontend/app/lib/highcharts-wrapper.js):
 * credits moved to the left, and the chart is sized to its parent element on
 * creation and on every window resize.
 */
export function HcChart({ options }: { options: Record<string, unknown> | null }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || !options) return
    const chart = Highcharts.chart(el, {
      ...options,
      credits: { position: { align: 'left', x: 15 } },
    })
    const fit = () => {
      const parent = el.parentElement
      if (parent) chart.setSize(parent.offsetWidth, parent.offsetHeight)
    }
    fit()
    window.addEventListener('resize', fit)
    return () => {
      window.removeEventListener('resize', fit)
      chart.destroy()
    }
  }, [options])

  // <hc-chart> was an unstyled custom element, i.e. inline
  return <div ref={ref} style={{ display: 'inline' }} />
}
