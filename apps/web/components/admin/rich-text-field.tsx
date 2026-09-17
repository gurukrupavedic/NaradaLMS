'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect, useRef } from 'react'

import { cn } from '@/lib/utils'

/**
 * WYSIWYG editor for a script's text (bold/italic/headings — useful for setting off a speaker
 * line like "सञ्जय उवाच" from the verse it introduces). Formatting is editing-only: the API's
 * `ChapterScript.text` is a plain string, and segment boundaries are plain character offsets into
 * it, so what gets saved is always `editor.getText()` — the rendered text with marks stripped —
 * never the HTML. A save immediately after a formatting-only edit is therefore a no-op text-wise;
 * only bold/heading markup itself isn't persisted, not the words.
 */
export function RichTextField({
  value,
  onChangeText,
  fontClass,
  placeholder,
}: {
  value: string
  onChangeText: (text: string) => void
  fontClass?: string
  placeholder?: string
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const editor = useEditor({
    extensions: [StarterKit.configure({ codeBlock: false, blockquote: false, horizontalRule: false })],
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm max-w-none min-h-[9rem] border border-rule bg-paper p-2.5 text-[0.9375rem] leading-relaxed focus:outline-none focus:border-vermilion [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:text-base [&_h2]:font-semibold',
          fontClass,
        ),
      },
    },
    onUpdate: ({ editor }) => onChangeText(editor.getText()),
  })

  // Keep the editor in sync when a parent resets `value` wholesale (e.g. after a file import) —
  // tiptap only owns its content after that initial mount, and `onChangeText` above already keeps
  // `value` current for edits made inside the editor itself, so this only fires for outside resets.
  useEffect(() => {
    if (editor && value !== editor.getText()) editor.commands.setContent(value)
  }, [editor, value])

  async function handleFile(file: File) {
    const text = await file.text()
    editor?.commands.setContent(text)
    onChangeText(text)
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 border-x border-t border-rule bg-ink/[0.02] px-2 py-1.5">
        <ToolbarButton active={editor?.isActive('bold')} onClick={() => editor?.chain().focus().toggleBold().run()}>
          B
        </ToolbarButton>
        <ToolbarButton active={editor?.isActive('italic')} onClick={() => editor?.chain().focus().toggleItalic().run()}>
          I
        </ToolbarButton>
        <ToolbarButton
          active={editor?.isActive('heading', { level: 2 })}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          H
        </ToolbarButton>
        <span className="ml-auto">
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,text/plain"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) void handleFile(file)
              e.target.value = ''
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="label text-ink-muted hover:text-vermilion"
          >
            Upload .txt
          </button>
        </span>
      </div>
      <EditorContent editor={editor} placeholder={placeholder} />
    </div>
  )
}

function ToolbarButton({
  active,
  onClick,
  children,
}: {
  active?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'label size-6 border transition-colors',
        active ? 'border-vermilion text-vermilion' : 'border-rule text-ink-muted hover:text-ink',
      )}
    >
      {children}
    </button>
  )
}
