import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import { Button } from '@/components/ui/button'
import { 
  Bold, 
  Italic, 
  Underline, 
  Palette, 
  Highlighter,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCallback, useEffect } from 'react'

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  language: "te" | "hi" | "en";
  className?: string;
}

export function RichTextEditor({
  value,
  onChange,
  disabled = false,
  placeholder = "Enter content...",
  language,
  className
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: value,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
    },
  });

  // Update editor content when value changes externally (language switching)
  useEffect(() => {
    if (editor && editor.getHTML() !== value) {
      editor.commands.setContent(value, false);
    }
  }, [editor, value]);

  // Update editor editable state when disabled prop changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled);
    }
  }, [editor, disabled]);

  const setColor = useCallback((color: string) => {
    editor?.chain().focus().setColor(color).run();
  }, [editor]);

  const setHighlight = useCallback((color: string) => {
    editor?.chain().focus().setHighlight({ color }).run();
  }, [editor]);

  const setAlignment = useCallback((alignment: string) => {
    editor?.chain().focus().setTextAlign(alignment).run();
  }, [editor]);

  if (!editor) {
    return (
      <div className={cn("min-h-[400px] border rounded-md p-4 bg-muted", className)}>
        <div className="animate-pulse">Loading editor...</div>
      </div>
    );
  }

  const getFontClass = () => {
    switch (language) {
      case "te": return "font-telugu";
      case "hi": return "font-devanagari";
      case "en": return "font-mono";
      default: return "";
    }
  };

  return (
    <div className={cn("border rounded-md", className)}>
      {/* Toolbar */}
      <div className="border-b p-2 flex flex-wrap items-center gap-1">
        {/* Basic formatting */}
        <Button
          variant={editor.isActive('bold') ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={disabled}
          className="h-8 w-8 p-0"
        >
          <Bold className="h-4 w-4" />
        </Button>
        
        <Button
          variant={editor.isActive('italic') ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={disabled}
          className="h-8 w-8 p-0"
        >
          <Italic className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Text colors */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setColor('#ef4444')}
            disabled={disabled}
            className="h-8 w-8 p-0"
            title="Red text"
          >
            <div className="w-4 h-4 bg-red-500 rounded"></div>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setColor('#3b82f6')}
            disabled={disabled}
            className="h-8 w-8 p-0"
            title="Blue text"
          >
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setColor('#22c55e')}
            disabled={disabled}
            className="h-8 w-8 p-0"
            title="Green text"
          >
            <div className="w-4 h-4 bg-green-500 rounded"></div>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setColor('#000000')}
            disabled={disabled}
            className="h-8 w-8 p-0"
            title="Black text"
          >
            <div className="w-4 h-4 bg-black dark:bg-white rounded"></div>
          </Button>
        </div>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Highlights */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setHighlight('#fef08a')}
            disabled={disabled}
            className="h-8 w-8 p-0"
            title="Yellow highlight"
          >
            <div className="w-4 h-4 bg-yellow-200 rounded"></div>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setHighlight('#bfdbfe')}
            disabled={disabled}
            className="h-8 w-8 p-0"
            title="Blue highlight"
          >
            <div className="w-4 h-4 bg-blue-200 rounded"></div>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setHighlight('#bbf7d0')}
            disabled={disabled}
            className="h-8 w-8 p-0"
            title="Green highlight"
          >
            <div className="w-4 h-4 bg-green-200 rounded"></div>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().unsetHighlight().run()}
            disabled={disabled}
            className="h-8 w-8 p-0"
            title="Remove highlight"
          >
            <Highlighter className="h-4 w-4" />
          </Button>
        </div>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Text alignment */}
        <Button
          variant={editor.isActive({ textAlign: 'left' }) ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setAlignment('left')}
          disabled={disabled}
          className="h-8 w-8 p-0"
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive({ textAlign: 'center' }) ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setAlignment('center')}
          disabled={disabled}
          className="h-8 w-8 p-0"
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive({ textAlign: 'right' }) ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setAlignment('right')}
          disabled={disabled}
          className="h-8 w-8 p-0"
        >
          <AlignRight className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive({ textAlign: 'justify' }) ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setAlignment('justify')}
          disabled={disabled}
          className="h-8 w-8 p-0"
        >
          <AlignJustify className="h-4 w-4" />
        </Button>
      </div>

      {/* Editor content */}
      <EditorContent 
        editor={editor} 
        className={cn(
          "min-h-[400px] p-4 text-base leading-relaxed prose prose-sm max-w-none",
          getFontClass(),
          disabled && "opacity-50 cursor-not-allowed"
        )}
      />
    </div>
  );
}