"use client";

import { useEditor, EditorContent, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { useEffect, useRef } from "react";

export const EDITOR_EXTENSIONS = [StarterKit, Underline];

interface DocEditorProps {
  initialContent: JSONContent;
  editable: boolean;
  onSave: (content: JSONContent) => void;
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`rounded px-2 py-1 text-sm font-medium hover:bg-zinc-200 disabled:opacity-40 ${
        active ? "bg-zinc-200 text-zinc-900" : "text-zinc-600"
      }`}
    >
      {children}
    </button>
  );
}

export default function DocEditor({ initialContent, editable, onSave }: DocEditorProps) {
  const editor = useEditor({
    extensions: EDITOR_EXTENSIONS,
    content: initialContent,
    editable,
    immediatelyRender: false,
  });

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!editor || !editable) return;

    const handler = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        onSave(editor.getJSON());
      }, 1200);
    };

    editor.on("update", handler);
    return () => {
      editor.off("update", handler);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, editable]);

  if (!editor) return null;

  return (
    <div className="flex flex-1 flex-col">
      {editable && (
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1 border-b border-zinc-200 bg-white px-3 py-2">
          <ToolbarButton
            label="Bold"
            active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <span className="font-bold">B</span>
          </ToolbarButton>
          <ToolbarButton
            label="Italic"
            active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <span className="italic">I</span>
          </ToolbarButton>
          <ToolbarButton
            label="Underline"
            active={editor.isActive("underline")}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <span className="underline">U</span>
          </ToolbarButton>
          <span className="mx-1 h-5 w-px bg-zinc-200" />
          <ToolbarButton
            label="Heading 1"
            active={editor.isActive("heading", { level: 1 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          >
            H1
          </ToolbarButton>
          <ToolbarButton
            label="Heading 2"
            active={editor.isActive("heading", { level: 2 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            H2
          </ToolbarButton>
          <ToolbarButton
            label="Paragraph"
            active={editor.isActive("paragraph")}
            onClick={() => editor.chain().focus().setParagraph().run()}
          >
            P
          </ToolbarButton>
          <span className="mx-1 h-5 w-px bg-zinc-200" />
          <ToolbarButton
            label="Bullet list"
            active={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            • List
          </ToolbarButton>
          <ToolbarButton
            label="Numbered list"
            active={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            1. List
          </ToolbarButton>
        </div>
      )}
      <EditorContent
        editor={editor}
        className="doc-editor-content flex-1 px-8 py-6 [&_.ProseMirror]:min-h-[60vh] [&_.ProseMirror]:outline-none"
      />
    </div>
  );
}
