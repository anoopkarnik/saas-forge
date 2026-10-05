/**
 * Appends small files to an existing ZIP without re-compressing it: the new
 * entries are stored uncompressed where the central directory began, then the
 * central directory is rewritten. Used to add secrets to a downloaded scaffold
 * on the device, so they never travel to the server.
 */

const LOCAL_HEADER = 0x04034b50;
const CENTRAL_HEADER = 0x02014b50;
const END_OF_CENTRAL_DIR = 0x06054b50;
const UTF8_FLAG = 0x0800;
// Unix "made by" so the 0600 permission bits below are honoured on extract.
const MADE_BY_UNIX = (3 << 8) | 20;
const OWNER_READ_WRITE = (0o100600 << 16) >>> 0;

let crcTable: Uint32Array | null = null;

function crc32(data: Uint8Array): number {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (const byte of data) crc = crcTable[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date: Date): { time: number; date: number } {
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

function findEndOfCentralDirectory(view: DataView): number {
  // The record is 22 bytes plus a comment of at most 65535 bytes.
  const stop = Math.max(0, view.byteLength - 22 - 0xffff);
  for (let offset = view.byteLength - 22; offset >= stop; offset--) {
    if (view.getUint32(offset, true) === END_OF_CENTRAL_DIR) return offset;
  }
  throw new Error("Not a ZIP archive");
}

export function appendFilesToZip(
  zip: Uint8Array<ArrayBuffer>,
  files: Array<{ name: string; content: string }>,
  now = new Date(),
): Uint8Array<ArrayBuffer> {
  if (files.length === 0) return zip;

  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  const eocd = findEndOfCentralDirectory(view);
  const entryCount = view.getUint16(eocd + 10, true);
  const centralSize = view.getUint32(eocd + 12, true);
  const centralOffset = view.getUint32(eocd + 16, true);
  if (entryCount === 0xffff || centralOffset === 0xffffffff) {
    throw new Error("ZIP64 archives are not supported");
  }

  const encoder = new TextEncoder();
  const { time, date } = dosDateTime(now);
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = centralOffset;

  for (const file of files) {
    const name = encoder.encode(file.name);
    const data = encoder.encode(file.content);
    const crc = crc32(data);

    const local = new Uint8Array(30 + name.length + data.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, LOCAL_HEADER, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, UTF8_FLAG, true);
    lv.setUint16(8, 0, true); // stored
    lv.setUint16(10, time, true);
    lv.setUint16(12, date, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, data.length, true);
    lv.setUint32(22, data.length, true);
    lv.setUint16(26, name.length, true);
    local.set(name, 30);
    local.set(data, 30 + name.length);

    const central = new Uint8Array(46 + name.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, CENTRAL_HEADER, true);
    cv.setUint16(4, MADE_BY_UNIX, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, UTF8_FLAG, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, time, true);
    cv.setUint16(14, date, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, name.length, true);
    cv.setUint32(38, OWNER_READ_WRITE, true);
    cv.setUint32(42, offset, true);
    central.set(name, 46);

    locals.push(local);
    centrals.push(central);
    offset += local.length;
  }

  const localsSize = locals.reduce((sum, part) => sum + part.length, 0);
  const newCentralsSize = centrals.reduce((sum, part) => sum + part.length, 0);
  const tail = zip.subarray(eocd);
  const out = new Uint8Array(centralOffset + localsSize + centralSize + newCentralsSize + tail.length);

  let cursor = 0;
  const write = (part: Uint8Array) => {
    out.set(part, cursor);
    cursor += part.length;
  };
  write(zip.subarray(0, centralOffset));
  locals.forEach(write);
  write(zip.subarray(centralOffset, centralOffset + centralSize));
  centrals.forEach(write);
  const eocdStart = cursor;
  write(tail);

  const ov = new DataView(out.buffer);
  ov.setUint16(eocdStart + 8, entryCount + files.length, true);
  ov.setUint16(eocdStart + 10, entryCount + files.length, true);
  ov.setUint32(eocdStart + 12, centralSize + newCentralsSize, true);
  ov.setUint32(eocdStart + 16, centralOffset + localsSize, true);
  return out;
}
