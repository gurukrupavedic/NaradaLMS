/**
 * Modern Rich Text Editor Component - Vedic LMS Design System
 * 
 * Comprehensive TipTap-based editor with vibrant colors and educational variants.
 * Perfect for chapter content creation, descriptions, and multi-language text editing.
 * 
 * Features:
 * - Complete TipTap integration with existing extensions
 * - Colorful toolbar with design system button variants
 * - Educational semantic variants for different content types
 * - Multi-language support (Telugu, Hindi, English/IAST)
 * - Character counting and validation
 * 
 * @author Vedic LMS Design System
 * @since 2025-06-24
 */

import * as React from "react";
import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Heading from "@tiptap/extension-heading";
import BulletList from "@tiptap/extension-bullet-list";
import OrderedList from "@tiptap/extension-ordered-list";
import ListItem from "@tiptap/extension-list-item";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Underline from "@tiptap/extension-underline";
import FontFamily from "@tiptap/extension-font-family";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import HardBreak from "@tiptap/extension-hard-break";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Button } from "./Button.new";
import { 
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, 
  Heading1, Heading2, Heading3, List, ListOrdered, 
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Link as LinkIcon, Image as ImageIcon, Minus, 
  Quote, Code, Undo, Redo, Palette
} from "lucide-react";

const editorVariants = cva(
  "relative w-full rounded-md border border-input bg-background focus-within:border-2 transition-all duration-200",
  {
    variants: {
      variant: {
        default: "focus-within:border-blue-500",
        blue: "focus-within:border-blue-500",
        green: "focus-within:border-green-500",
        purple: "focus-within:border-purple-500",
        orange: "focus-within:border-orange-500",
        pink: "focus-within:border-pink-500",
        indigo: "focus-within:border-indigo-500",
        teal: "focus-within:border-teal-500",
        cyan: "focus-within:border-cyan-500",
        yellow: "focus-within:border-yellow-500",
        lime: "focus-within:border-lime-500",
        rose: "focus-within:border-rose-500",
        emerald: "focus-within:border-emerald-500"
      },
      size: {
        sm: "min-h-[200px]",
        default: "min-h-[300px]",
        lg: "min-h-[400px]",
        xl: "min-h-[500px]"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

// Educational semantic variants
const educationalVariants = {
  // Content types
  chapter: "purple",
  description: "blue",
  commentary: "orange",
  translation: "teal",
  
  // Languages
  sanskrit: "orange",
  hindi: "pink",
  english: "cyan",
  
  // Learning contexts
  lesson: "indigo",
  notes: "green",
  instructions: "emerald"
} as const;

// Toolbar Button Component
interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title?: string;
  variant?: string;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({ 
  onClick, 
  isActive, 
  disabled, 
  children, 
  title,
  variant = "blue"
}) => (
  <Button
    type="button"
    variant={isActive ? variant as any : "outline"}
    size="sm"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className="h-8 w-8 p-0"
  >
    {children}
  </Button>
);

// Toolbar Component
interface ToolbarProps {
  editor: Editor;
  variant?: string;
}

const Toolbar: React.FC<ToolbarProps> = ({ editor, variant = "blue" }) => {
  if (!editor) return null;

  return (
    <div className="border-b border-gray-200 p-2">
      <div className="flex flex-wrap gap-1">
        {/* Text Formatting */}
        <div className="flex gap-1 border-r border-gray-200 pr-2 mr-2">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            title="Bold"
            variant={variant}
          >
            <Bold className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            title="Italic"
            variant={variant}
          >
            <Italic className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            isActive={editor.isActive('underline')}
            title="Underline"
            variant={variant}
          >
            <UnderlineIcon className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            isActive={editor.isActive('strike')}
            title="Strikethrough"
            variant={variant}
          >
            <Strikethrough className="h-4 w-4" />
          </ToolbarButton>
        </div>

        {/* Headings */}
        <div className="flex gap-1 border-r border-gray-200 pr-2 mr-2">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            isActive={editor.isActive('heading', { level: 1 })}
            title="Heading 1"
            variant={variant}
          >
            <Heading1 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor.isActive('heading', { level: 2 })}
            title="Heading 2"
            variant={variant}
          >
            <Heading2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            isActive={editor.isActive('heading', { level: 3 })}
            title="Heading 3"
            variant={variant}
          >
            <Heading3 className="h-4 w-4" />
          </ToolbarButton>
        </div>

        {/* Lists */}
        <div className="flex gap-1 border-r border-gray-200 pr-2 mr-2">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
            title="Bullet List"
            variant={variant}
          >
            <List className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive('orderedList')}
            title="Numbered List"
            variant={variant}
          >
            <ListOrdered className="h-4 w-4" />
          </ToolbarButton>
        </div>

        {/* Alignment */}
        <div className="flex gap-1 border-r border-gray-200 pr-2 mr-2">
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            isActive={editor.isActive({ textAlign: 'left' })}
            title="Align Left"
            variant={variant}
          >
            <AlignLeft className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            isActive={editor.isActive({ textAlign: 'center' })}
            title="Align Center"
            variant={variant}
          >
            <AlignCenter className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            isActive={editor.isActive({ textAlign: 'right' })}
            title="Align Right"
            variant={variant}
          >
            <AlignRight className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
            isActive={editor.isActive({ textAlign: 'justify' })}
            title="Justify"
            variant={variant}
          >
            <AlignJustify className="h-4 w-4" />
          </ToolbarButton>
        </div>

        {/* Other Elements */}
        <div className="flex gap-1 border-r border-gray-200 pr-2 mr-2">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive('blockquote')}
            title="Quote"
            variant={variant}
          >
            <Quote className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCode().run()}
            isActive={editor.isActive('code')}
            title="Code"
            variant={variant}
          >
            <Code className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Horizontal Rule"
            variant={variant}
          >
            <Minus className="h-4 w-4" />
          </ToolbarButton>
        </div>

        {/* Undo/Redo */}
        <div className="flex gap-1">
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo"
            variant={variant}
          >
            <Undo className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo"
            variant={variant}
          >
            <Redo className="h-4 w-4" />
          </ToolbarButton>
        </div>
      </div>
    </div>
  );
};

