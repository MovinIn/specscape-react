/** Shared spectrum / frequency helpers for SpecMon & occupancy. */

/** Matches the original `printHzUnit`: 2 decimals, no space before the unit. */
export function formatHz(hz: number | null | undefined): string {
  let v = hz ?? 0
  const prefixes = ['', 'k', 'M', 'G']
  let i = 0
  while (Math.abs(v) >= 1000 && i < prefixes.length - 1) {
    v /= 1000
    i++
  }
  return `${v.toFixed(2)}${prefixes[i]}Hz`
}

/** A spectrum cell is a dB value, or null where no measurement exists. */
export type SpectrumMatrix = (number | null)[][]

function isMatrix(c: unknown): c is SpectrumMatrix {
  // Cells are frequently null (no data for that time/frequency bin), so the
  // first cell being null must NOT disqualify the matrix.
  return Array.isArray(c) && c.length > 0 && Array.isArray(c[0])
}

export function extractSpectrumMatrix(data: unknown): SpectrumMatrix | null {
  if (!data || typeof data !== 'object') return null
  if (isMatrix(data)) return data
  const obj = data as Record<string, unknown>
  for (const c of [obj.values, obj.data, obj.spectrum, obj.matrix]) {
    if (isMatrix(c)) return c
  }
  return null
}

/**
 * Column-wise mean, ignoring null cells. Returns null for a column with no
 * measurements at all, so callers can render a gap instead of a false zero.
 */
export function averageSpectrumRow(matrix: SpectrumMatrix): (number | null)[] {
  const cols = matrix[0]?.length ?? 0
  if (!cols || !matrix.length) return []
  const sums = new Array<number>(cols).fill(0)
  const counts = new Array<number>(cols).fill(0)
  for (const row of matrix) {
    for (let x = 0; x < cols; x++) {
      const v = row[x]
      if (typeof v === 'number' && Number.isFinite(v)) {
        sums[x] += v
        counts[x] += 1
      }
    }
  }
  return sums.map((s, x) => (counts[x] ? s / counts[x] : null))
}

/** Min/max across all non-null cells, for colour scaling. */
export function matrixRange(matrix: SpectrumMatrix): { min: number; max: number } {
  let min = Infinity
  let max = -Infinity
  for (const row of matrix) {
    for (const v of row) {
      if (typeof v === 'number' && Number.isFinite(v)) {
        if (v < min) min = v
        if (v > max) max = v
      }
    }
  }
  if (min === Infinity) return { min: 0, max: 1 }
  if (min === max) return { min, max: min + 1 }
  return { min, max }
}

export function toUnixSeconds(value: string): number | undefined {
  if (!value.trim()) return undefined
  if (/^\d+$/.test(value.trim())) return Number(value.trim())
  const ms = Date.parse(value)
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : undefined
}

/**
 * Deduped { id, label } options for a sensor <select>. `id` is the serial,
 * which is what the spectrum/IQ endpoints expect. Deduping matters because
 * the sensor list can repeat entries, which would otherwise produce
 * duplicate React keys.
 */
export function sensorOptions(
  sensors: { id?: number | string; serial?: number | string; name?: string }[],
): { id: string; label: string }[] {
  const seen = new Set<string>()
  const out: { id: string; label: string }[] = []
  for (const s of sensors) {
    const id = String(s.serial ?? s.id ?? '')
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push({ id, label: s.name ? `${s.name} (${id})` : id })
  }
  return out
}
