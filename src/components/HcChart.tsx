import { useEffect, useRef } from 'react'
import Highcharts from 'highcharts'

/**
 * Port of the legacy hc-chart wrapper (frontend/app/lib/highcharts-wrapper.js):
 * credits moved to the left, and the chart is sized to its parent element on
 * creation and on every window resize.
 */
export function HcChart({
  options,
}: {
  options: Record<string, unknown> | null
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || !options) return
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    const chart = Highcharts.chart(
      el,
      Highcharts.merge(
        {
          colors: ['#9b7bc9', '#77b3d7', '#9dcdbf', '#cba7d0', '#c4c5dc'],
          chart: {
            backgroundColor: 'transparent',
            style: {
              fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
            },
            animation: !reduceMotion,
          },
          title: {
            style: { fontSize: '16px', fontWeight: '500', color: '#4d3c61' },
          },
          legend: {
            itemStyle: {
              fontSize: '11px',
              fontWeight: '400',
              color: '#6b5b7c',
            },
          },
          tooltip: {
            backgroundColor: '#ffffff',
            borderColor: '#e2d6ed',
            shadow: false,
            borderRadius: 7,
          },
          plotOptions: {
            column: { borderRadius: 3, borderWidth: 0 },
            series: { animation: reduceMotion ? false : { duration: 350 } },
          },
        },
        options,
        {
          credits: { position: { align: 'left', x: 15 } },
        },
      ),
    )
    const fit = () => {
      chart.setSize(el.clientWidth, el.clientHeight, false)
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(el)
    return () => {
      observer.disconnect()
      chart.destroy()
    }
  }, [options])

  return (
    <div
      ref={ref}
      className="lx-stat-chart"
      style={{ width: '100%', height: 360 }}
    />
  )
}
