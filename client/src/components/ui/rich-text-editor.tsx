import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import Heading from '@tiptap/extension-heading'
import HardBreak from '@tiptap/extension-hard-break'
import HorizontalRule from '@tiptap/extension-horizontal-rule'
import OrderedList from '@tiptap/extension-ordered-list'
import BulletList from '@tiptap/extension-bullet-list'
import ListItem from '@tiptap/extension-list-item'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import { Button } from '@/components/ui/button'
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  Palette, 
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Minus,
  Link as LinkIcon,
  ImageIcon,
  Type
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
      StarterKit.configure({
        // Disable default extensions we're configuring separately
        heading: false,
        hardBreak: false,
        horizontalRule: false,
        orderedList: false,
        bulletList: false,
        listItem: false,
      }),
      TextStyle,
      Color,
      Underline,
      Heading.configure({
        levels: [1, 2, 3, 4, 5, 6],
      }),
      HardBreak,
      HorizontalRule,
      OrderedList.configure({
        HTMLAttributes: {
          class: 'ordered-list',
        },
      }),
      BulletList.configure({
        HTMLAttributes: {
          class: 'bullet-list',
        },
      }),
      ListItem,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-md',
        },
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

  const addLink = useCallback(() => {
    const url = window.prompt('Enter URL:');
    if (url) {
      editor?.chain().focus().setLink({ href: url }).run();
    }
  }, [editor]);

  const addImage = useCallback(() => {
    const url = window.prompt('Enter image URL:');
    if (url) {
      editor?.chain().focus().setImage({ src: url }).run();
    }
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

        {/* Underline */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
          disabled={disabled}
          className={cn(
            "h-8 w-8 p-0",
            editor?.isActive('underline') && "bg-muted"
          )}
          title="Underline"
        >
          <UnderlineIcon className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Headings */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
            disabled={disabled}
            className={cn(
              "h-8 w-8 p-0",
              editor?.isActive('heading', { level: 1 }) && "bg-muted"
            )}
            title="Heading 1"
          >
            <Heading1 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            disabled={disabled}
            className={cn(
              "h-8 w-8 p-0",
              editor?.isActive('heading', { level: 2 }) && "bg-muted"
            )}
            title="Heading 2"
          >
            <Heading2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
            disabled={disabled}
            className={cn(
              "h-8 w-8 p-0",
              editor?.isActive('heading', { level: 3 }) && "bg-muted"
            )}
            title="Heading 3"
          >
            <Heading3 className="h-4 w-4" />
          </Button>
        </div>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Hard Break & Horizontal Rule */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor?.chain().focus().setHardBreak().run()}
            disabled={disabled}
            className="h-8 w-8 p-0"
            title="Line break"
          >
            <Type className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor?.chain().focus().setHorizontalRule().run()}
            disabled={disabled}
            className="h-8 w-8 p-0"
            title="Horizontal rule"
          >
            <Minus className="h-4 w-4" />
          </Button>
        </div>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Lists */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            disabled={disabled}
            className={cn(
              "h-8 w-8 p-0",
              editor?.isActive('orderedList') && "bg-muted"
            )}
            title="Numbered list"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            disabled={disabled}
            className={cn(
              "h-8 w-8 p-0",
              editor?.isActive('bulletList') && "bg-muted"
            )}
            title="Bullet list"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Links & Images */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={addLink}
            disabled={disabled}
            className={cn(
              "h-8 w-8 p-0",
              editor?.isActive('link') && "bg-muted"
            )}
            title="Add link"
          >
            <LinkIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={addImage}
            disabled={disabled}
            className="h-8 w-8 p-0"
            title="Add image"
          >
            <ImageIcon className="h-4 w-4" />
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
          "prose-headings:font-semibold prose-headings:mb-3 prose-headings:mt-4",
          "prose-ul:list-disc prose-ol:list-decimal prose-li:ml-4 prose-li:my-1",
          "prose-hr:border-gray-300 prose-hr:my-6 prose-hr:border-t",
          "prose-a:text-blue-600 prose-a:underline prose-a:no-underline hover:prose-a:underline",
          "prose-img:max-w-full prose-img:h-auto prose-img:rounded-md prose-img:my-4",
          "prose-p:mb-3 prose-strong:font-semibold prose-em:italic",
          getFontClass(),
          disabled && "opacity-50 cursor-not-allowed"
        )}
      />
    </div>
  );
}