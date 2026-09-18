/** Shared spectrum / frequency helpers for SpecMon & occupancy. */

export function formatHz(hz: number): string {
  if (hz >= 1e9) return `${(hz / 1e9).toFixed(2)} GHz`
  if (hz >= 1e6) return `${(hz / 1e6).toFixed(2)} MHz`
  if (hz >= 1e3) return `${(hz / 1e3).toFixed(1)} kHz`
  return `${hz} Hz`
}

export function extractSpectrumMatrix(data: unknown): number[][] | null {
  if (!data || typeof data !== 'object') return null
  const obj = data as Record<string, unknown>
  for (const c of [obj.values, obj.data, obj.spectrum, obj.matrix]) {
    if (
      Array.isArray(c) &&
      c.length > 0 &&
      Array.isArray(c[0]) &&
      typeof (c as number[][])[0][0] === 'number'
    ) {
      return c as number[][]
    }
  }
  if (Array.isArray(data) && Array.isArray((data as unknown[])[0])) {
    return data as number[][]
  }
  return null
}

export function averageSpectrumRow(matrix: number[][]): number[] {
  const cols = matrix[0]?.length ?? 0
  const out = new Array(cols).fill(0)
  if (!cols || !matrix.length) return out
  for (const row of matrix) {
    for (let x = 0; x < cols; x++) out[x] += row[x] ?? 0
  }
  for (let x = 0; x < cols; x++) out[x] /= matrix.length
  return out
}

export function toUnixSeconds(value: string): number | undefined {
  if (!value.trim()) return undefined
  if (/^\d+$/.test(value.trim())) return Number(value.trim())
  const ms = Date.parse(value)
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : undefined
}
