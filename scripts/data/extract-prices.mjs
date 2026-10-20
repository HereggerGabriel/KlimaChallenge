// Extracts ÖBB standard-ticket prices from the official "Relationspreise" PDFs
// (ÖBB Open Data, CC BY 4.0) into a compact CSV.
//
// Reference price used by the app: standard ticket ("ST VP"), 2nd class,
// sales channel "Online/Mobile", bought on the day of travel ("000"), i.e. the
// normal full fare without advance booking. The 180–015 day advance price is
// kept as well for comparison.
//
// Usage: node scripts/data/extract-prices.mjs data-raw/v.pdf [more.pdf ...]
// Output: data-raw/prices/<name>.csv  (from,to,via,price_same_day,price_advance)

import fs from "node:fs";
import path from "node:path";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const HEADER_START = "Von Name";
const WANTED_CLASS_CHANNEL = "2 Online/Mobile";

// Column order after "Klasse Vertriebsart": ST VP 000, ST VP 014-001, ST VP 180-015, ...
const COL_SAME_DAY = 0;
const COL_ADVANCE = 2;

const parseEuro = (s) => Number(String(s).replace(",", "."));

async function extract(file) {
  const outDir = path.join("data-raw", "prices");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, path.basename(file, ".pdf") + ".csv");
  const out = fs.createWriteStream(outFile);
  out.write("from,to,via,price_same_day,price_advance\n");

  const doc = await getDocument({ url: file, disableFontFace: true, verbosity: 0 }).promise;
  const started = Date.now();
  let rows = 0;

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const { items } = await page.getTextContent();
    page.cleanup();

    // Group text items into lines by y coordinate, then order by x.
    const lines = new Map();
    for (const it of items) {
      if (!it.str.trim()) continue;
      const y = Math.round(it.transform[5]);
      if (!lines.has(y)) lines.set(y, []);
      lines.get(y).push({ x: it.transform[4], s: it.str.trim() });
    }

    for (const parts of lines.values()) {
      const cells = parts.sort((a, b) => a.x - b.x).map((c) => c.s);
      if (cells[0] === HEADER_START) continue;
      // Expected: from, to, [via], "class channel", prices... The via column is
      // empty for direct routes, so locate the class/channel cell instead of
      // relying on a fixed position.
      const classIdx = cells.indexOf(WANTED_CLASS_CHANNEL);
      if (classIdx < 2 || cells.length < classIdx + 3) continue;
      const via = cells.slice(2, classIdx).join(" ");
      const prices = cells.slice(classIdx + 1);
      const sameDay = parseEuro(prices[COL_SAME_DAY]);
      const advance = parseEuro(prices[COL_ADVANCE]);
      if (!Number.isFinite(sameDay)) continue;
      const q = (s) => `"${s.replace(/"/g, '""')}"`;
      out.write(`${q(cells[0])},${q(cells[1])},${q(via)},${sameDay},${advance}\n`);
      rows++;
    }

    if (p % 250 === 0 || p === doc.numPages) {
      const secs = Math.round((Date.now() - started) / 1000);
      console.log(`${path.basename(file)}: page ${p}/${doc.numPages}, ${rows} rows, ${secs}s`);
    }
  }

  await new Promise((resolve) => out.end(resolve));
  await doc.destroy();
  console.log(`done ${file} -> ${outFile} (${rows} rows)`);
}

for (const file of process.argv.slice(2)) {
  await extract(file);
}
