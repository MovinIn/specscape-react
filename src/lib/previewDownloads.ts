/** Small, valid sample recordings for local preview; production uses the API download links. */
export function sampleIq(): Uint8Array {
  const bytes = new Uint8Array(1024 * 8)
  const view = new DataView(bytes.buffer)
  for (let i = 0; i < 1024; i++) {
    const phase = (i * Math.PI * 2) / 32
    view.setFloat32(i * 8, Math.sin(phase) * 0.7, true)
    view.setFloat32(i * 8 + 4, Math.cos(phase) * 0.7, true)
  }
  return bytes
}
function long(value: number): number[] {
  let remaining = value * 2
  const bytes: number[] = []
  do {
    const byte = remaining & 127
    remaining = Math.floor(remaining / 128)
    bytes.push(byte | (remaining ? 128 : 0))
  } while (remaining)
  return bytes
}
const utf8 = (value: string) => [...new TextEncoder().encode(value)]
const binary = (value: number[]) => [...long(value.length), ...value]
/** Apache Avro object container: float I/Q records, uncompressed blocks. */
export function sampleAvro(): Uint8Array {
  const schema = JSON.stringify({
    type: 'record',
    name: 'PreviewIqSample',
    fields: [
      { name: 'i', type: 'float' },
      { name: 'q', type: 'float' },
    ],
  })
  const sync = [...crypto.getRandomValues(new Uint8Array(16))]
  const data = [...sampleIq()]
  return new Uint8Array([
    79,
    98,
    106,
    1,
    ...long(2),
    ...binary(utf8('avro.schema')),
    ...binary(utf8(schema)),
    ...binary(utf8('avro.codec')),
    ...binary(utf8('null')),
    0,
    ...sync,
    ...long(1024),
    ...long(data.length),
    ...data,
    ...sync,
  ])
}
export function downloadSampleIq(format: 'raw' | 'avro', id: string) {
  const bytes = format === 'avro' ? sampleAvro() : sampleIq()
  const url = URL.createObjectURL(
    new Blob([bytes as BlobPart], { type: 'application/octet-stream' }),
  )
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = id + '-preview.' + (format === 'raw' ? 'cf32' : 'avro')
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function sampleAudio(): Uint8Array {
  const rate = 22050,
    frames = rate * 3
  const bytes = new Uint8Array(44 + frames * 2)
  const view = new DataView(bytes.buffer)
  const text = (at: number, value: string) =>
    [...value].forEach((character, i) =>
      view.setUint8(at + i, character.charCodeAt(0)),
    )
  text(0, 'RIFF')
  view.setUint32(4, bytes.length - 8, true)
  text(8, 'WAVE')
  text(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, rate, true)
  view.setUint32(28, rate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  text(36, 'data')
  view.setUint32(40, frames * 2, true)
  for (let i = 0; i < frames; i++)
    view.setInt16(
      44 + i * 2,
      Math.sin((i * Math.PI * 2 * 440) / rate) *
        900 *
        (0.5 + 0.5 * Math.sin((i / rate) * Math.PI)),
      true,
    )
  return bytes
}
