/**
 * assets/js/outbound/state-and-compression.js — State dasar, helper columnar + kompresi base64
 * Bagian 1/15 dari outbound (dulu satu file main.js). Dimuat berurutan oleh outbound.html;
 * urutan script penting. Cari fungsi lewat docs/CODE-MAP.md.
 *
 */

let globalRawData = [];
let filteredData = [];
let currentTheme = 'light';
function nz(v) { var n = Number(v); return n > 0 ? n.toLocaleString('id-ID') : '<span class="nz">–</span>'; }

let fbDb = null;
const FB_OUTBOUND_ROOT = "prDcOutboundMonitoring";

let lastKnownImportedAt = null;


function toColumnar(rows) {
  if (!rows.length) return { fields: [], length: 0, columns: {} };
  const fields = Object.keys(rows[0]);
  const columns = {};
  fields.forEach(function (f) { columns[f] = rows.map(function (r) { return r[f]; }); });
  return { fields: fields, length: rows.length, columns: columns };
}

function fromColumnar(columnar) {
  if (!columnar || !columnar.fields || !columnar.length) return [];
  const fields = columnar.fields, length = columnar.length, columns = columnar.columns;
  const rows = new Array(length);
  for (let i = 0; i < length; i++) {
    const row = {};
    for (let f = 0; f < fields.length; f++) row[fields[f]] = columns[fields[f]][i];
    rows[i] = row;
  }
  return rows;
}

function uint8ToBase64(bytes) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64ToUint8(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function compressToBase64(jsonStr) {
  const stream = new Blob([jsonStr]).stream().pipeThrough(new CompressionStream('gzip'));
  const buf = await new Response(stream).arrayBuffer();
  return uint8ToBase64(new Uint8Array(buf));
}

async function decompressFromBase64(base64) {
  const bytes = base64ToUint8(base64);
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return await new Response(stream).text();
}

