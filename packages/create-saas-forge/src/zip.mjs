import fs from "node:fs";
import path from "node:path";
import { inflateRawSync } from "node:zlib";

const CENTRAL_HEADER = 0x02014b50;
const END_OF_CENTRAL_DIR = 0x06054b50;

function findEndOfCentralDirectory(buf) {
  const stop = Math.max(0, buf.length - 22 - 0xffff);
  for (let offset = buf.length - 22; offset >= stop; offset--) {
    if (buf.readUInt32LE(offset) === END_OF_CENTRAL_DIR) return offset;
  }
  throw new Error("The download is not a ZIP archive.");
}

/**
 * Extracts a ZIP into `destDir`. With `stripRoot`, the archive's single
 * top-level folder is dropped (SaaS Forge archives contain `<project>/...`).
 * Entries that would land outside `destDir` are refused.
 */
export function extractZip(buf, destDir, { stripRoot = true } = {}) {
  const eocd = findEndOfCentralDirectory(buf);
  const entryCount = buf.readUInt16LE(eocd + 10);
  let cursor = buf.readUInt32LE(eocd + 16);
  if (entryCount === 0xffff || cursor === 0xffffffff) throw new Error("ZIP64 archives are not supported.");

  const root = path.resolve(destDir);
  const written = [];
  for (let index = 0; index < entryCount; index++) {
    if (buf.readUInt32LE(cursor) !== CENTRAL_HEADER) throw new Error("Corrupt ZIP central directory.");
    const method = buf.readUInt16LE(cursor + 10);
    const compressedSize = buf.readUInt32LE(cursor + 20);
    const nameLength = buf.readUInt16LE(cursor + 28);
    const extraLength = buf.readUInt16LE(cursor + 30);
    const commentLength = buf.readUInt16LE(cursor + 32);
    const externalAttrs = buf.readUInt32LE(cursor + 38);
    const localOffset = buf.readUInt32LE(cursor + 42);
    const name = buf.toString("utf8", cursor + 46, cursor + 46 + nameLength);
    cursor += 46 + nameLength + extraLength + commentLength;

    const relative = stripRoot ? name.split("/").slice(1).join("/") : name;
    if (!relative) continue;
    const target = path.resolve(root, relative);
    if (target !== root && !target.startsWith(root + path.sep)) {
      throw new Error(`Refusing to extract "${name}" outside the target folder.`);
    }
    if (name.endsWith("/")) {
      fs.mkdirSync(target, { recursive: true });
      continue;
    }

    const localNameLength = buf.readUInt16LE(localOffset + 26);
    const localExtraLength = buf.readUInt16LE(localOffset + 28);
    const start = localOffset + 30 + localNameLength + localExtraLength;
    const data = buf.subarray(start, start + compressedSize);
    let content;
    if (method === 0) content = data;
    else if (method === 8) content = inflateRawSync(data);
    else throw new Error(`Unsupported compression method ${method} for "${name}".`);

    fs.mkdirSync(path.dirname(target), { recursive: true });
    const unixMode = (externalAttrs >>> 16) & 0o777;
    fs.writeFileSync(target, content, unixMode ? { mode: unixMode } : undefined);
    written.push(relative);
  }
  return written;
}
