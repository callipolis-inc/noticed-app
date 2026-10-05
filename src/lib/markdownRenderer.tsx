import React from "react";

/**
 * Editorial Zero-Dependency Markdown Renderer
 * Parses and renders publication-grade markdown with high contrast and luxury theme adaptation.
 * Completely safe against XSS (pure virtual DOM rendering, 0 dangerouslySetInnerHTML).
 */

/**
 * Parses inline formatting: bold, italic, strikethrough, and inline code.
 */
export function renderInlineMarkdown(text: string): React.ReactNode {
  if (!text) return null;

  // Regex tokens:
  // 1. Bold: **text** or __text__
  // 2. Strikethrough: ~~text~~
  // 3. Inline Code: `text`
  // 4. Italic: *text* or _text_ (excluding intraword underscores)
  const tokenRegex =
    /(\*\*[^*]+?\*\*|__[^_]+?__|~~[^~]+?~~|`[^`]+?`|\*(?!\s)[^*]+?(?<!\s)\*|(?<!\w)_(?!\s)[^_]+?(?<!\s)_(?!\w))/g;

  const parts = text.split(tokenRegex);
  if (parts.length === 1) {
    return text;
  }

  return parts.map((part, index) => {
    if (!part) return null;

    // Bold: **text** or __text__
    if (
      (part.startsWith("**") && part.endsWith("**") && part.length > 4) ||
      (part.startsWith("__") && part.endsWith("__") && part.length > 4)
    ) {
      const inner = part.slice(2, -2);
      return (
        <strong
          key={index}
          className="font-bold text-[var(--text-primary)]"
        >
          {renderInlineMarkdown(inner)}
        </strong>
      );
    }

    // Strikethrough: ~~text~~
    if (part.startsWith("~~") && part.endsWith("~~") && part.length > 4) {
      const inner = part.slice(2, -2);
      return (
        <del key={index} className="line-through opacity-60">
          {renderInlineMarkdown(inner)}
        </del>
      );
    }

    // Inline Code: `text`
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      const inner = part.slice(1, -1);
      return (
        <code
          key={index}
          className="px-1.5 py-0.5 rounded-md bg-[var(--text-primary)]/8 font-mono text-[0.88em] text-[var(--text-primary)] border border-[var(--glass-border)]/50"
        >
          {inner}
        </code>
      );
    }

    // Italic: *text* or _text_
    if (
      (part.startsWith("*") && part.endsWith("*") && part.length > 2) ||
      (part.startsWith("_") && part.endsWith("_") && part.length > 2)
    ) {
      const inner = part.slice(1, -1);
      return (
        <em key={index} className="italic font-serif">
          {renderInlineMarkdown(inner)}
        </em>
      );
    }

    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

interface BlockElement {
  type: "paragraph" | "blockquote" | "bullet_list" | "ordered_list" | "divider";
  items?: string[];
  text?: string;
}

/**
 * Parses multi-line text into block elements (paragraphs, blockquotes, lists, dividers).
 */
export function parseMarkdownBlocks(rawText: string): BlockElement[] {
  if (!rawText) return [];

  const lines = rawText.split("\n");
  const blocks: BlockElement[] = [];
  let currentList: { type: "bullet_list" | "ordered_list"; items: string[] } | null = null;
  let currentQuote: string[] | null = null;

  const flushList = () => {
    if (currentList) {
      blocks.push({
        type: currentList.type,
        items: [...currentList.items],
      });
      currentList = null;
    }
  };

  const flushQuote = () => {
    if (currentQuote) {
      blocks.push({
        type: "blockquote",
        text: currentQuote.join("\n"),
      });
      currentQuote = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Horizontal Divider: --- or *** or ___
    if (/^(---|___|\*\*\*)$/.test(trimmed)) {
      flushList();
      flushQuote();
      blocks.push({ type: "divider" });
      continue;
    }

    // 2. Blockquote: > text
    if (line.startsWith("> ") || line === ">") {
      flushList();
      const quoteContent = line.startsWith("> ") ? line.slice(2) : "";
      if (!currentQuote) currentQuote = [];
      currentQuote.push(quoteContent);
      continue;
    } else {
      flushQuote();
    }

    // 3. Bullet List: - item or * item
    const bulletMatch = line.match(/^(\s*)[-*]\s+(.*)$/);
    if (bulletMatch) {
      if (currentList && currentList.type !== "bullet_list") {
        flushList();
      }
      if (!currentList) {
        currentList = { type: "bullet_list", items: [] };
      }
      currentList.items.push(bulletMatch[2]);
      continue;
    }

    // 4. Ordered List: 1. item
    const orderedMatch = line.match(/^(\s*)\d+\.\s+(.*)$/);
    if (orderedMatch) {
      if (currentList && currentList.type !== "ordered_list") {
        flushList();
      }
      if (!currentList) {
        currentList = { type: "ordered_list", items: [] };
      }
      currentList.items.push(orderedMatch[2]);
      continue;
    }

    // Not a list item
    flushList();

    // 5. Standard paragraph line
    blocks.push({
      type: "paragraph",
      text: line,
    });
  }

  flushList();
  flushQuote();

  return blocks;
}

interface EditorialMarkdownProps {
  content: string;
  className?: string;
}

/**
 * Full Editorial Markdown component for rendering notes and previewing in editor.
 */
export function EditorialMarkdown({
  content,
  className = "",
}: EditorialMarkdownProps) {
  if (!content) return null;

  const blocks = parseMarkdownBlocks(content);

  return (
    <div className={`editorial-markdown-flow space-y-1.5 ${className}`}>
      {blocks.map((block, idx) => {
        if (block.type === "divider") {
          return (
            <hr
              key={idx}
              className="my-4 border-0 h-px bg-[var(--glass-border)] opacity-60 w-full"
            />
          );
        }

        if (block.type === "blockquote") {
          return (
            <blockquote
              key={idx}
              className="my-2.5 pl-3.5 py-0.5 border-l-2 border-[var(--text-primary)]/35 text-[var(--text-secondary)] italic font-serif leading-relaxed"
            >
              {block.text?.split("\n").map((l, qIdx) => (
                <div key={qIdx}>{renderInlineMarkdown(l)}</div>
              ))}
            </blockquote>
          );
        }

        if (block.type === "bullet_list" && block.items) {
          return (
            <ul key={idx} className="my-2 space-y-1 pl-1">
              {block.items.map((item, itemIdx) => (
                <li key={itemIdx} className="flex items-start gap-2">
                  <span className="text-[var(--text-tertiary)] select-none text-xs leading-relaxed">
                    •
                  </span>
                  <div className="flex-1 min-w-0">
                    {renderInlineMarkdown(item)}
                  </div>
                </li>
              ))}
            </ul>
          );
        }

        if (block.type === "ordered_list" && block.items) {
          return (
            <ol key={idx} className="my-2 space-y-1 pl-1">
              {block.items.map((item, itemIdx) => (
                <li key={itemIdx} className="flex items-start gap-2">
                  <span className="font-mono text-[11px] text-[var(--text-tertiary)] select-none pt-0.5 w-4 shrink-0 text-right">
                    {itemIdx + 1}.
                  </span>
                  <div className="flex-1 min-w-0">
                    {renderInlineMarkdown(item)}
                  </div>
                </li>
              ))}
            </ol>
          );
        }

        // Paragraph
        return (
          <div key={idx} className="min-h-[1.25em]">
            {block.text ? renderInlineMarkdown(block.text) : <>&nbsp;</>}
          </div>
        );
      })}
    </div>
  );
}
