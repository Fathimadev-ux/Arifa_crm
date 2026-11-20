// Markdown -> Word (.docx) for the hand-off and test documents (FRONTEND_GUIDE, the live test report).
//
//   NODE_PATH=<folder>/node_modules node docs/handoff/build/md2docx.js <in.md> <out.docx> ["Title on the cover"]
//
// Needs the `docx` npm package outside the repo (README.md: npm install --prefix "$TEMP/kxdocx" docx@9).
// Understands what these documents use: # to #### headings, paragraphs with **bold** and `code`, bullet and
// numbered lists (one level of nesting), pipe tables, fenced code blocks, --- (a thin rule) and PNG images
// (`![caption](file.png)`, found next to the .md or in its `results/` folder). Landscape is
// not needed: wide tables shrink their font.

const fs = require("fs");
const path = require("path");
const {
  AlignmentType, BorderStyle, Document, Footer, HeadingLevel, ImageRun, LevelFormat, Packer, PageNumber,
  Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, WidthType,
} = require("docx");

const [, , inFile, outFile, title] = process.argv;
if (!inFile || !outFile) {
  console.error("usage: node md2docx.js <in.md> <out.docx> [title]");
  process.exit(2);
}
const FONT = "Arial";
const MONO = "Consolas";
const ACCENT = "1F4E79";
const PAGE_W = 11906;
const MARGIN = 1134;
const W = PAGE_W - 2 * MARGIN;
const border = { style: BorderStyle.SINGLE, size: 4, color: "BFBFBF" };
const borders = { top: border, bottom: border, left: border, right: border };

