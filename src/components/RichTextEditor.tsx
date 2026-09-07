"use client";

import { useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";

// A real rich-text editor for script content (bold/italic/underline, headings, lists, quotes,
// links) built on Tiptap. Content is stored as HTML in a hidden input named "content" so it
// submits with the surrounding <form> like any other field — no client-side JS needed on submit.
export default function RichTextEditor({
  name = "content",
  initialContent = "",
}: {
  name?: string;
  initialContent?: string;
}) {
  const [html, setHtml] = useState(initialContent);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: "Write the script…" }),
    ],
    content: initialContent,
    onUpdate: ({ editor }) => setHtml(editor.getHTML()),
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[280px] rounded-b-lg border border-t-0 border-mist/40 bg-white px-3 py-2.5 text-sm text-ink focus:outline-none",
      },
    },
  });

  if (!editor) {
    return (
      <div className="min-h-[320px] animate-pulse rounded-lg border border-mist/40 bg-mist/10" />
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1 rounded-t-lg border border-mist/40 bg-paper/60 p-1.5">
        <ToolbarButton active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <span className="underline">U</span>
        </ToolbarButton>
        <ToolbarButton active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <span className="line-through">S</span>
        </ToolbarButton>
        <Divider />
        <ToolbarButton
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          H3
        </ToolbarButton>
        <Divider />
        <ToolbarButton
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          • List
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          1. List
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          &ldquo;&rdquo;
        </ToolbarButton>
        <Divider />
        <ToolbarButton
          onClick={() => {
            const url = window.prompt("Link URL");
            if (url) editor.chain().focus().setLink({ href: url }).run();
          }}
          active={editor.isActive("link")}
        >
          Link
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}>
          Clear
        </ToolbarButton>
      </div>

      <EditorContent editor={editor} />
      <input type="hidden" name={name} value={html} readOnly />
    </div>
  );
}

function ToolbarButton({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded px-2 py-1 text-xs font-semibold transition ${
        active ? "bg-ink text-paper" : "text-ink hover:bg-mist/20"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-4 w-px bg-mist/40" />;
}
