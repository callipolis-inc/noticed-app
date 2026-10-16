/**
 * Two-way conversion between clean Markdown strings and visual HTML
 * for Noticed's lightweight WYSIWYG note editor.
 */

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function inlineMarkdownToHtml(text: string): string {
  if (!text) return "";
  let res = escapeHtml(text);

  // Bold: **text** or __text__
  res = res.replace(/\*\*([^*]+?)\*\*/g, "<strong>$1</strong>");
  res = res.replace(/__([^_]+?)__/g, "<strong>$1</strong>");

  // Strikethrough: ~~text~~
  res = res.replace(/~~([^~]+?)~~/g, "<del>$1</del>");

  // Inline code: `text`
  res = res.replace(/`([^`]+?)`/g, "<code>$1</code>");

  // Italic: *text* or _text_
  res = res.replace(/(^|[^*])\*([^*]+?)\*([^*]|$)/g, "$1<em>$2</em>$3");
  res = res.replace(/(^|[^_])_([^_]+?)_([^_]|$)/g, "$1<em>$2</em>$3");

  return res;
}

/**
 * Converts stored Markdown into styled HTML blocks for the editor's innerHTML.
 */
export function markdownToHtml(markdown: string): string {
  if (!markdown) return "";
  const lines = markdown.split(/\r?\n/);
  const htmlBlocks: string[] = [];
  let currentList: { type: "ul" | "ol"; items: string[] } | null = null;
  let currentQuote: string[] = [];

  const flushQuote = () => {
    if (currentQuote.length > 0) {
      htmlBlocks.push(
        `<blockquote>${currentQuote.map(inlineMarkdownToHtml).join("<br>")}</blockquote>`
      );
      currentQuote = [];
    }
  };

  const flushList = () => {
    if (currentList) {
      const tag = currentList.type === "ul" ? "ul" : "ol";
      const itemsHtml = currentList.items
        .map((it) => `<li>${inlineMarkdownToHtml(it)}</li>`)
        .join("");
      htmlBlocks.push(`<${tag}>${itemsHtml}</${tag}>`);
      currentList = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      flushQuote();
      flushList();
      continue;
    }

    if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
      flushQuote();
      flushList();
      htmlBlocks.push("<hr>");
      continue;
    }

    if (line.startsWith("> ")) {
      flushList();
      currentQuote.push(line.slice(2));
      continue;
    } else {
      flushQuote();
    }

    const bulletMatch = line.match(/^[-*+]\s+(.*)$/);
    if (bulletMatch) {
      if (!currentList || currentList.type !== "ul") {
        flushList();
        currentList = { type: "ul", items: [] };
      }
      currentList.items.push(bulletMatch[1]);
      continue;
    }

    const orderedMatch = line.match(/^\d+\.\s+(.*)$/);
    if (orderedMatch) {
      if (!currentList || currentList.type !== "ol") {
        flushList();
        currentList = { type: "ol", items: [] };
      }
      currentList.items.push(orderedMatch[1]);
      continue;
    }

    flushList();
    htmlBlocks.push(`<p>${inlineMarkdownToHtml(line)}</p>`);
  }

  flushQuote();
  flushList();

  return htmlBlocks.join("");
}

function formatInlineTag(inner: string, delimiter: string): string {
  if (!inner) return "";
  const leadingSpace = inner.match(/^\s*/)?.[0] || "";
  const trailingSpace = inner.match(/\s*$/)?.[0] || "";
  const trimmed = inner.trim();
  return trimmed
    ? `${leadingSpace}${delimiter}${trimmed}${delimiter}${trailingSpace}`
    : inner;
}

/**
 * Serializes the editor's live DOM tree back into standard Markdown.
 */
export function htmlToMarkdown(element: HTMLElement): string {
  function serializeNode(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || "";
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return "";
    }

    const el = node as HTMLElement;
    const tagName = el.tagName.toUpperCase();

    const inner = Array.from(el.childNodes).map(serializeNode).join("");

    switch (tagName) {
      case "B":
      case "STRONG":
        return formatInlineTag(inner, "**");
      case "I":
      case "EM":
        return formatInlineTag(inner, "*");
      case "S":
      case "STRIKE":
      case "DEL":
        return formatInlineTag(inner, "~~");
      case "CODE":
        return formatInlineTag(inner, "`");
      case "BR":
        return "\n";
      case "HR":
        return "\n\n---\n\n";
      case "BLOCKQUOTE": {
        const lines = inner.trim().split("\n");
        return `\n\n> ${lines.join("\n> ")}\n\n`;
      }
      case "UL":
      case "OL":
        return `\n\n${inner.trim()}\n\n`;
      case "LI": {
        const parentTag = el.parentElement?.tagName.toUpperCase();
        if (parentTag === "OL") {
          const index =
            Array.from(el.parentElement?.children || []).indexOf(el) + 1;
          return `${index}. ${inner.trim()}\n`;
        }
        return `- ${inner.trim()}\n`;
      }
      case "P":
      case "DIV":
        return `\n${inner}\n`;
      default:
        return inner;
    }
  }

  const raw = Array.from(element.childNodes).map(serializeNode).join("");
  return raw
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