function runs(text, opts = {}) {
  return String(text)
    .split(/(\*\*[^*]+\*\*|`[^`]+`)/)
    .filter(Boolean)
    .map((part) => {
      if (part.startsWith("**") && part.endsWith("**")) return new TextRun({ text: part.slice(2, -2), bold: true, font: FONT, ...opts });
      if (part.startsWith("`") && part.endsWith("`")) return new TextRun({ text: part.slice(1, -1), font: MONO, ...opts, size: (opts.size || 20) - 1 });
      return new TextRun({ text: part.replace(/\*([^*\s][^*]*)\*/g, "$1"), font: FONT, ...opts });
    });
}

function table(lines) {
  const rows = lines
    .filter((l) => !/^\|\s*:?-{2,}/.test(l))
    .map((l) => l.trim().replace(/^\||\|$/g, "").split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, "|")));
  const cols = Math.max(...rows.map((r) => r.length));
  const size = cols >= 4 ? 16 : 18;
  const colW = Math.floor(W / cols);
  return new Table({
    width: { size: W, type: WidthType.DXA },
    columnWidths: Array(cols).fill(colW),
    rows: rows.map((r, i) => new TableRow({
      tableHeader: i === 0,
      children: Array.from({ length: cols }, (_, c) => new TableCell({
        borders,
        width: { size: colW, type: WidthType.DXA },
        shading: i === 0 ? { fill: "DCE6F1", type: ShadingType.CLEAR, color: "auto" } : undefined,
        margins: { top: 50, bottom: 50, left: 80, right: 80 },
        children: [new Paragraph({ children: runs(r[c] || "", { size, bold: i === 0 }) })],
      })),
    })),
  });
}

const md = fs.readFileSync(inFile, "utf8").replace(/\r\n/g, "\n");
const lines = md.split("\n");
const out = [];
if (title) {
  out.push(new Paragraph({ spacing: { before: 2400, after: 200 }, children: [new TextRun({ text: title, bold: true, size: 44, font: FONT, color: ACCENT })] }));
  out.push(new Paragraph({ spacing: { after: 600 }, children: [new TextRun({ text: `Kairox platform · ${new Date().toISOString().slice(0, 10)}`, size: 22, font: FONT, color: "595959" })] }));
}
const H = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4];
for (let i = 0; i < lines.length; i += 1) {
  const line = lines[i];
  if (!line.trim()) continue;
  if (line.startsWith("```")) {
    const code = [];
    for (i += 1; i < lines.length && !lines[i].startsWith("```"); i += 1) code.push(lines[i]);
    for (const c of code) {
      out.push(new Paragraph({ shading: { fill: "F2F2F2", type: ShadingType.CLEAR, color: "auto" }, spacing: { after: 0 },
        children: [new TextRun({ text: c || " ", font: MONO, size: 16 })] }));
    }
    out.push(new Paragraph({ children: [] }));
    continue;
  }
  const img = /^!\[([^\]]*)\]\(([^)]+)\)\s*$/.exec(line.trim());
  if (img) {
    const base = path.dirname(inFile);
    const file = [path.join(base, img[2]), path.join(base, "results", img[2])].find((f) => fs.existsSync(f));
    if (file) {
      const data = fs.readFileSync(file);
      const w = data.readUInt32BE(16);
      const h = data.readUInt32BE(20);
      const width = Math.min(600, w);
      out.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ type: "png", data, transformation: { width, height: Math.round((h * width) / w) } })] }));
      out.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: runs(img[1], { size: 18, italics: true, color: "595959" }) }));
    }
    continue;
  }
  const h = /^(#{1,4})\s+(.*)$/.exec(line);
  if (h) {
    out.push(new Paragraph({ heading: H[h[1].length], spacing: { before: 240, after: 120 }, children: runs(h[2], { color: ACCENT }) }));
    continue;
  }
  if (line.trim().startsWith("|")) {
    const block = [];
    for (; i < lines.length && lines[i].trim().startsWith("|"); i += 1) block.push(lines[i]);
    i -= 1;
    out.push(table(block));
    out.push(new Paragraph({ children: [] }));
    continue;
  }
  if (/^---+\s*$/.test(line)) {
    out.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "BFBFBF", space: 1 } }, children: [] }));
    continue;
  }
  const bullet = /^(\s*)[*-]\s+(.*)$/.exec(line);
  const number = /^(\s*)\d+[.)]\s+(.*)$/.exec(line);
  if (bullet || number) {
    const m = bullet || number;
    let text = m[2];
    for (; i + 1 < lines.length && /^\s{2,}\S/.test(lines[i + 1]) && !/^\s*([*-]|\d+[.)])\s/.test(lines[i + 1]); i += 1) {
      text += " " + lines[i + 1].trim();
    }
    const level = m[1].length >= 2 ? 1 : 0;
    out.push(new Paragraph({ numbering: { reference: bullet ? "bullets" : "numbers", level }, spacing: { after: 60 }, children: runs(text, { size: 20 }) }));
    continue;
  }
  let text = line.trim();
  for (; i + 1 < lines.length && lines[i + 1].trim() && !/^(#|\||```|\s*[*-]\s|\s*\d+[.)]\s|---)/.test(lines[i + 1]); i += 1) {
    text += " " + lines[i + 1].trim();
  }
  out.push(new Paragraph({ spacing: { after: 120 }, children: runs(text, { size: 20 }) }));
}

const doc = new Document({
  styles: { default: { document: { run: { font: FONT, size: 20 } } } },
  numbering: {
    config: [
      { reference: "bullets", levels: [0, 1].map((l) => ({ level: l, format: LevelFormat.BULLET, text: l ? "–" : "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360 * (l + 1), hanging: 260 } } } })) },
      { reference: "numbers", levels: [0, 1].map((l) => ({ level: l, format: LevelFormat.DECIMAL, text: `%${l + 1}.`, alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360 * (l + 1), hanging: 300 } } } })) },
    ],
  },
  sections: [{
    properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ children: [PageNumber.CURRENT], size: 16, font: FONT, color: "7F7F7F" })] })] }) },
    children: out,
  }],
});
Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(outFile, buf);
  console.log(`wrote ${path.basename(outFile)} (${buf.length} bytes, ${out.length} blocks)`);
});
