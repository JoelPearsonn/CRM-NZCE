import { crc32, deflateRawSync, inflateRawSync } from "node:zlib";

const LOCAL = 0x04034b50;
const CENTRAL = 0x02014b50;
const EOCD = 0x06054b50;

export type ZipEntry = { name: string; data: Buffer };

function findEocd(input: Buffer) {
  const start = Math.max(0, input.length - 22 - 0xffff);
  for (let i = input.length - 22; i >= start; i -= 1) {
    if (input.readUInt32LE(i) === EOCD) return i;
  }
  throw new Error("Not a zip file.");
}

export function readZip(input: Buffer): ZipEntry[] {
  const eocd = findEocd(input);
  const count = input.readUInt16LE(eocd + 10);
  let pos = input.readUInt32LE(eocd + 16);
  const entries: ZipEntry[] = [];
  for (let i = 0; i < count; i += 1) {
    if (input.readUInt32LE(pos) !== CENTRAL) throw new Error("Bad zip central directory.");
    const method = input.readUInt16LE(pos + 10);
    const compSize = input.readUInt32LE(pos + 20);
    const nameLen = input.readUInt16LE(pos + 28);
    const extraLen = input.readUInt16LE(pos + 30);
    const commentLen = input.readUInt16LE(pos + 32);
    const localOff = input.readUInt32LE(pos + 42);
    const name = input.subarray(pos + 46, pos + 46 + nameLen).toString("utf8");
    pos += 46 + nameLen + extraLen + commentLen;

    if (input.readUInt32LE(localOff) !== LOCAL) throw new Error(`Bad local header for ${name}.`);
    const localNameLen = input.readUInt16LE(localOff + 26);
    const localExtraLen = input.readUInt16LE(localOff + 28);
    const dataStart = localOff + 30 + localNameLen + localExtraLen;
    const compressed = input.subarray(dataStart, dataStart + compSize);
    const data =
      method === 0
        ? Buffer.from(compressed)
        : method === 8
          ? Buffer.from(inflateRawSync(compressed))
          : (() => {
              throw new Error(`Unsupported zip method ${method} for ${name}.`);
            })();
    entries.push({ name, data });
  }
  return entries;
}

export function writeZip(entries: ZipEntry[]): Buffer {
  const chunks: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    const raw = entry.data;
    const compressed = deflateRawSync(raw);
    const crc = Number(crc32(raw)) >>> 0;
    const local = Buffer.alloc(30 + name.length);
    local.writeUInt32LE(LOCAL, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(name.length, 26);
    name.copy(local, 30);
    chunks.push(local, compressed);

    const central = Buffer.alloc(46 + name.length);
    central.writeUInt32LE(CENTRAL, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    name.copy(central, 46);
    centrals.push(central);
    offset += local.length + compressed.length;
  }
  const centralBuf = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(EOCD, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...chunks, centralBuf, eocd]);
}
