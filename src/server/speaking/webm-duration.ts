export function parseWebmDurationSeconds(bytes: Uint8Array) {
  const timecodeScale =
    findUnsignedElement(bytes, [0x2a, 0xd7, 0xb1]) ?? 1_000_000;
  let maximumTimecode = -1;
  for (let offset = 0; offset <= bytes.length - 4; offset += 1) {
    if (
      bytes[offset] !== 0x1f ||
      bytes[offset + 1] !== 0x43 ||
      bytes[offset + 2] !== 0xb6 ||
      bytes[offset + 3] !== 0x75
    )
      continue;
    const clusterSize = readVint(bytes, offset + 4, true);
    if (!clusterSize) continue;
    const contentStart = offset + 4 + clusterSize.length;
    const contentEnd = clusterSize.unknown
      ? bytes.length
      : Math.min(bytes.length, contentStart + clusterSize.value);
    let clusterTimecode = 0;
    let cursor = contentStart;
    while (cursor < contentEnd) {
      const id = readVint(bytes, cursor, false);
      if (!id) break;
      const size = readVint(bytes, cursor + id.length, true);
      if (!size || size.unknown) break;
      const dataStart = cursor + id.length + size.length;
      const dataEnd = dataStart + size.value;
      if (dataEnd > contentEnd) break;
      if (id.value === 0xe7) {
        clusterTimecode = readUnsigned(bytes, dataStart, size.value);
      } else if (id.value === 0xa3 && size.value >= 4) {
        const track = readVint(bytes, dataStart, false);
        if (track && dataStart + track.length + 2 < dataEnd) {
          const relative = new DataView(
            bytes.buffer,
            bytes.byteOffset + dataStart + track.length,
            2,
          ).getInt16(0);
          maximumTimecode = Math.max(
            maximumTimecode,
            clusterTimecode + relative,
          );
        }
      }
      cursor = dataEnd;
    }
    if (!clusterSize.unknown) {
      offset = Math.max(offset, contentEnd - 1);
    }
  }
  if (maximumTimecode < 0) return undefined;
  return (maximumTimecode * timecodeScale) / 1_000_000_000 + 0.02;
}

function findUnsignedElement(bytes: Uint8Array, id: number[]) {
  for (let offset = 0; offset <= bytes.length - id.length; offset += 1) {
    if (!id.every((value, index) => bytes[offset + index] === value)) continue;
    const size = readVint(bytes, offset + id.length, true);
    if (!size || size.unknown || size.value > 8) continue;
    const dataStart = offset + id.length + size.length;
    if (dataStart + size.value <= bytes.length) {
      return readUnsigned(bytes, dataStart, size.value);
    }
  }
  return undefined;
}

function readUnsigned(bytes: Uint8Array, offset: number, length: number) {
  let value = 0;
  for (let index = 0; index < length; index += 1) {
    value = value * 256 + bytes[offset + index];
  }
  return value;
}

function readVint(bytes: Uint8Array, offset: number, sizeValue: boolean) {
  const first = bytes[offset];
  if (first === undefined || first === 0) return null;
  let length = 1;
  let marker = 0x80;
  while (length <= 8 && (first & marker) === 0) {
    length += 1;
    marker >>= 1;
  }
  if (length > 8 || offset + length > bytes.length) return null;
  let value = sizeValue ? first & (marker - 1) : first;
  for (let index = 1; index < length; index += 1) {
    value = value * 256 + bytes[offset + index];
  }
  return {
    length,
    value,
    unknown: sizeValue && value === 2 ** (7 * length) - 1,
  };
}
