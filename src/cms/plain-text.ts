/**
 * CMS.md §3: `plainText` is the text the AI learns from, a flat rendering of a document's words (titles, text
 * fields, rich text, blocks). It must never contain prices, so any line naming an amount of money is left out.
 */

/** Keys that hold ids, files, links or system values rather than words a visitor reads. */
const SKIPPED_KEYS = new Set(["id", "_status", "slug", "plainText", "blockType", "blockName", "createdAt", "updatedAt", "url", "filename", "mimeType", "code", "order", "seo"]);

/** A currency next to a number ("₹9.20", "AED 12", "12 USD", "$5"), or the word price with a number. */
const PRICE_PATTERN = /(₹|\$|€|£|\b(aed|usd|inr|sar|eur|gbp|dhs?|rs\.?)\b)\s?\d|\d[\d,.]*\s?(₹|\b(aed|usd|inr|sar|eur|gbp|dhs?)\b)|\bprice[sd]?\b[^.\n]*\d/i;

interface LexicalNode {
  type?: string;
  text?: string;
  children?: LexicalNode[];
}

/** Rich text (Lexical): text nodes joined, one line per block-level node. */
function lexicalText(node: LexicalNode): string {
  if (node.type === "text") return node.text ?? "";
  const inner = (node.children ?? []).map(lexicalText);
  return ["paragraph", "heading", "listitem", "quote", "root"].includes(node.type ?? "") ? inner.join("") + "\n" : inner.join("");
}

function collect(value: unknown, lines: string[]) {
  if (typeof value === "string") {
    if (value.trim()) lines.push(value.trim());
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collect(item, lines));
    return;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (record.root && typeof record.root === "object") {
      lines.push(lexicalText(record.root as LexicalNode).trim());
      return;
    }
    for (const [key, child] of Object.entries(record)) {
      if (!SKIPPED_KEYS.has(key)) collect(child, lines);
    }
  }
}

/** All the readable words of a document, one item per line, with money amounts removed. */
export function toPlainText(data: Record<string, unknown>): string {
  const lines: string[] = [];
  collect(data, lines);
  return lines
    .flatMap((line) => line.split("\n"))
    .map((line) => line.trim())
    .filter((line) => line && !PRICE_PATTERN.test(line))
    .join("\n");
}
