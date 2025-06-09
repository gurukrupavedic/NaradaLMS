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
import FontFamily from '@tiptap/extension-font-family'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Minus,
  Link as LinkIcon,
  ImageIcon
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
      HardBreak.configure({
        keepMarks: false,
      }),
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
      FontFamily.configure({
        types: ['textStyle'],
      }),
    ],
    editorProps: {
      handleKeyDown: (view, event) => {
        if (event.key === 'Enter') {
          if (event.shiftKey) {
            return false; // Shift+Enter: Create paragraph
          } else {
            // Enter: Create hard break
            event.preventDefault();
            view.dispatch(view.state.tr.replaceSelectionWith(view.state.schema.nodes.hardBreak.create()));
            return true;
          }
        }
        return false;
      },
    },
    content: value,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

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

  const setFontFamily = useCallback((fontFamily: string) => {
    if (fontFamily === 'default') {
      editor?.chain().focus().unsetFontFamily().run();
    } else {
      editor?.chain().focus().setFontFamily(fontFamily).run();
    }
  }, [editor]);

  const setAlignment = useCallback((alignment: string) => {
    editor?.chain().focus().setTextAlign(alignment).run();
  }, [editor]);

  const getFontClass = () => {
    switch (language) {
      case "te": return "font-['Noto Sans Telugu']";
      case "hi": return "font-['Noto Sans Devanagari']";
      case "en": return "font-mono";
      default: return "";
    }
  };

  return (
    <div className={cn("border rounded-md", className)}>
      {/* Reorganized Toolbar */}
      <div className="border-b p-2 bg-muted/50">
        {/* Row 1: Primary Tools */}
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {/* Essential Formatting */}
          <div className="flex items-center gap-1 px-2 py-1 bg-background rounded border">
            <Button
              variant={editor?.isActive('bold') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => editor?.chain().focus().toggleBold().run()}
              disabled={disabled}
              className="h-7 w-7 p-0"
              title="Bold (Ctrl+B)"
            >
              <Bold className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={editor?.isActive('italic') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              disabled={disabled}
              className="h-7 w-7 p-0"
              title="Italic (Ctrl+I)"
            >
              <Italic className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={editor?.isActive('underline') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => editor?.chain().focus().toggleUnderline().run()}
              disabled={disabled}
              className="h-7 w-7 p-0"
              title="Underline (Ctrl+U)"
            >
              <UnderlineIcon className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Font Selector */}
          <Select
            value={editor?.getAttributes('textStyle')?.fontFamily || 'default'}
            onValueChange={setFontFamily}
            disabled={disabled}
          >
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue placeholder="Font" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="'Noto Sans Telugu', sans-serif">Noto Sans Telugu</SelectItem>
              <SelectItem value="'Noto Sans Devanagari', sans-serif">Noto Sans Devanagari</SelectItem>
              <SelectItem value="'Sanskrit 2003', serif">Sanskrit 2003</SelectItem>
              <SelectItem value="Arial, sans-serif">Arial</SelectItem>
              <SelectItem value="Times New Roman, serif">Times New Roman</SelectItem>
              <SelectItem value="Georgia, serif">Georgia</SelectItem>
              <SelectItem value="Verdana, sans-serif">Verdana</SelectItem>
              <SelectItem value="'Noto Sans', sans-serif">Noto Sans</SelectItem>
              <SelectItem value="Courier New, monospace">Courier New</SelectItem>
            </SelectContent>
          </Select>

          {/* Text Colors */}
          <div className="flex items-center gap-1 px-2 py-1 bg-background rounded border">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setColor('#000000')}
              disabled={disabled}
              className="h-7 w-7 p-0"
              title="Black"
            >
              <div className="w-3 h-3 bg-black dark:bg-white rounded-sm"></div>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setColor('#ef4444')}
              disabled={disabled}
              className="h-7 w-7 p-0"
              title="Red"
            >
              <div className="w-3 h-3 bg-red-500 rounded-sm"></div>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setColor('#3b82f6')}
              disabled={disabled}
              className="h-7 w-7 p-0"
              title="Blue"
            >
              <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setColor('#22c55e')}
              disabled={disabled}
              className="h-7 w-7 p-0"
              title="Green"
            >
              <div className="w-3 h-3 bg-green-500 rounded-sm"></div>
            </Button>
          </div>
        </div>

        {/* Row 2: Structure Tools */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Heading Selector */}
          <Select
            value={
              editor?.isActive('heading', { level: 1 }) ? 'h1' :
              editor?.isActive('heading', { level: 2 }) ? 'h2' :
              editor?.isActive('heading', { level: 3 }) ? 'h3' :
              editor?.isActive('heading', { level: 4 }) ? 'h4' :
              editor?.isActive('heading', { level: 5 }) ? 'h5' :
              editor?.isActive('heading', { level: 6 }) ? 'h6' :
              'paragraph'
            }
            onValueChange={(value) => {
              if (value === 'paragraph') {
                editor?.chain().focus().setParagraph().run();
              } else {
                const level = parseInt(value.replace('h', '')) as 1 | 2 | 3 | 4 | 5 | 6;
                editor?.chain().focus().toggleHeading({ level }).run();
              }
            }}
            disabled={disabled}
          >
            <SelectTrigger className="w-[90px] h-8 text-xs">
              <SelectValue placeholder="Style" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="paragraph">Paragraph</SelectItem>
              <SelectItem value="h1">Heading 1</SelectItem>
              <SelectItem value="h2">Heading 2</SelectItem>
              <SelectItem value="h3">Heading 3</SelectItem>
              <SelectItem value="h4">Heading 4</SelectItem>
              <SelectItem value="h5">Heading 5</SelectItem>
              <SelectItem value="h6">Heading 6</SelectItem>
            </SelectContent>
          </Select>

          {/* Lists */}
          <div className="flex items-center gap-1 px-2 py-1 bg-background rounded border">
            <Button
              variant={editor?.isActive('orderedList') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              disabled={disabled}
              className="h-7 w-7 p-0"
              title="Numbered List"
            >
              <ListOrdered className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={editor?.isActive('bulletList') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              disabled={disabled}
              className="h-7 w-7 p-0"
              title="Bullet List"
            >
              <List className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Alignment */}
          <div className="flex items-center gap-1 px-2 py-1 bg-background rounded border">
            <Button
              variant={editor?.isActive({ textAlign: 'left' }) ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setAlignment('left')}
              disabled={disabled}
              className="h-7 w-7 p-0"
              title="Left Align"
            >
              <AlignLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={editor?.isActive({ textAlign: 'center' }) ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setAlignment('center')}
              disabled={disabled}
              className="h-7 w-7 p-0"
              title="Center Align"
            >
              <AlignCenter className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={editor?.isActive({ textAlign: 'right' }) ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setAlignment('right')}
              disabled={disabled}
              className="h-7 w-7 p-0"
              title="Right Align"
            >
              <AlignRight className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={editor?.isActive({ textAlign: 'justify' }) ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setAlignment('justify')}
              disabled={disabled}
              className="h-7 w-7 p-0"
              title="Justify"
            >
              <AlignJustify className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Content Insertion */}
          <div className="flex items-center gap-1 px-2 py-1 bg-background rounded border">
            <Button
              variant={editor?.isActive('link') ? 'default' : 'ghost'}
              size="sm"
              onClick={addLink}
              disabled={disabled}
              className="h-7 w-7 p-0"
              title="Add Link"
            >
              <LinkIcon className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={addImage}
              disabled={disabled}
              className="h-7 w-7 p-0"
              title="Add Image"
            >
              <ImageIcon className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor?.chain().focus().setHorizontalRule().run()}
              disabled={disabled}
              className="h-7 w-7 p-0"
              title="Horizontal Rule"
            >
              <Minus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Editor Content */}
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