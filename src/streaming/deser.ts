/**
 * Serialize/deserialize sensor data-channel frames (port of streaming/deser.js).
 *
 * The sensor sends each frame as base64 text (delivered as a string or a
 * Blob holding that text). Decoded bytes: [id: int8][payload...].
 *   1       PSD: minFreq f64 LE, maxFreq f64 LE, length i32 LE, data int8[]
 *   2,3,4,5 ADS-B / AIS aggregated / AIS raw / ACARS: UTF-8 JSON
 *   6       LTE status: UTF-8 text
 *   7       LTE results: UTF-8 JSON
 *   8,9     IoT / LoRa: UTF-8 text
 *   10      WiFi beacons: UTF-8 JSON
 */

export type PsdPayload = {
  minFreq: number
  maxFreq: number
  dataLength: number
  data: number[]
}

export type DecodedMessage =
  | { id: 1; payload: PsdPayload }
  | { id: number; payload: unknown; time?: number }

function base64ToBytes(b64: string): Uint8Array | null {
  try {
    const bin = atob(b64)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return bytes
  } catch {
    return null
  }
}

async function toText(raw: string | Blob | ArrayBuffer | ArrayBufferView): Promise<string> {
  if (typeof raw === 'string') return raw
  if (raw instanceof Blob) return raw.text()
  const view = raw instanceof ArrayBuffer ? new Uint8Array(raw) : new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength)
  return new TextDecoder('utf8').decode(view)
}

export async function decodeData(
  raw: string | Blob | ArrayBuffer | ArrayBufferView | null | undefined,
): Promise<DecodedMessage | null> {
  if (raw == null) return null
  const text = await toText(raw)
  if (text.length < 1) return null
  const arr = base64ToBytes(text)
  if (!arr || arr.length < 1) return null

  const v = new DataView(arr.buffer)
  const id = v.getInt8(0)
  const rest = () => new TextDecoder('utf8').decode(arr.slice(1, arr.length))

  switch (id) {
    case 1: {
      const dataLength = v.getInt32(17, true)
      const data = new Array<number>(dataLength)
      for (let i = 0; i < dataLength; i++) data[i] = v.getInt8(21 + i)
      return {
        id: 1,
        payload: {
          minFreq: v.getFloat64(1, true),
          maxFreq: v.getFloat64(9, true),
          dataLength,
          data,
        },
      }
    }
    case 2:
    case 3:
    case 4:
    case 5:
      return { id, payload: JSON.parse(rest()) }
    case 6:
    case 8:
    case 9:
      return { id, time: Date.now(), payload: rest() }
    case 7:
    case 10:
      return { id, time: Date.now(), payload: JSON.parse(rest()) }
    default:
      return null
  }
}

export function encodeCmd(cmd: Record<string, unknown>): string {
  return JSON.stringify(cmd)
}
