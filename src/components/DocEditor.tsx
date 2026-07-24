"use client";

import { useEditor, EditorContent, type Editor, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useRef } from "react";
import { CommentHighlight } from "@/components/extensions/CommentHighlight";

export const EDITOR_EXTENSIONS = [
  StarterKit,
  Underline,
  Placeholder.configure({ placeholder: "Start writing…" }),
  CommentHighlight,
];

interface DocEditorProps {
  initialContent: JSONContent;
  editable: boolean;
  onSave: (content: JSONContent) => void;
  onSelectionChange?: (text: string) => void;
  onEditorReady?: (editor: Editor | null) => void;
  onCommentClick?: (commentId: string) => void;
}

function Divider() {
  return <span className="mx-1.5 h-5 w-px shrink-0 bg-zinc-200 dark:bg-zinc-700" />;
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
      aria-pressed={active}
      onClick={onClick}
      disabled={disabled}
      className={`flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm font-medium transition-colors disabled:opacity-40 ${
        active
          ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400"
          : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
      }`}
    >
      {children}
    </button>
  );
}

function BoldIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path d="M5 3a1 1 0 0 1 1-1h4.5a3.5 3.5 0 0 1 2.55 5.9A3.75 3.75 0 0 1 11 15H6a1 1 0 0 1-1-1V3Zm3 1v4h2.5a2 2 0 1 0 0-4H8Zm0 6v4h3a2 2 0 1 0 0-4H8Z" />
    </svg>
  );
}

function ItalicIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path d="M8 3a1 1 0 1 0 0 2h1.72l-2.4 10H5a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2h-1.72l2.4-10H14a1 1 0 1 0 0-2H8Z" />
    </svg>
  );
}

function UnderlineIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path d="M5 3a1 1 0 0 1 1 1v5a4 4 0 0 0 8 0V4a1 1 0 1 1 2 0v5a6 6 0 0 1-12 0V4a1 1 0 0 1 1-1ZM4 16a1 1 0 0 1 1-1h10a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1Z" />
    </svg>
  );
}

function BulletListIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path d="M4 5.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm3-.75a.75.75 0 0 0 0 1.5h9.5a.75.75 0 0 0 0-1.5H7ZM4 10a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm3-.75a.75.75 0 0 0 0 1.5h9.5a.75.75 0 0 0 0-1.5H7ZM4 14.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm2.25-.75a.75.75 0 0 0 0 1.5h9.5a.75.75 0 0 0 0-1.5h-9.5Z" />
    </svg>
  );
}

function NumberedListIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path
        fillRule="evenodd"
        d="M7 5.75A.75.75 0 0 1 7.75 5h9.5a.75.75 0 0 1 0 1.5h-9.5A.75.75 0 0 1 7 5.75Zm0 4.5a.75.75 0 0 1 .75-.75h9.5a.75.75 0 0 1 0 1.5h-9.5a.75.75 0 0 1-.75-.75Zm.75 3.75a.75.75 0 0 0 0 1.5h9.5a.75.75 0 0 0 0-1.5h-9.5Z"
        clipRule="evenodd"
      />
      <path d="M2.5 3.5h1v3h-1v-3ZM2.5 8h1.5v1H3v.5h1v1H2.5v-1H3V9h-.5v-1ZM2.5 12.5H4v1H3v.25h1v1H2.5v-.75H3v-.25h-.5v-1.25Z" />
    </svg>
  );
}

export default function DocEditor({
  initialContent,
  editable,
  onSave,
  onSelectionChange,
  onEditorReady,
  onCommentClick,
}: DocEditorProps) {
  const editor = useEditor({
    extensions: EDITOR_EXTENSIONS,
    content: initialContent,
    editable,
    immediatelyRender: false,
  });

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    onEditorReady?.(editor);
    return () => onEditorReady?.(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  function handleContentClick(e: React.MouseEvent) {
    if (!onCommentClick) return;
    const span = (e.target as HTMLElement).closest?.("[data-comment-id]");
    const id = span?.getAttribute("data-comment-id");
    if (id) onCommentClick(id);
  }

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

  useEffect(() => {
    if (!editor || !onSelectionChange) return;

    const handler = () => {
      const { from, to } = editor.state.selection;
      onSelectionChange(from === to ? "" : editor.state.doc.textBetween(from, to, " ").trim());
    };

    editor.on("selectionUpdate", handler);
    return () => {
      editor.off("selectionUpdate", handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  if (!editor) {
    return (
      <div className="mx-auto my-6 w-full max-w-4xl px-4">
        <div className="h-[60vh] animate-pulse rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900" />
      </div>
    );
  }

  return (
    <div className="mx-auto my-6 w-full max-w-4xl px-4">
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {editable && (
          <div className="flex flex-wrap items-center gap-0.5 border-b border-zinc-200 bg-zinc-50/60 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/60">
            <ToolbarButton
              label="Bold"
              active={editor.isActive("bold")}
              onClick={() => editor.chain().focus().toggleBold().run()}
            >
              <BoldIcon />
            </ToolbarButton>
            <ToolbarButton
              label="Italic"
              active={editor.isActive("italic")}
              onClick={() => editor.chain().focus().toggleItalic().run()}
            >
              <ItalicIcon />
            </ToolbarButton>
            <ToolbarButton
              label="Underline"
              active={editor.isActive("underline")}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
            >
              <UnderlineIcon />
            </ToolbarButton>
            <Divider />
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
            <Divider />
            <ToolbarButton
              label="Bullet list"
              active={editor.isActive("bulletList")}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
            >
              <BulletListIcon />
            </ToolbarButton>
            <ToolbarButton
              label="Numbered list"
              active={editor.isActive("orderedList")}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
            >
              <NumberedListIcon />
            </ToolbarButton>
          </div>
        )}
        <EditorContent
          editor={editor}
          onClick={handleContentClick}
          className="doc-editor-content px-6 py-6 text-zinc-900 sm:px-10 sm:py-8 dark:text-zinc-100 [&_.ProseMirror]:min-h-[60vh] [&_.ProseMirror]:outline-none"
        />
      </div>
    </div>
  );
}
