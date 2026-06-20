"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bold,
  Code,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Underline,
} from "lucide-react";

/**
 * Shared styling for editor content (and anywhere blog HTML is rendered).
 * Tailwind preflight strips heading/list styles, so we restore them via
 * arbitrary child selectors.
 */
export const BLOG_PROSE_CLASS =
  "text-sm leading-relaxed text-foreground [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mt-3 [&_h3]:text-lg [&_h3]:font-semibold [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_a]:text-tint-dark [&_a]:underline [&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-tint [&_blockquote]:pl-3 [&_blockquote]:text-muted [&_img]:my-2 [&_img]:rounded-input";

type Props = {
  value: string;
  onChange: (html: string) => void;
};

/**
 * Lightweight WYSIWYG editor producing HTML, with a raw-HTML source toggle.
 * Dependency-free (uses document.execCommand — deprecated but supported in all
 * current browsers, fine for an admin tool).
 */
export function RichTextEditor({ value, onChange }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [showSource, setShowSource] = useState(false);

  // Seed the editable area on mount and whenever we return from source mode,
  // but NOT on every keystroke (that would reset the caret).
  useEffect(() => {
    if (!showSource && ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSource]);

  function exec(command: string, arg?: string) {
    document.execCommand(command, false, arg);
    ref.current?.focus();
    if (ref.current) onChange(ref.current.innerHTML);
  }

  function addLink() {
    const url = window.prompt("Link URL (https://…)");
    if (url) exec("createLink", url);
  }

  return (
    <div className="overflow-hidden rounded-input border border-border bg-card">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-background/60 p-1.5">
        <ToolbarButton label="Bold" onClick={() => exec("bold")} disabled={showSource}>
          <Bold className="size-4" />
        </ToolbarButton>
        <ToolbarButton label="Italic" onClick={() => exec("italic")} disabled={showSource}>
          <Italic className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Underline"
          onClick={() => exec("underline")}
          disabled={showSource}
        >
          <Underline className="size-4" />
        </ToolbarButton>
        <Divider />
        <ToolbarButton
          label="Heading 2"
          onClick={() => exec("formatBlock", "<h2>")}
          disabled={showSource}
        >
          <Heading2 className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Heading 3"
          onClick={() => exec("formatBlock", "<h3>")}
          disabled={showSource}
        >
          <Heading3 className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Quote"
          onClick={() => exec("formatBlock", "<blockquote>")}
          disabled={showSource}
        >
          <Quote className="size-4" />
        </ToolbarButton>
        <Divider />
        <ToolbarButton
          label="Bullet list"
          onClick={() => exec("insertUnorderedList")}
          disabled={showSource}
        >
          <List className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Numbered list"
          onClick={() => exec("insertOrderedList")}
          disabled={showSource}
        >
          <ListOrdered className="size-4" />
        </ToolbarButton>
        <ToolbarButton label="Link" onClick={addLink} disabled={showSource}>
          <Link2 className="size-4" />
        </ToolbarButton>
        <div className="ml-auto">
          <button
            type="button"
            onClick={() => setShowSource((s) => !s)}
            aria-pressed={showSource}
            className={`inline-flex h-8 items-center gap-1.5 rounded-input px-2.5 text-xs font-medium transition ${
              showSource
                ? "bg-tint text-white"
                : "text-muted hover:bg-tint-soft hover:text-foreground"
            }`}
          >
            <Code className="size-4" aria-hidden="true" />
            HTML
          </button>
        </div>
      </div>

      {showSource ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.currentTarget.value)}
          spellCheck={false}
          rows={16}
          className="block w-full resize-y bg-card px-4 py-3 font-mono text-xs text-foreground outline-none"
          placeholder="<p>Write HTML here…</p>"
        />
      ) : (
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label="Blog content"
          onInput={() => ref.current && onChange(ref.current.innerHTML)}
          className={`min-h-64 max-h-[32rem] overflow-y-auto px-4 py-3 outline-none ${BLOG_PROSE_CLASS}`}
        />
      )}
    </div>
  );
}

function ToolbarButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="flex size-8 items-center justify-center rounded-input text-muted transition hover:bg-tint-soft hover:text-foreground disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />;
}
