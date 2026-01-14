// HTML
export const htmlMock = `
<h2>Welcome to Rich Text Editor</h2>
<p>This comprehensive demo showcases all the powerful features of a modern rich text editor built with <strong>Tiptap</strong> and <strong>Radix UI</strong>. Explore text formatting, media embedding, and advanced content structures.</p>

<h2>Text Formatting</h2>
<p>Rich text editors support various text styles: <strong>bold text</strong>, <em>italic text</em>, <u>underlined text</u>, <s>strikethrough</s>, and <code>inline code</code>.</p>
<p>You can also use <sub>subscript</sub> and <sup>superscript</sup>, or combine styles: <strong><em>bold and italic</em></strong>, <strong><u>bold and underline</u></strong>.</p>

<h2>Headings Structure</h2>
<p>Organize your content with multiple heading levels:</p>
<h3>This is Heading 3</h3>
<p>Headings help create a clear document hierarchy.</p>
<h4>This is Heading 4</h4>
<p>Use appropriate heading levels for better structure.</p>
<h5>This is Heading 5</h5>
<p>Even smaller headings are supported for detailed outlines.</p>

<h2>Lists</h2>
<h3>Unordered Lists</h3>
<ul>
  <li><p>First item in the list</p></li>
  <li><p>Second item with <strong>bold text</strong></p></li>
  <li><p>Third item with nested list:</p>
    <ul>
      <li><p>Nested item 1</p></li>
      <li><p>Nested item 2 with <em>italic</em></p></li>
      <li><p>Nested item 3</p></li>
    </ul>
  </li>
  <li><p>Fourth item with <code>inline code</code></p></li>
</ul>

<h3>Ordered Lists</h3>
<ol>
  <li><p>First step: Install dependencies</p></li>
  <li><p>Second step: Configure the editor</p></li>
  <li><p>Third step: Customize extensions</p>
    <ol>
      <li><p>Add StarterKit</p></li>
      <li><p>Configure Image extension</p></li>
      <li><p>Set up Table support</p></li>
    </ol>
  </li>
  <li><p>Final step: Deploy your application</p></li>
</ol>

<h2>Text Alignment</h2>
<p style="text-align: left">This paragraph is left-aligned (default alignment for most text).</p>
<p style="text-align: center">This paragraph is center-aligned, perfect for titles or important statements.</p>
<p style="text-align: right">This paragraph is right-aligned, often used for signatures or timestamps.</p>
<p style="text-align: justify">This paragraph uses justified alignment. When you have longer text content, justified alignment distributes the words evenly across the line width, creating clean and professional-looking edges on both the left and right sides of the text block.</p>

<h2>Text Styling</h2>
<p>Customize your text with <span style="color: #ff0000">custom colors</span> and <span style="background-color: #ffff00">background highlights</span> to emphasize important content.</p>
<p>You can combine both: <span style="color: #ffffff; background-color: #3b82f6; padding: 2px 6px; border-radius: 3px;">Blue background with white text</span> creates a tag-like appearance.</p>

<h2>Links</h2>
<p>Add <a href="https://tiptap.dev" target="_blank" rel="noopener noreferrer">external links</a> to reference other resources, or create <a href="#internal">internal links</a> for navigation within your document.</p>
<p>Links can also be <strong><a href="https://github.com/ndtrung341/next-tiptap" target="_blank">combined with text formatting</a></strong> for better visibility!</p>

<h2>Images</h2>
<p>Images can be embedded in two ways:</p>

<h3>Standalone Images</h3>
<p>Simple image without caption:</p>
<img 
  src="https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?w=800&h=500&fit=crop" 
  alt="Developer workspace"
  data-width="800"
  data-height="500"
/>

<h3>Images with Captions</h3>
<p>Images wrapped in figure with caption:</p>
<figure>
  <img 
    src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&h=500&fit=crop" 
    alt="Coding on laptop"
    data-width="800"
    data-height="500"
  />
  <figcaption>A developer working on a modern laptop with dual monitors</figcaption>
</figure>

<figure>
  <img 
    src="https://images.unsplash.com/photo-1487058792275-0ad4aaf24ca7?w=800&h=500&fit=crop" 
    alt="Clean desk setup"
    data-width="800"
    data-height="500"
  />
  <figcaption>Minimalist workspace setup with clean aesthetics</figcaption>
</figure>

<h2>Blockquotes</h2>
<blockquote>
  <p>"The best way to predict the future is to invent it." <strong>- Alan Kay</strong></p>
</blockquote>

<blockquote>
  <p>Blockquotes are perfect for highlighting important quotes, testimonials, or citations. They can contain <strong>formatted text</strong>, <em>multiple paragraphs</em>, and even other elements.</p>
  <p>This is the second paragraph in the blockquote, demonstrating multi-paragraph support.</p>
</blockquote>

<h2>Code Blocks</h2>
<p>The editor supports syntax-highlighted code blocks with language selection:</p>

<h3>JavaScript Example</h3>
<pre><code class="language-javascript">// Function to create a greeting
function greetUser(name) {
  const greeting = \`Hello, \${name}! Welcome to Tiptap Editor.\`;
  console.log(greeting);
  return greeting;
}

// Usage example
const message = greetUser('World');
console.log(message);
</code></pre>

<h3>React Component Example</h3>
<pre><code class="language-tsx">import { useRef } from 'react';
import TiptapEditor, { type TiptapEditorRef } from '@/components/tiptap-editor';

export default function MyEditor() {
  const editorRef = useRef&lt;TiptapEditorRef&gt;(null);

  const handleChange = (content: string) => {
    console.log('Content updated:', content);
  };

  return (
    &lt;TiptapEditor
      ref={editorRef}
      output="html"
      minHeight={320}
      onChange={handleChange}
      placeholder="Start typing..."
    /&gt;
  );
}
</code></pre>

<h3>Python Example</h3>
<pre><code class="language-python">def fibonacci(n):
    """Generate Fibonacci sequence up to n terms"""
    a, b = 0, 1
    result = []
    
    for _ in range(n):
        result.append(a)
        a, b = b, a + b
    
    return result

# Generate first 10 Fibonacci numbers
numbers = fibonacci(10)
print(f"Fibonacci sequence: {numbers}")
</code></pre>

<h3>CSS Styling</h3>
<pre><code class="language-css">:root {
  --rte-editor-min-height: 320px;
  --rte-editor-max-height: 640px;
  --rte-editor-max-width: 700px;
}

.editor-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.editor-content:hover {
  transform: translateY(-2px);
  transition: transform 0.2s ease;
}
</code></pre>

<h2>Tables</h2>
<p>Create and edit tables with cell alignment and formatting:</p>

<table>
  <thead>
    <tr>
      <th style="text-align: left"><p>Feature</p></th>
      <th style="text-align: center"><p>Description</p></th>
      <th style="text-align: center"><p>Status</p></th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="text-align: left"><p><strong>Text Formatting</strong></p></td>
      <td style="text-align: center"><p>Bold, italic, underline, strikethrough, code</p></td>
      <td style="text-align: center"><p>✅ Available</p></td>
    </tr>
    <tr>
      <td style="text-align: left"><p><strong>Code Blocks</strong></p></td>
      <td style="text-align: center"><p>Syntax highlighting for 50+ languages</p></td>
      <td style="text-align: center"><p>✅ Available</p></td>
    </tr>
    <tr>
      <td style="text-align: left"><p><strong>Images</strong></p></td>
      <td style="text-align: center"><p>Upload, resize, and add captions</p></td>
      <td style="text-align: center"><p>✅ Available</p></td>
    </tr>
    <tr>
      <td style="text-align: left"><p><strong>Tables</strong></p></td>
      <td style="text-align: center"><p>Resizable columns with cell formatting</p></td>
      <td style="text-align: center"><p>✅ Available</p></td>
    </tr>
    <tr>
      <td style="text-align: left"><p><strong>YouTube Embeds</strong></p></td>
      <td style="text-align: center"><p>Direct video embedding</p></td>
      <td style="text-align: center"><p>✅ Available</p></td>
    </tr>
    <tr>
      <td style="text-align: left"><p><strong>Drag & Drop</strong></p></td>
      <td style="text-align: center"><p>Reorder content blocks</p></td>
      <td style="text-align: center"><p>✅ Available</p></td>
    </tr>
  </tbody>
</table>

<h2>YouTube Embeds</h2>
<p>Embed YouTube videos directly in your content:</p>
<div class="youtube-embed" data-youtube-video>
  <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" width="640" height="360" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
</div>

<h2>Installation Guide</h2>
<p>Get started with the editor in just a few steps:</p>

<h3>Clone and Install</h3>
<pre><code class="language-bash"># Clone the repository
git clone https://github.com/ndtrung341/next-tiptap.git

# Navigate to project directory
cd next-tiptap

# Install dependencies
pnpm install
# or
npm install
# or
yarn install
</code></pre>

<h3>Start Development</h3>
<pre><code class="language-bash"># Start development server
pnpm dev
# or
npm run dev
# or
yarn dev
</code></pre>

<h2>Editor Configuration</h2>
<p>Here's a complete example of setting up the editor with custom configuration:</p>

<pre><code class="language-tsx">import { useRef, useState } from 'react';
import TiptapEditor, { type TiptapEditorRef } from '@/components/tiptap-editor';

export default function MyApp() {
  const editorRef = useRef&lt;TiptapEditorRef&gt;(null);
  const [content, setContent] = useState('');

  const handleChange = (html: string) => {
    setContent(html);
  };

  const handleExport = () => {
    const editor = editorRef.current;
    if (editor) {
      console.log('HTML:', editor.getHTML());
      console.log('JSON:', editor.getJSON());
      console.log('Words:', editor.storage.characterCount.words());
    }
  };

  return (
    &lt;div className="container"&gt;
      &lt;TiptapEditor
        ref={editorRef}
        content={content}
        output="html"
        minHeight={320}
        maxHeight={640}
        onChange={handleChange}
        placeholder={{
          paragraph: 'Start typing...',
          imageCaption: 'Add a caption (optional)'
        }}
      /&gt;
      &lt;button onClick={handleExport}&gt;Export Content&lt;/button&gt;
    &lt;/div&gt;
  );
}
</code></pre>

<h2>Keyboard Shortcuts</h2>
<p>The editor supports common keyboard shortcuts for efficient editing:</p>
<ul>
  <li><p><code>Ctrl/Cmd + B</code> - <strong>Bold</strong></p></li>
  <li><p><code>Ctrl/Cmd + I</code> - <em>Italic</em></p></li>
  <li><p><code>Ctrl/Cmd + U</code> - <u>Underline</u></p></li>
  <li><p><code>Ctrl/Cmd + Shift + S</code> - <s>Strikethrough</s></p></li>
  <li><p><code>Ctrl/Cmd + E</code> - <code>Inline code</code></p></li>
  <li><p><code>Ctrl/Cmd + Z</code> - Undo</p></li>
  <li><p><code>Ctrl/Cmd + Shift + Z</code> - Redo</p></li>
</ul>

<figure>
  <img 
    src="https://images.unsplash.com/photo-1551650975-87deedd944c3?w=800&h=500&fit=crop" 
    alt="Code editor interface"
    data-width="800"
    data-height="500"
  />
  <figcaption>Modern code editor with syntax highlighting and IntelliSense</figcaption>
</figure>

<h2>Conclusion</h2>
<p>This editor provides a comprehensive set of features for creating rich, engaging content. Whether you're building a blog, documentation site, or content management system, it offers the flexibility and power you need.</p>

<p style="text-align: center"><em>Try editing this content to explore all the features! Visit the <a href="https://next-tiptap.vercel.app/" target="_blank">live demo</a> to see it in action.</em></p>

<p style="text-align: center"><strong>Built with ❤️ using Next.js and Tiptap</strong></p>
`;

