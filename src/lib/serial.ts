/** MAC `aa:bb:cc:dd:ee:ff` → integer serial (Angular `mac2serial`). */
export function mac2serial(input: string): number | '' {
  const value = (input || '').toString()
  if (
    !value.match(
      /^[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}$/,
    )
  ) {
    return ''
  }
  return parseInt(value.replace(/:/g, ''), 16)
}

/** Integer serial → MAC hex string (Angular `serial2mac`). */
export function serial2mac(serial: number | string): string {
  const n = typeof serial === 'string' ? parseInt(serial, 10) : serial
  if (!Number.isFinite(n)) return ''
  let hex = Math.trunc(n).toString(16).padStart(12, '0')
  if (hex.length > 12) hex = hex.slice(-12)
  const parts: string[] = []
  for (let i = 0; i < 12; i += 2) parts.push(hex.slice(i, i + 2))
  return parts.join(':')
}

export function parseSmartSerial(input: string): number | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  const fromMac = mac2serial(trimmed)
  if (fromMac !== '') return fromMac
  const asInt = Number(trimmed)
  return Number.isFinite(asInt) ? asInt : null
}
