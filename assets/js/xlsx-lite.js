// Penulis & pembaca .xlsx ringan (Office Open XML) di atas JSZip.
// Cukup untuk template KemenPANRB: teks, angka, judul tebal, sel gabung (merge), lebar kolom.
const XML_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

function zipLib() {
  if (!window.JSZip) throw new Error('Pustaka ZIP belum termuat. Muat ulang halaman.');
  return window.JSZip;
}

const xmlEsc = (s) => String(s)
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function colName(i) {
  let s = ''; i += 1;
  while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); }
  return s;
}
function colIndex(letters) {
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function sheetXml({ rows, merges = [], cols = [], boldRows = 0 }) {
  const out = [];
  if (cols.length) out.push(`<cols>${cols.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>`);
  out.push('<sheetData>');
  rows.forEach((row, r) => {
    const cells = [];
    row.forEach((v, c) => {
      if (v === null || v === undefined || v === '') return;
      const ref = `${colName(c)}${r + 1}`;
      const s = r < boldRows ? ' s="1"' : '';
      if (typeof v === 'number' && Number.isFinite(v)) cells.push(`<c r="${ref}"${s}><v>${v}</v></c>`);
      else cells.push(`<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${xmlEsc(v)}</t></is></c>`);
    });
    out.push(`<row r="${r + 1}">${cells.join('')}</row>`);
  });
  out.push('</sheetData>');
  if (merges.length) out.push(`<mergeCells count="${merges.length}">${merges.map((m) => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>`);
  return `${XML_HEAD}<worksheet xmlns="${NS}" xmlns:r="${NS_R}">${out.join('')}</worksheet>`;
}

// sheets: [{ name, rows: any[][], merges?: string[], cols?: number[], boldRows?: number }]
export async function writeXlsx(sheets) {
  const JSZip = zipLib();
  const zip = new JSZip();
  const n = sheets.length;
  zip.file('[Content_Types].xml', `${XML_HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}
</Types>`);
  zip.file('_rels/.rels', `${XML_HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
  zip.file('xl/workbook.xml', `${XML_HEAD}<workbook xmlns="${NS}" xmlns:r="${NS_R}"><sheets>${sheets.map((s, i) => `<sheet name="${xmlEsc(String(s.name).slice(0, 31))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`);
  zip.file('xl/_rels/workbook.xml.rels', `${XML_HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${n + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
  zip.file('xl/styles.xml', `${XML_HEAD}<styleSheet xmlns="${NS}"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>
<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`);
  sheets.forEach((s, i) => zip.file(`xl/worksheets/sheet${i + 1}.xml`, sheetXml(s)));
  return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export async function writeXlsxBuffer(sheets) {
  const blob = await writeXlsx(sheets);
  return blob.arrayBuffer();
}

export function downloadBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
}

// Baca sheet pertama → array baris (array nilai).
export async function readXlsx(buffer) {
  const JSZip = zipLib();
  const zip = await JSZip.loadAsync(buffer);
  const parse = (txt) => new DOMParser().parseFromString(txt, 'application/xml');
  const wb = parse(await zip.file('xl/workbook.xml').async('string'));
  const first = wb.getElementsByTagName('sheet')[0];
  if (!first) throw new Error('Berkas tidak berisi sheet.');
  const rid = first.getAttribute('r:id') || first.getAttributeNS(NS_R, 'id');
  const rels = parse(await zip.file('xl/_rels/workbook.xml.rels').async('string'));
  let target = 'worksheets/sheet1.xml';
  for (const r of rels.getElementsByTagName('Relationship')) if (r.getAttribute('Id') === rid) target = r.getAttribute('Target');
  const path = target.startsWith('/') ? target.slice(1) : `xl/${target}`;
  const shared = [];
  const ssFile = zip.file('xl/sharedStrings.xml');
  if (ssFile) {
    const ss = parse(await ssFile.async('string'));
    for (const si of ss.getElementsByTagName('si')) shared.push([...si.getElementsByTagName('t')].map((t) => t.textContent).join(''));
  }
  const sh = parse(await zip.file(path).async('string'));
  const rows = [];
  for (const row of sh.getElementsByTagName('row')) {
    const r = Number(row.getAttribute('r')) - 1;
    const arr = [];
    for (const c of row.getElementsByTagName('c')) {
      const ref = c.getAttribute('r') || '';
      const ci = colIndex(ref.replace(/\d+/g, ''));
      const t = c.getAttribute('t');
      const v = c.getElementsByTagName('v')[0]?.textContent;
      let val = null;
      if (t === 's') val = shared[Number(v)] ?? null;
      else if (t === 'inlineStr') val = [...c.getElementsByTagName('t')].map((x) => x.textContent).join('');
      else if (t === 'str') val = v ?? null;
      else if (t === 'b') val = v === '1';
      else if (v !== undefined) val = Number(v);
      arr[ci] = val;
    }
    rows[r] = arr;
  }
  return rows.map((r) => r || []);
}

// Baris pertama = nama kolom.
export function rowsToObjects(rows) {
  const [head = [], ...body] = rows;
  return body.filter((r) => r.some((v) => v !== null && v !== undefined && v !== ''))
    .map((r) => Object.fromEntries(head.map((h, i) => [String(h ?? '').trim(), r[i] ?? null])));
}