// JSON
export const jsonMock = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Welcome to Rich Text Editor" }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "This comprehensive demo showcases all the powerful features of a modern rich text editor built with ",
        },
        { type: "text", marks: [{ type: "bold" }], text: "Tiptap" },
        { type: "text", text: " and " },
        { type: "text", marks: [{ type: "bold" }], text: "Radix UI" },
        {
          type: "text",
          text: ". Explore text formatting, media embedding, and advanced content structures.",
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Text Formatting" }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Rich text editors support various text styles: ",
        },
        { type: "text", marks: [{ type: "bold" }], text: "bold text" },
        { type: "text", text: ", " },
        { type: "text", marks: [{ type: "italic" }], text: "italic text" },
        { type: "text", text: ", " },
        {
          type: "text",
          marks: [{ type: "underline" }],
          text: "underlined text",
        },
        { type: "text", text: ", " },
        { type: "text", marks: [{ type: "strike" }], text: "strikethrough" },
        { type: "text", text: ", and " },
        { type: "text", marks: [{ type: "code" }], text: "inline code" },
        { type: "text", text: "." },
      ],
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "You can also use " },
        { type: "text", marks: [{ type: "subscript" }], text: "subscript" },
        { type: "text", text: " and " },
        { type: "text", marks: [{ type: "superscript" }], text: "superscript" },
        { type: "text", text: ", or combine styles: " },
        {
          type: "text",
          marks: [{ type: "bold" }, { type: "italic" }],
          text: "bold and italic",
        },
        { type: "text", text: ", " },
        {
          type: "text",
          marks: [{ type: "bold" }, { type: "underline" }],
          text: "bold and underline",
        },
        { type: "text", text: "." },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Headings Structure" }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Organize your content with multiple heading levels:",
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: "This is Heading 3" }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Headings help create a clear document hierarchy.",
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 4 },
      content: [{ type: "text", text: "This is Heading 4" }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Use appropriate heading levels for better structure.",
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 5 },
      content: [{ type: "text", text: "This is Heading 5" }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Even smaller headings are supported for detailed outlines.",
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Lists" }],
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: "Unordered Lists" }],
    },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "First item in the list" }],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                { type: "text", text: "Second item with " },
                { type: "text", marks: [{ type: "bold" }], text: "bold text" },
              ],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Third item with nested list:" }],
            },
            {
              type: "bulletList",
              content: [
                {
                  type: "listItem",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Nested item 1" }],
                    },
                  ],
                },
                {
                  type: "listItem",
                  content: [
                    {
                      type: "paragraph",
                      content: [
                        { type: "text", text: "Nested item 2 with " },
                        {
                          type: "text",
                          marks: [{ type: "italic" }],
                          text: "italic",
                        },
                      ],
                    },
                  ],
                },
                {
                  type: "listItem",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Nested item 3" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                { type: "text", text: "Fourth item with " },
                {
                  type: "text",
                  marks: [{ type: "code" }],
                  text: "inline code",
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: "Ordered Lists" }],
    },
    {
      type: "orderedList",
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                { type: "text", text: "First step: Install dependencies" },
              ],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                { type: "text", text: "Second step: Configure the editor" },
              ],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                { type: "text", text: "Third step: Customize extensions" },
              ],
            },
            {
              type: "orderedList",
              content: [
                {
                  type: "listItem",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Add StarterKit" }],
                    },
                  ],
                },
                {
                  type: "listItem",
                  content: [
                    {
                      type: "paragraph",
                      content: [
                        { type: "text", text: "Configure Image extension" },
                      ],
                    },
                  ],
                },
                {
                  type: "listItem",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Set up Table support" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                { type: "text", text: "Final step: Deploy your application" },
              ],
            },
          ],
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Text Alignment" }],
    },
    {
      type: "paragraph",
      attrs: { textAlign: "left" },
      content: [
        {
          type: "text",
          text: "This paragraph is left-aligned (default alignment for most text).",
        },
      ],
    },
    {
      type: "paragraph",
      attrs: { textAlign: "center" },
      content: [
        {
          type: "text",
          text: "This paragraph is center-aligned, perfect for titles or important statements.",
        },
      ],
    },
    {
      type: "paragraph",
      attrs: { textAlign: "right" },
      content: [
        {
          type: "text",
          text: "This paragraph is right-aligned, often used for signatures or timestamps.",
        },
      ],
    },
    {
      type: "paragraph",
      attrs: { textAlign: "justify" },
      content: [
        {
          type: "text",
          text: "This paragraph uses justified alignment. When you have longer text content, justified alignment distributes the words evenly across the line width, creating clean and professional-looking edges on both the left and right sides of the text block.",
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Text Styling" }],
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Customize your text with " },
        {
          type: "text",
          marks: [{ type: "textStyle", attrs: { color: "#ff0000" } }],
          text: "custom colors",
        },
        { type: "text", text: " and " },
        {
          type: "text",
          marks: [{ type: "textStyle", attrs: { backgroundColor: "#ffff00" } }],
          text: "background highlights",
        },
        { type: "text", text: " to emphasize important content." },
      ],
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "You can combine both: " },
        {
          type: "text",
          marks: [
            {
              type: "textStyle",
              attrs: { color: "#ffffff", backgroundColor: "#3b82f6" },
            },
          ],
          text: "Blue background with white text",
        },
        { type: "text", text: " creates a tag-like appearance." },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Links" }],
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Add " },
        {
          type: "text",
          marks: [
            {
              type: "link",
              attrs: {
                href: "https://tiptap.dev",
                target: "_blank",
                rel: "noopener noreferrer",
              },
            },
          ],
          text: "external links",
        },
        { type: "text", text: " to reference other resources, or create " },
        {
          type: "text",
          marks: [{ type: "link", attrs: { href: "#internal" } }],
          text: "internal links",
        },
        { type: "text", text: " for navigation within your document." },
      ],
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Links can also be " },
        {
          type: "text",
          marks: [
            { type: "bold" },
            {
              type: "link",
              attrs: {
                href: "https://github.com/ndtrung341/next-tiptap",
                target: "_blank",
              },
            },
          ],
          text: "combined with text formatting",
        },
        { type: "text", text: " for better visibility!" },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Images" }],
    },
    {
      type: "paragraph",
      content: [{ type: "text", text: "Images can be embedded in two ways:" }],
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: "Standalone Images" }],
    },
    {
      type: "paragraph",
      content: [{ type: "text", text: "Simple image without caption:" }],
    },
    {
      type: "image",
      attrs: {
        src: "https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?w=800&h=500&fit=crop",
        alt: "Developer workspace",
        naturalWidth: "800",
        naturalHeight: "500",
      },
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: "Images with Captions" }],
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Images wrapped in figure with caption:" },
      ],
    },
    {
      type: "imageFigure",
      content: [
        {
          type: "image",
          attrs: {
            src: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&h=500&fit=crop",
            alt: "Coding on laptop",
            naturalWidth: "800",
            naturalHeight: "500",
          },
        },
        {
          type: "imageCaption",
          content: [
            {
              type: "text",
              text: "A developer working on a modern laptop with dual monitors",
            },
          ],
        },
      ],
    },
    {
      type: "imageFigure",
      content: [
        {
          type: "image",
          attrs: {
            src: "https://images.unsplash.com/photo-1487058792275-0ad4aaf24ca7?w=800&h=500&fit=crop",
            alt: "Clean desk setup",
            naturalWidth: "800",
            naturalHeight: "500",
          },
        },
        {
          type: "imageCaption",
          content: [
            {
              type: "text",
              text: "Minimalist workspace setup with clean aesthetics",
            },
          ],
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Blockquotes" }],
    },
    {
      type: "blockquote",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: '"The best way to predict the future is to invent it." ',
            },
            { type: "text", marks: [{ type: "bold" }], text: "- Alan Kay" },
          ],
        },
      ],
    },
    {
      type: "blockquote",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Blockquotes are perfect for highlighting important quotes, testimonials, or citations. They can contain ",
            },
            { type: "text", marks: [{ type: "bold" }], text: "formatted text" },
            { type: "text", text: ", " },
            {
              type: "text",
              marks: [{ type: "italic" }],
              text: "multiple paragraphs",
            },
            { type: "text", text: ", and even other elements." },
          ],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "This is the second paragraph in the blockquote, demonstrating multi-paragraph support.",
            },
          ],
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Code Blocks" }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "The editor supports syntax-highlighted code blocks with language selection:",
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: "JavaScript Example" }],
    },
    {
      type: "codeBlock",
      attrs: { language: "javascript" },
      content: [
        {
          type: "text",
          text: "// Function to create a greeting\nfunction greetUser(name) {\n  const greeting = `Hello, ${name}! Welcome to Tiptap Editor.`;\n  console.log(greeting);\n  return greeting;\n}\n\n// Usage example\nconst message = greetUser('World');\nconsole.log(message);",
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: "React Component Example" }],
    },
    {
      type: "codeBlock",
      attrs: { language: "tsx" },
      content: [
        {
          type: "text",
          text: "import { useRef } from 'react';\nimport TiptapEditor, { type TiptapEditorRef } from '@/components/tiptap-editor';\n\nexport default function MyEditor() {\n  const editorRef = useRef<TiptapEditorRef>(null);\n\n  const handleChange = (content: string) => {\n    console.log('Content updated:', content);\n  };\n\n  return (\n    <TiptapEditor\n      ref={editorRef}\n      output=\"html\"\n      minHeight={320}\n      onChange={handleChange}\n      placeholder=\"Start typing...\"\n    />\n  );\n}",
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: "Python Example" }],
    },
    {
      type: "codeBlock",
      attrs: { language: "python" },
      content: [
        {
          type: "text",
          text: 'def fibonacci(n):\n    """Generate Fibonacci sequence up to n terms"""\n    a, b = 0, 1\n    result = []\n    \n    for _ in range(n):\n        result.append(a)\n        a, b = b, a + b\n    \n    return result\n\n# Generate first 10 Fibonacci numbers\nnumbers = fibonacci(10)\nprint(f"Fibonacci sequence: {numbers}")',
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: "CSS Styling" }],
    },
    {
      type: "codeBlock",
      attrs: { language: "css" },
      content: [
        {
          type: "text",
          text: ":root {\n  --rte-editor-min-height: 320px;\n  --rte-editor-max-height: 640px;\n  --rte-editor-max-width: 700px;\n}\n\n.editor-container {\n  display: flex;\n  flex-direction: column;\n  gap: 1rem;\n  padding: 2rem;\n  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);\n  border-radius: 8px;\n  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);\n}\n\n.editor-content:hover {\n  transform: translateY(-2px);\n  transition: transform 0.2s ease;\n}",
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Tables" }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Create and edit tables with cell alignment and formatting:",
        },
      ],
    },
    {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            {
              type: "tableHeader",
              attrs: { textAlign: "left" },
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Feature" }],
                },
              ],
            },
            {
              type: "tableHeader",
              attrs: { textAlign: "center" },
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Description" }],
                },
              ],
            },
            {
              type: "tableHeader",
              attrs: { textAlign: "center" },
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Status" }],
                },
              ],
            },
          ],
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              attrs: { textAlign: "left" },
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      marks: [{ type: "bold" }],
                      text: "Text Formatting",
                    },
                  ],
                },
              ],
            },
            {
              type: "tableCell",
              attrs: { textAlign: "center" },
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: "Bold, italic, underline, strikethrough, code",
                    },
                  ],
                },
              ],
            },
            {
              type: "tableCell",
              attrs: { textAlign: "center" },
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "✅ Available" }],
                },
              ],
            },
          ],
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              attrs: { textAlign: "left" },
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      marks: [{ type: "bold" }],
                      text: "Code Blocks",
                    },
                  ],
                },
              ],
            },
            {
              type: "tableCell",
              attrs: { textAlign: "center" },
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: "Syntax highlighting for 50+ languages",
                    },
                  ],
                },
              ],
            },
            {
              type: "tableCell",
              attrs: { textAlign: "center" },
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "✅ Available" }],
                },
              ],
            },
          ],
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              attrs: { textAlign: "left" },
              content: [
                {
                  type: "paragraph",
                  content: [
                    { type: "text", marks: [{ type: "bold" }], text: "Images" },
                  ],
                },
              ],
            },
            {
              type: "tableCell",
              attrs: { textAlign: "center" },
              content: [
                {
                  type: "paragraph",
                  content: [
                    { type: "text", text: "Upload, resize, and add captions" },
                  ],
                },
              ],
            },
            {
              type: "tableCell",
              attrs: { textAlign: "center" },
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "✅ Available" }],
                },
              ],
            },
          ],
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              attrs: { textAlign: "left" },
              content: [
                {
                  type: "paragraph",
                  content: [
                    { type: "text", marks: [{ type: "bold" }], text: "Tables" },
                  ],
                },
              ],
            },
            {
              type: "tableCell",
              attrs: { textAlign: "center" },
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: "Resizable columns with cell formatting",
                    },
                  ],
                },
              ],
            },
            {
              type: "tableCell",
              attrs: { textAlign: "center" },
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "✅ Available" }],
                },
              ],
            },
          ],
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              attrs: { textAlign: "left" },
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      marks: [{ type: "bold" }],
                      text: "YouTube Embeds",
                    },
                  ],
                },
              ],
            },
            {
              type: "tableCell",
              attrs: { textAlign: "center" },
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Direct video embedding" }],
                },
              ],
            },
            {
              type: "tableCell",
              attrs: { textAlign: "center" },
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "✅ Available" }],
                },
              ],
            },
          ],
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              attrs: { textAlign: "left" },
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      marks: [{ type: "bold" }],
                      text: "Drag & Drop",
                    },
                  ],
                },
              ],
            },
            {
              type: "tableCell",
              attrs: { textAlign: "center" },
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Reorder content blocks" }],
                },
              ],
            },
            {
              type: "tableCell",
              attrs: { textAlign: "center" },
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "✅ Available" }],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "YouTube Embeds" }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Embed YouTube videos directly in your content:",
        },
      ],
    },
    {
      type: "youtube",
      attrs: {
        src: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        width: 640,
        height: 360,
      },
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Installation Guide" }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Get started with the editor in just a few steps:",
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: "Clone and Install" }],
    },
    {
      type: "codeBlock",
      attrs: { language: "bash" },
      content: [
        {
          type: "text",
          text: "# Clone the repository\ngit clone https://github.com/ndtrung341/next-tiptap.git\n\n# Navigate to project directory\ncd next-tiptap\n\n# Install dependencies\npnpm install\n# or\nnpm install\n# or\nyarn install",
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: "Start Development" }],
    },
    {
      type: "codeBlock",
      attrs: { language: "bash" },
      content: [
        {
          type: "text",
          text: "# Start development server\npnpm dev\n# or\nnpm run dev\n# or\nyarn dev",
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Editor Configuration" }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Here's a complete example of setting up the editor with custom configuration:",
        },
      ],
    },
    {
      type: "codeBlock",
      attrs: { language: "tsx" },
      content: [
        {
          type: "text",
          text: "import { useRef, useState } from 'react';\nimport TiptapEditor, { type TiptapEditorRef } from '@/components/tiptap-editor';\n\nexport default function MyApp() {\n  const editorRef = useRef<TiptapEditorRef>(null);\n  const [content, setContent] = useState('');\n\n  const handleChange = (html: string) => {\n    setContent(html);\n  };\n\n  const handleExport = () => {\n    const editor = editorRef.current;\n    if (editor) {\n      console.log('HTML:', editor.getHTML());\n      console.log('JSON:', editor.getJSON());\n      console.log('Words:', editor.storage.characterCount.words());\n    }\n  };\n\n  return (\n    <div className=\"container\">\n      <TiptapEditor\n        ref={editorRef}\n        content={content}\n        output=\"html\"\n        minHeight={320}\n        maxHeight={640}\n        onChange={handleChange}\n        placeholder={{\n          paragraph: 'Start typing...',\n          imageCaption: 'Add a caption (optional)'\n        }}\n      />\n      <button onClick={handleExport}>Export Content</button>\n    </div>\n  );\n}",
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Keyboard Shortcuts" }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "The editor supports common keyboard shortcuts for efficient editing:",
        },
      ],
    },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  marks: [{ type: "code" }],
                  text: "Ctrl/Cmd + B",
                },
                { type: "text", text: " - " },
                { type: "text", marks: [{ type: "bold" }], text: "Bold" },
              ],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  marks: [{ type: "code" }],
                  text: "Ctrl/Cmd + I",
                },
                { type: "text", text: " - " },
                { type: "text", marks: [{ type: "italic" }], text: "Italic" },
              ],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  marks: [{ type: "code" }],
                  text: "Ctrl/Cmd + U",
                },
                { type: "text", text: " - " },
                {
                  type: "text",
                  marks: [{ type: "underline" }],
                  text: "Underline",
                },
              ],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  marks: [{ type: "code" }],
                  text: "Ctrl/Cmd + Shift + S",
                },
                { type: "text", text: " - " },
                {
                  type: "text",
                  marks: [{ type: "strike" }],
                  text: "Strikethrough",
                },
              ],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  marks: [{ type: "code" }],
                  text: "Ctrl/Cmd + E",
                },
                { type: "text", text: " - " },
                {
                  type: "text",
                  marks: [{ type: "code" }],
                  text: "Inline code",
                },
              ],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  marks: [{ type: "code" }],
                  text: "Ctrl/Cmd + Z",
                },
                { type: "text", text: " - Undo" },
              ],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  marks: [{ type: "code" }],
                  text: "Ctrl/Cmd + Shift + Z",
                },
                { type: "text", text: " - Redo" },
              ],
            },
          ],
        },
      ],
    },
    {
      type: "imageFigure",
      content: [
        {
          type: "image",
          attrs: {
            src: "https://images.unsplash.com/photo-1551650975-87deedd944c3?w=800&h=500&fit=crop",
            alt: "Code editor interface",
            naturalWidth: "800",
            naturalHeight: "500",
          },
        },
        {
          type: "imageCaption",
          content: [
            {
              type: "text",
              text: "Modern code editor with syntax highlighting and IntelliSense",
            },
          ],
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Conclusion" }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "This editor provides a comprehensive set of features for creating rich, engaging content. Whether you're building a blog, documentation site, or content management system, it offers the flexibility and power you need.",
        },
      ],
    },
    {
      type: "paragraph",
      attrs: { textAlign: "center" },
      content: [
        {
          type: "text",
          marks: [{ type: "italic" }],
          text: "Try editing this content to explore all the features! Visit the ",
        },
        {
          type: "text",
          marks: [
            { type: "italic" },
            {
              type: "link",
              attrs: {
                href: "https://next-tiptap.vercel.app/",
                target: "_blank",
              },
            },
          ],
          text: "live demo",
        },
        {
          type: "text",
          marks: [{ type: "italic" }],
          text: " to see it in action.",
        },
      ],
    },
    {
      type: "paragraph",
      attrs: { textAlign: "center" },
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Built with ❤️ using Next.js and Tiptap",
        },
      ],
    },
  ],
};

export const mockData = {
  title: "Rich Text Editor Features Demo",
  html: htmlMock,
  json: jsonMock,
  wordCount: 892,
  cover:
    "https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?w=1200&h=800&fit=crop",
  author: "Demo Content",
  createdAt: "Nov 10, 2025",
  readingTime: 5,
};
