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
import { Node, mergeAttributes, Extension } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'

// Custom FontSize extension
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (size: string) => ReturnType
      unsetFontSize: () => ReturnType
    }
  }
}

const FontSize = Extension.create({
  name: 'fontSize',

  addOptions() {
    return {
      types: ['textStyle'],
    }
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize?.replace(/['"]+/g, ''),
            renderHTML: attributes => {
              if (!attributes.fontSize) {
                return {}
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      setFontSize: (fontSize: string) => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize })
          .run()
      },
      unsetFontSize: () => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize: null })
          .removeEmptyTextStyle()
          .run()
      },
    }
  },
})
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
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
  ImageIcon,
  MapPin,
  Triangle,
  Info
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCallback, useEffect, useState, useReducer } from 'react'
import { Tabs, TabsList, TabsTrigger } from '@/components/design-system/Tabs'
import { htmlToPlainText } from '@shared/utils/text-segmentation'

// Text marker functionality removed temporarily to fix editor issues

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
  // Editor mode state with localStorage persistence
  const [editorMode, setEditorMode] = useState<'html' | 'text'>(() => {
    const saved = localStorage.getItem('richTextEditorMode');
    return (saved === 'html' || saved === 'text') ? saved : 'html';
  });

  // Force re-render when editor state changes for toolbar sync
  const [, forceUpdate] = useReducer(x => x + 1, 0);

  // Persist editor mode preference
  useEffect(() => {
    localStorage.setItem('richTextEditorMode', editorMode);
  }, [editorMode]);

  // Get default font based on language
  const getDefaultFont = () => {
    switch (language) {
      case "te": return "'JIMS', 'Noto Sans Telugu', sans-serif";
      case "hi": return "'AdishilaSanVedic', 'Noto Sans Devanagari', sans-serif";
      case "en": return "'AdishilaSan', 'Noto Sans', sans-serif";
      default: return "'AdishilaSan', 'Noto Sans', sans-serif";
    }
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        hardBreak: false,
        horizontalRule: false,
        orderedList: false,
        bulletList: false,
        listItem: false,
        history: {
          depth: 100,
          newGroupDelay: 500,
        },
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
        types: ['heading', 'paragraph', 'listItem'],
      }),
      FontFamily.configure({
        types: ['textStyle'],
      }),
      FontSize,
    ],
    editorProps: {
      attributes: {
        class: 'focus:outline-none',
        spellcheck: 'false',
      },
      handleKeyDown: (view, event) => {
        // Allow all normal typing and editing
        if (event.key === 'Enter') {
          // Check if we're inside a list (bulletList or orderedList)
          const { $from } = view.state.selection;
          const isInList = $from.node(-1)?.type.name === 'listItem';
          
          if (event.shiftKey) {
            return false; // Shift+Enter: Create paragraph (TipTap default)
          } else if (isInList) {
            return false; // Inside list: Let TipTap handle list item creation
          } else {
            // Outside list: Create hard break for mantra line breaks
            event.preventDefault();
            view.dispatch(view.state.tr.replaceSelectionWith(view.state.schema.nodes.hardBreak.create()));
            return true;
          }
        }
        return false; // Let other keys work normally
      },
      handlePaste: () => {
        // Allow pasting
        return false;
      },
    },
    content: value,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      console.log('Editor onChange - HTML content:', html);
      onChange(html);
    },
  });

  // Update editor content when value changes externally
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      console.log('Editor content mismatch detected:');
      console.log('External value:', value);
      console.log('Editor HTML:', editor.getHTML());
      console.log('Editor focused:', editor.isFocused);
      
      // Always update from external value - this fixes the auto-save persistence issue
      console.log('Updating editor content with external value (forced)');
      editor.commands.setContent(value, false);
    }
  }, [value, editor]);

  // Ensure editor is editable when initialized or disabled state changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled);
    }
  }, [editor, disabled]);

  // Subscribe to editor updates for toolbar sync
  useEffect(() => {
    if (!editor) return;
    
    const handleUpdate = () => forceUpdate();
    
    editor.on('selectionUpdate', handleUpdate);
    editor.on('transaction', handleUpdate);
    
    return () => {
      editor.off('selectionUpdate', handleUpdate);
      editor.off('transaction', handleUpdate);
    };
  }, [editor]);

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
    editor?.chain().focus().setFontFamily(fontFamily).run();
  }, [editor]);

  const setFontSize = useCallback((fontSize: string) => {
    editor?.chain().focus().setFontSize(fontSize).run();
  }, [editor]);

  const setAlignment = useCallback((alignment: string) => {
    editor?.chain().focus().setTextAlign(alignment).run();
  }, [editor]);



  const getFontClass = () => {
    switch (language) {
      case "te": return "font-['JIMS','Noto_Sans_Telugu',sans-serif]";
      case "hi": return "font-['AdishilaSanVedic','Noto_Sans_Devanagari',sans-serif] font-semibold";
      case "en": return "font-['AdishilaSan','Noto_Sans',sans-serif]";
      default: return "";
    }
  };

  const getFontSize = () => {
    return "30px";
  };

  return (
    <div className={cn("border rounded-md overflow-hidden h-full flex flex-col", className)}>
      {/* Reorganized Toolbar */}
      <div className="border-b p-2 bg-white flex-shrink-0">
        {/* Compact Single Row Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Show formatting controls only in HTML mode */}
          {editorMode === 'html' && (
            <>
              {/* Font Family Selector */}
              <Select
                value={editor?.getAttributes('textStyle')?.fontFamily || 'AdishilaSan'}
                onValueChange={(value) => {
                  const { from, to } = editor?.state.selection || { from: 0, to: 0 };
                  setFontFamily(value);
                  setTimeout(() => {
                    editor?.commands.setTextSelection({ from, to });
                  }, 0);
                }}
                disabled={disabled}
              >
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue placeholder="Font" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="JIMS">JIMS</SelectItem>
                  <SelectItem value="AdishilaSanVedic">AdishilaSanVedic</SelectItem>
                  <SelectItem value="AdishilaSan">AdishilaSan</SelectItem>
                  <SelectItem value="Inter">Inter</SelectItem>
                </SelectContent>
              </Select>

              {/* Font Size Selector */}
              <Select
                value={editor?.getAttributes('textStyle')?.fontSize || '30px'}
                onValueChange={(value) => {
                  const { from, to } = editor?.state.selection || { from: 0, to: 0 };
                  setFontSize(value);
                  setTimeout(() => {
                    editor?.commands.setTextSelection({ from, to });
                  }, 0);
                }}
                disabled={disabled}
              >
                <SelectTrigger className="w-[80px] h-8 text-xs">
                  <SelectValue placeholder="Size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="20px">20px</SelectItem>
                  <SelectItem value="24px">24px</SelectItem>
                  <SelectItem value="28px">28px</SelectItem>
                  <SelectItem value="30px">30px</SelectItem>
                  <SelectItem value="36px">36px</SelectItem>
                  <SelectItem value="42px">42px</SelectItem>
                  <SelectItem value="48px">48px</SelectItem>
                  <SelectItem value="54px">54px</SelectItem>
                  <SelectItem value="60px">60px</SelectItem>
                </SelectContent>
              </Select>

              {/* Bold, Italic, Underline */}
              <div className="flex items-center gap-1 px-2 py-1 bg-background rounded border h-8">
                <Button
                  onMouseDown={(e) => e.preventDefault()}
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
                  onMouseDown={(e) => e.preventDefault()}
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
                  onMouseDown={(e) => e.preventDefault()}
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

              {/* Text Colors */}
              <div className="flex items-center gap-1 px-2 py-1 bg-background rounded border h-8">
                <Button
                  onMouseDown={(e) => e.preventDefault()}
                  variant="ghost"
                  size="sm"
                  onClick={() => editor?.chain().focus().unsetColor().run()}
                  disabled={disabled}
                  className="h-7 w-7 p-0"
                  title="Default Color"
                >
                  <div className="w-3 h-3 bg-black dark:bg-white rounded-sm"></div>
                </Button>
                <Button
                  onMouseDown={(e) => e.preventDefault()}
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
                  onMouseDown={(e) => e.preventDefault()}
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
                  onMouseDown={(e) => e.preventDefault()}
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

              {/* Lists */}
              <div className="flex items-center gap-1 px-2 py-1 bg-background rounded border h-8">
                <Button
                  onMouseDown={(e) => e.preventDefault()}
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
                  onMouseDown={(e) => e.preventDefault()}
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
              <div className="flex items-center gap-1 px-2 py-1 bg-background rounded border h-8">
                <Button
                  onMouseDown={(e) => e.preventDefault()}
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
                  onMouseDown={(e) => e.preventDefault()}
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
                  onMouseDown={(e) => e.preventDefault()}
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
                  onMouseDown={(e) => e.preventDefault()}
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
              <div className="flex items-center gap-1 px-2 py-1 bg-background rounded border h-8">
                <Button
                  onMouseDown={(e) => e.preventDefault()}
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
                  onMouseDown={(e) => e.preventDefault()}
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
                  onMouseDown={(e) => e.preventDefault()}
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
            </>
          )}

          {/* Spacer to push mode toggle to the right */}
          <div className="flex-1" />

          {/* HTML/Text Mode Toggle */}
          <Tabs 
            value={editorMode} 
            onValueChange={(value) => setEditorMode(value as 'html' | 'text')}
          >
            <TabsList variant="indigo" size="sm">
              <TabsTrigger value="html" variant="indigo" size="sm" data-testid="toggle-html-mode">
                HTML
              </TabsTrigger>
              <TabsTrigger value="text" variant="indigo" size="sm" data-testid="toggle-text-mode">
                Text
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Keyboard Shortcuts Info */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                title="Keyboard Shortcuts"
              >
                <Info className="h-4 w-4 text-indigo-500" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72" align="end">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Keyboard Shortcuts</h4>
                <div className="border-t pt-2 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Enter</span>
                    <span>New line (for mantras)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shift+Enter</span>
                    <span>New paragraph</span>
                  </div>
                  <div className="border-t my-2"></div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ctrl+B</span>
                    <span>Bold</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ctrl+I</span>
                    <span>Italic</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ctrl+U</span>
                    <span>Underline</span>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Editor Content */}
      {editorMode === 'html' ? (
        <div 
          className="flex-1 overflow-auto bg-white cursor-text"
          onClick={() => editor?.commands.focus()}
        >
          <EditorContent 
            editor={editor} 
            className={cn(
              "text-xl leading-normal w-full h-full",
              "[&_.ProseMirror]:h-full [&_.ProseMirror]:outline-none [&_.ProseMirror]:cursor-text",
              "[&_.ProseMirror]:p-4 [&_.ProseMirror]:w-full [&_.ProseMirror]:box-border",
              "[&_.ProseMirror]:max-w-none",
              "[&_.ProseMirror>*:first-child]:mt-0 [&_.ProseMirror>*:last-child]:mb-0",
              "[&_.ProseMirror-focused]:outline-none",
              "[&_.ProseMirror_h1]:font-semibold [&_.ProseMirror_h1]:text-xl [&_.ProseMirror_h1]:mb-2 [&_.ProseMirror_h1]:mt-2",
              "[&_.ProseMirror_h2]:font-semibold [&_.ProseMirror_h2]:text-lg [&_.ProseMirror_h2]:mb-2 [&_.ProseMirror_h2]:mt-2",
              "[&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_h3]:text-base [&_.ProseMirror_h3]:mb-1 [&_.ProseMirror_h3]:mt-1",
              "[&_.ProseMirror_p]:mb-1 [&_.ProseMirror_p]:mt-0",
              "[&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:ml-6",
              "[&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:ml-6",
              "[&_.ProseMirror_li]:mb-0",
              "[&_.ProseMirror_strong]:font-semibold",
              "[&_.ProseMirror_em]:italic",
              "[&_.ProseMirror_a]:text-blue-600 [&_.ProseMirror_a]:underline",
              getFontClass(),
              disabled && "opacity-50 cursor-not-allowed"
            )}
            style={{
              fontSize: getFontSize(),
              lineHeight: '1.4'
            }}
          />
        </div>
      ) : (
        <div 
          className="flex-1 overflow-auto bg-white p-4"
          data-testid="text-preview-mode"
        >
          <div 
            className={cn(
              "whitespace-pre-wrap",
              getFontClass()
            )}
            style={{
              fontSize: getFontSize(),
              lineHeight: '1.8',
              letterSpacing: '0.02em',
              wordSpacing: '0.05em'
            }}
          >
            {htmlToPlainText(value) || placeholder}
          </div>
        </div>
      )}
    </div>
  );
}