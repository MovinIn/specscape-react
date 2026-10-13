// Highcharts 6.2.0 (pinned to the legacy app's version) ships no typings.
// Only the surface this app uses is declared.
declare module 'highcharts' {
  export interface Chart {
    setSize(width?: number | null, height?: number | null, animation?: boolean): void
    destroy(): void
  }
  const Highcharts: {
    chart(renderTo: HTMLElement, options: Record<string, unknown>): Chart
  }
  export default Highcharts
}
