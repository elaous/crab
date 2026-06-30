/**
 * Binary serialization for CrabCAD scene files.
 *
 * Schema contract: src/lib/io/scene.capnp
 *
 * Wire format: MessagePack binary encoding of the schema-defined structures.
 * MessagePack is used as the binary layer because capnpc-ts (the Cap'n Proto
 * TypeScript code generator) is currently incompatible with TypeScript 6.
 * The `.capnp` schema remains the authoritative type definition; migrating
 * to native Cap'n Proto binary encoding is straightforward once the tooling
 * is updated. The external contract (field names, versioning, magic bytes)
 * matches the schema exactly.
 *
 * File layout:
 *   [4 bytes] magic: 0x43524142 ("CRAB")
 *   [2 bytes] format version: uint16 little-endian (= 1)
 *   [2 bytes] flags: bit 0 = debugJsonPresent
 *   [4 bytes] payload length: uint32 little-endian
 *   [N bytes] MessagePack-encoded SceneFile payload
 *   [M bytes] optional: null-terminated UTF-8 JSON (when debugJsonPresent)
 *
 * Debug mode (DEBUG_SERIALIZATION = true, on by default):
 *   JSON is embedded in the file after the binary payload.
 *   This allows round-tripping via the JSON deserializer during development.
 */

import { pack, unpack } from 'msgpackr'
import type { SceneData } from '../../types'

// ─── Config ─────────────────────────────────────────────────────────────────

export const DEBUG_SERIALIZATION = true   // set false for production builds

// ─── Magic + constants ───────────────────────────────────────────────────────

const MAGIC = new Uint8Array([0x43, 0x52, 0x41, 0x42])   // "CRAB"
const FORMAT_VERSION = 1
const FLAG_DEBUG_JSON = 0x0001

// ─── Encode ─────────────────────────────────────────────────────────────────

export function serializeBinary(data: SceneData): Uint8Array {
  const payload = pack(data)
  const jsonBytes = DEBUG_SERIALIZATION
    ? new TextEncoder().encode(JSON.stringify(data, null, 2) + '\0')
    : new Uint8Array(0)

  const flags = DEBUG_SERIALIZATION ? FLAG_DEBUG_JSON : 0
  const header = new ArrayBuffer(12)
  const dv = new DataView(header)
  dv.setUint8(0, MAGIC[0]); dv.setUint8(1, MAGIC[1])
  dv.setUint8(2, MAGIC[2]); dv.setUint8(3, MAGIC[3])
  dv.setUint16(4, FORMAT_VERSION, true)
  dv.setUint16(6, flags, true)
  dv.setUint32(8, payload.byteLength, true)

  const out = new Uint8Array(12 + payload.byteLength + jsonBytes.byteLength)
  out.set(new Uint8Array(header), 0)
  out.set(payload, 12)
  if (jsonBytes.byteLength) out.set(jsonBytes, 12 + payload.byteLength)
  return out
}

// ─── Decode ─────────────────────────────────────────────────────────────────

export function deserializeBinary(bytes: Uint8Array): SceneData {
  // Validate magic
  if (bytes[0] !== MAGIC[0] || bytes[1] !== MAGIC[1] ||
      bytes[2] !== MAGIC[2] || bytes[3] !== MAGIC[3]) {
    throw new Error('Not a CrabCAD binary file (bad magic)')
  }
  const dv = new DataView(bytes.buffer, bytes.byteOffset)
  const flags = dv.getUint16(6, true)
  const payloadLen = dv.getUint32(8, true)
  const payload = bytes.slice(12, 12 + payloadLen)

  // In debug mode the JSON sidecar can be used for human-readable inspection,
  // but we always decode from the binary payload for correctness.
  void flags
  return unpack(payload) as SceneData
}

// ─── File download helpers ───────────────────────────────────────────────────

export async function downloadBinary(data: SceneData, filename: string): Promise<void> {
  const bytes = serializeBinary(data)
  const name = filename.endsWith('.crab') ? filename : filename + '.crab'

  if (window.electronAPI) {
    await window.electronAPI.saveFile(name, bytes)
    return
  }

  // Browser: trigger a download
  const buf = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(buf).set(bytes)
  const blob = new Blob([buf], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

export async function loadBinaryFromFile(): Promise<SceneData | null> {
  if (window.electronAPI) {
    const result = await window.electronAPI.openFile()
    if (!result) return null
    const bytes = new Uint8Array(result.bytes)
    try {
      if (bytes[0] === MAGIC[0] && bytes[1] === MAGIC[1] &&
          bytes[2] === MAGIC[2] && bytes[3] === MAGIC[3]) {
        return deserializeBinary(bytes)
      }
      return JSON.parse(new TextDecoder().decode(bytes)) as SceneData
    } catch {
      alert('Invalid or corrupt CrabCAD file')
      return null
    }
  }

  return new Promise(resolve => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.crab,.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) { resolve(null); return }

      const arrayBuffer = await file.arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)

      try {
        if (bytes[0] === MAGIC[0] && bytes[1] === MAGIC[1] &&
            bytes[2] === MAGIC[2] && bytes[3] === MAGIC[3]) {
          resolve(deserializeBinary(bytes))
        } else {
          const text = new TextDecoder().decode(bytes)
          resolve(JSON.parse(text) as SceneData)
        }
      } catch {
        alert('Invalid or corrupt CrabCAD file')
        resolve(null)
      }
    }
    input.click()
  })
}
