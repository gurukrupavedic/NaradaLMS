# Next Tiptap Editor

A modern, feature-rich WYSIWYG rich text editor built with [Tiptap](https://tiptap.dev/) and [Radix UI](https://www.radix-ui.com/) for React and Next.js applications.

![Next Tiptap Editor](https://i.imgur.com/WW1QbSW.png)

## Demo

Try it yourself in this [live demo!](https://next-tiptap.vercel.app/)

## ✨ Features

### 📝 Rich Text Editing

- **Text Formatting**: Bold, italic, underline, strikethrough, code, subscript, superscript
- **Headings**: Multiple heading levels (H1-H6)
- **Lists**: Ordered and unordered lists with nested support
- **Text Alignment**: Left, center, right, and justify alignment
- **Text Styling**: Custom text color and background highlighting
- **Links**: Insert and edit hyperlinks with custom text

### 📦 Advanced Content

- **Images**: Upload, resize, and add captions to images
- **Tables**: Create and edit tables with cell alignment and formatting
- **Code Blocks**: Syntax-highlighted code blocks with language selection
- **YouTube Embeds**: Embed YouTube videos directly in your content
- **Drag & Drop**: Reorder content blocks with intuitive drag handles

---

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/ndtrung341/next-tiptap.git

# Navigate to project directory
cd next-tiptap

# Install dependencies
pnpm install
# or
npm install
# or
yarn install
```

### Development

```bash
# Start development server
pnpm dev
# or
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) to see the editor in action.

---

## 📖 Usage

### Basic Implementation

```tsx
import TiptapEditor, { type TiptapEditorRef } from "@/components/tiptap-editor";
import { useRef } from "react";

export default function MyEditor() {
  const editorRef = useRef<TiptapEditorRef>(null);

  const handleChange = (content: string) => {
    console.log("Content updated:", content);
  };

  return (
    <TiptapEditor
      ref={editorRef}
      output="html"
      minHeight={320}
      maxHeight={640}
      onChange={handleChange}
      placeholder={{
        paragraph: "Start typing...",
        imageCaption: "Add a caption (optional)",
      }}
    />
  );
}
```

### Editor Props

| Prop            | Type                               | Default     | Description                           |
| --------------- | ---------------------------------- | ----------- | ------------------------------------- |
| `content`       | `Content`                          | `undefined` | Initial editor content (HTML or JSON) |
| `output`        | `"html" \| "json"`                 | `"html"`    | Output format for content             |
| `readonly`      | `boolean`                          | `false`     | Make editor read-only                 |
| `disabled`      | `boolean`                          | `false`     | Disable editor interactions           |
| `minHeight`     | `string \| number`                 | `320`       | Minimum editor height (px)            |
| `maxHeight`     | `string \| number`                 | `undefined` | Maximum editor height (px)            |
| `maxWidth`      | `string \| number`                 | `undefined` | Maximum editor width (px)             |
| `placeholder`   | `string \| Record<string, string>` | `undefined` | Placeholder text                      |
| `ssr`           | `boolean`                          | `false`     | Enable server-side rendering          |
| `throttleDelay` | `number`                           | `1500`      | Throttle delay for `onChange` (ms)    |
| `onChange`      | `(content: Content) => void`       | `undefined` | Callback when content changes         |

---

### Accessing Editor Instance

```tsx
const editorRef = useRef<TiptapEditorRef>(null);

// Get editor instance
const editor = editorRef.current;

// Get content
const htmlContent = editor?.getHTML();
const jsonContent = editor?.getJSON();

// Get statistics
const wordCount = editor?.storage.characterCount.words();
const charCount = editor?.storage.characterCount.characters();

// Programmatic control
editor?.commands.setContent("<p>New content</p>");
editor?.commands.focus();
```

---

## 🎨 Customization

### Styling

The editor uses CSS variables for theming. Customize colors in your `globals.css`:

```css
:root {
  --rte-editor-min-height: 320px;
  --rte-editor-max-height: 640px;
  --rte-editor-max-width: 700px;
}
```

### Extensions

Add or remove Tiptap extensions in `src/components/tiptap-editor/extensions/index.ts`:

```ts
import { Extension } from "@tiptap/core";

export const createExtensions = ({ placeholder }) => [
  // Add your custom extensions here
  StarterKit,
  Image,
  Link,
  Table,
  // ... more extensions
];
```

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) - App Router
- **Editor**: [Tiptap](https://tiptap.dev/) - Headless editor framework
- **UI Components**: [Radix UI](https://www.radix-ui.com/)
- **Styling**: [SCSS](https://sass-lang.com/) + [Tailwind CSS](https://tailwindcss.com/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Form Handling**: [React Hook Form](https://react-hook-form.com/)
- **Icons**: [React Icons](https://react-icons.github.io/react-icons/)

<br />
<p align="center"><strong>Built with ❤️ using Next.js and Tiptap</strong></p>
