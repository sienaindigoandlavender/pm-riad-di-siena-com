// Notes: plain text with light formatting, [[links]] between notes and #tags.

export type Note = {
  id: string;
  title: string;
  body: string;
  project_id: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
};

export const LINK_RE = /\[\[([^\]\n]{1,120})\]\]/g;
const TAG_RE = /(^|\s)#([\p{L}\p{N}_-]{2,40})/gu;

export function tagsOf(body: string): string[] {
  const out = new Set<string>();
  for (const m of body.matchAll(TAG_RE)) out.add((m[2] ?? "").toLowerCase());
  return Array.from(out).slice(0, 30);
}

export function linksOf(body: string): string[] {
  return Array.from(body.matchAll(LINK_RE), (m) => (m[1] ?? "").trim());
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/**
 * A tiny, safe Markdown subset → HTML: # headings, **bold**, *italic*, `code`,
 * - lists, [ ] / [x] checkboxes, > quotes, links, [[note links]] and #tags.
 * Everything is escaped first, so nothing typed can run as HTML.
 */
export function renderNote(body: string, resolve: (title: string) => string | null): string {
  const inline = (s: string) =>
    esc(s)
      .replace(/\[\[([^\]\n]{1,120})\]\]/g, (_m, t: string) => {
        const id = resolve(t.trim());
        return `<a class="note-link${id ? "" : " missing"}" data-title="${esc(t.trim())}" href="${id ? `/notes/${id}` : "#"}">${t}</a>`;
      })
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noreferrer">$1</a>')
      .replace(/(^|\s)#([\p{L}\p{N}_-]{2,40})/gu, '$1<span class="note-tag">#$2</span>');

  const out: string[] = [];
  let list: "ul" | null = null;
  const close = () => {
    if (list) out.push(`</${list}>`);
    list = null;
  };
  for (const raw of body.split("\n")) {
    const line = raw.trimEnd();
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    const li = line.match(/^\s*[-*]\s+(\[( |x)\]\s+)?(.*)$/i);
    if (h) {
      close();
      const lvl = (h[1] ?? "#").length + 1;
      out.push(`<h${lvl}>${inline(h[2] ?? "")}</h${lvl}>`);
    } else if (li) {
      if (!list) {
        out.push("<ul>");
        list = "ul";
      }
      const box = li[1] ? `<span class="note-box${(li[2] ?? "").toLowerCase() === "x" ? " on" : ""}"></span>` : "";
      out.push(`<li${li[1] ? ' class="check"' : ""}>${box}${inline(li[3] ?? "")}</li>`);
    } else if (line.startsWith(">")) {
      close();
      out.push(`<blockquote>${inline(line.replace(/^>\s?/, ""))}</blockquote>`);
    } else if (!line.trim()) {
      close();
    } else {
      close();
      out.push(`<p>${inline(line)}</p>`);
    }
  }
  close();
  return out.join("");
}
