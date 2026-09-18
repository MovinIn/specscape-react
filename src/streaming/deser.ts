export type PsdPayload = {
  minFreq: number
  maxFreq: number
  dataLength: number
  data: number[]
}

export type DecodedMessage =
  | { id: 1; payload: PsdPayload }
  | { id: number; payload: unknown; time?: number }

/**
 * Decode binary sensor data-channel frames (Angular streaming/deser.js).
 * Accepts ArrayBuffer, Blob, or base64/utf8 string payloads.
 */
export async function decodeData(
  raw: ArrayBuffer | Blob | string | ArrayBufferView,
): Promise<DecodedMessage | null> {
  let buffer: ArrayBuffer

  if (raw instanceof ArrayBuffer) {
    buffer = raw
  } else if (ArrayBuffer.isView(raw)) {
    buffer = raw.buffer.slice(
      raw.byteOffset,
      raw.byteOffset + raw.byteLength,
    ) as ArrayBuffer
  } else if (raw instanceof Blob) {
    buffer = await raw.arrayBuffer()
  } else if (typeof raw === 'string') {
    // Try base64 first (Angular legacy path), else UTF-8 JSON control noise
    try {
      const bin = atob(raw)
      const bytes = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
      buffer = bytes.buffer
    } catch {
      return null
    }
  } else {
    return null
  }

  if (buffer.byteLength < 1) return null
  const v = new DataView(buffer)
  const id = v.getInt8(0)

  switch (id) {
    case 1: {
      if (buffer.byteLength < 21) return null
      const dataLength = v.getInt32(17, true)
      const data: number[] = []
      for (let i = 0; i < dataLength; i++) {
        data.push(v.getInt8(21 + i))
      }
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
    case 7:
    case 8:
    case 9: {
      const text = new TextDecoder('utf-8').decode(new Uint8Array(buffer, 1))
      try {
        return { id, payload: JSON.parse(text), time: Date.now() }
      } catch {
        return { id, payload: text, time: Date.now() }
      }
    }
    case 6: {
      const text = new TextDecoder('utf-8').decode(new Uint8Array(buffer, 1))
      return { id, payload: text, time: Date.now() }
    }
    default:
      return { id, payload: null }
  }
}

export function encodeCmd(cmd: Record<string, unknown>): string {
  return JSON.stringify(cmd)
}