export interface RichTextEditorProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof editorVariants> {
  content?: string;
  onUpdate?: (content: string) => void;
  placeholder?: string;
  educational?: keyof typeof educationalVariants;
  showCharCount?: boolean;
  maxLength?: number;
  editable?: boolean;
  showToolbar?: boolean;
}

const RichTextEditor = React.forwardRef<HTMLDivElement, RichTextEditorProps>(
  ({
    className,
    content = "",
    onUpdate,
    placeholder = "Start writing...",
    variant,
    size,
    educational,
    showCharCount = false,
    maxLength,
    editable = true,
    showToolbar = true,
    ...props
  }, ref) => {
    const [charCount, setCharCount] = React.useState(0);
    
    // Use educational variant if provided
    const finalVariant = educational ? educationalVariants[educational] : variant;
    const toolbarVariant = finalVariant || "blue";

    const editor = useEditor({
      extensions: [
        StarterKit,
        Heading.configure({
          levels: [1, 2, 3, 4, 5, 6],
        }),
        BulletList.configure({
          HTMLAttributes: {
            class: 'list-disc list-inside space-y-1',
          },
        }),
        OrderedList.configure({
          HTMLAttributes: {
            class: 'list-decimal list-inside space-y-1',
          },
        }),
        ListItem,
        Link.configure({
          openOnClick: false,
          HTMLAttributes: {
            class: 'text-blue-600 underline hover:text-blue-800',
          },
        }),
        Image.configure({
          HTMLAttributes: {
            class: 'max-w-full h-auto rounded-lg',
          },
        }),
        TextAlign.configure({
          types: ['heading', 'paragraph'],
        }),
        TextStyle,
        Color,
        Highlight.configure({
          multicolor: true,
        }),
        Underline,
        FontFamily,
        HorizontalRule.configure({
          HTMLAttributes: {
            class: 'my-4 border-gray-300',
          },
        }),
        HardBreak,
      ],
      content,
      editable,
      onUpdate: ({ editor }) => {
        const html = editor.getHTML();
        const text = editor.getText();
        setCharCount(text.length);
        onUpdate?.(html);
      },
      editorProps: {
        attributes: {
          class: cn(
            "prose prose-sm sm:prose lg:prose-lg mx-auto focus:outline-none max-w-none",
            "p-4 min-h-[200px]",
            // Language-specific typography
            educational === "sanskrit" && "font-serif text-lg leading-relaxed",
            educational === "hindi" && "font-sans text-base leading-relaxed",
            educational === "english" && "font-sans text-base leading-normal"
          ),
          placeholder,
        },
      },
    });

    // Update editor content when prop changes
    React.useEffect(() => {
      if (editor && content !== editor.getHTML()) {
        editor.commands.setContent(content);
      }
    }, [editor, content]);

    // Initial character count
    React.useEffect(() => {
      if (editor) {
        setCharCount(editor.getText().length);
      }
    }, [editor]);

    return (
      <div
        ref={ref}
        className={cn(editorVariants({ variant: finalVariant, size }), className)}
        {...props}
      >
        {showToolbar && editor && (
          <Toolbar editor={editor} variant={toolbarVariant} />
        )}
        
        <div className="relative">
          <EditorContent editor={editor} />
          
          {showCharCount && (
            <div className="absolute bottom-2 right-3 text-xs text-gray-500 bg-white/80 backdrop-blur-sm rounded px-2 py-1">
              {charCount}{maxLength && ` / ${maxLength}`}
            </div>
          )}
        </div>
      </div>
    );
  }
);
RichTextEditor.displayName = "RichTextEditor";

export { RichTextEditor, editorVariants };