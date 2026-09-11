import { GeneratedProjectFile } from './react-code-generator';

/**
 * Lightweight, zero-dependency pure TypeScript PKZIP archive generator.
 * Emits standard ZIP format using Store (Method 0) compression.
 * Fully compatible with Windows File Explorer, macOS Archive Utility, unzip, and 7-Zip.
 */
export function createZipArchive(files: GeneratedProjectFile[]): Blob {
  const fileEntries: {
    pathBytes: Uint8Array;
    contentBytes: Uint8Array;
    crc: number;
    offset: number;
  }[] = [];

  const encoder = new TextEncoder();
  let currentOffset = 0;
  const parts: Uint8Array[] = [];

  // Write Local File Headers + File Data
  for (const file of files) {
    const pathBytes = encoder.encode(file.path.replace(/\\/g, '/'));
    const contentBytes = encoder.encode(file.content);
    const crc = computeCRC32(contentBytes);

    const localHeader = new Uint8Array(30 + pathBytes.length);
    const view = new DataView(localHeader.buffer);

    // Signature 0x04034b50 (PK\x03\x04)
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true); // Version needed to extract (2.0)
    view.setUint16(6, 0, true); // General purpose bit flag
    view.setUint16(8, 0, true); // Compression method (0 = store)
    view.setUint16(10, 0, true); // File last mod time
    view.setUint16(12, 0, true); // File last mod date
    view.setUint32(14, crc, true); // CRC-32
    view.setUint32(18, contentBytes.length, true); // Compressed size
    view.setUint32(22, contentBytes.length, true); // Uncompressed size
    view.setUint16(26, pathBytes.length, true); // File name length
    view.setUint16(28, 0, true); // Extra field length

    localHeader.set(pathBytes, 30);

    fileEntries.push({
      pathBytes,
      contentBytes,
      crc,
      offset: currentOffset,
    });

    parts.push(localHeader);
    parts.push(contentBytes);

    currentOffset += localHeader.length + contentBytes.length;
  }

  const centralDirStartOffset = currentOffset;
  let centralDirSize = 0;

  // Write Central Directory Headers
  for (const entry of fileEntries) {
    const cdHeader = new Uint8Array(46 + entry.pathBytes.length);
    const view = new DataView(cdHeader.buffer);

    // Signature 0x02014b50 (PK\x01\x02)
    view.setUint32(0, 0x02014b50, true);
    view.setUint16(4, 20, true); // Version made by
    view.setUint16(6, 20, true); // Version needed to extract
    view.setUint16(8, 0, true); // General purpose bit flag
    view.setUint16(10, 0, true); // Compression method (0 = store)
    view.setUint16(12, 0, true); // File last mod time
    view.setUint16(14, 0, true); // File last mod date
    view.setUint32(16, entry.crc, true); // CRC-32
    view.setUint32(20, entry.contentBytes.length, true); // Compressed size
    view.setUint32(24, entry.contentBytes.length, true); // Uncompressed size
    view.setUint16(28, entry.pathBytes.length, true); // File name length
    view.setUint16(30, 0, true); // Extra field length
    view.setUint16(32, 0, true); // Comment length
    view.setUint16(34, 0, true); // Disk number start
    view.setUint16(36, 0, true); // Internal file attributes
    view.setUint32(38, 0, true); // External file attributes
    view.setUint32(42, entry.offset, true); // Relative offset of local header

    cdHeader.set(entry.pathBytes, 46);

    parts.push(cdHeader);
    centralDirSize += cdHeader.length;
  }

  // End of Central Directory Record (EOCD)
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);

  // Signature 0x06054b50 (PK\x05\x06)
  eocdView.setUint32(0, 0x06054b50, true);
  eocdView.setUint16(4, 0, true); // Number of this disk
  eocdView.setUint16(6, 0, true); // Disk with central directory
  eocdView.setUint16(8, fileEntries.length, true); // Entries on this disk
  eocdView.setUint16(10, fileEntries.length, true); // Total entries
  eocdView.setUint32(12, centralDirSize, true); // Size of central directory
  eocdView.setUint32(16, centralDirStartOffset, true); // Offset of central directory
  eocdView.setUint16(20, 0, true); // Comment length

  parts.push(eocd);

  return new Blob(parts as any[], { type: 'application/zip' });
}

/**
 * Standard CRC-32 calculation for ZIP files.
 */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  return table;
})();

function computeCRC32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
