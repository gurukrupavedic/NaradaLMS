import { useState } from "react";
import { TiptapEditor } from "./index";

export default function TiptapV3TestPage() {
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [content, setContent] = useState(`
    <h2>Welcome to Rich Text Editor</h2>
    <p>This comprehensive demo showcases all the powerful features of a modern rich text editor built with <strong>Tiptap</strong> and <strong>Radix UI</strong>. Explore text formatting, media embedding, and advanced content structures.</p>
    
    <h3>Text Formatting</h3>
    <p>Rich text editors support various text styles: <strong>bold text</strong>, <em>italic text</em>, <u>underlined text</u>, <s>strikethrough</s>, and <code>inline code</code>.</p>
    
    <p>You can also use <sub>subscript</sub> and <sup>superscript</sup>, or combine styles: <strong><em>bold and italic</em></strong>, <strong><u>bold and underline</u></strong>.</p>
    
    <h3>Headings Structure</h3>
    <p>Organize your content with multiple heading levels:</p>
    
    <h4>This is Heading 4</h4>
    <p>Headings help create a clear document hierarchy.</p>
  `);

    return (
        <div className={isDarkMode ? "dark" : ""}>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8 transition-colors duration-200">
                <div className="max-w-4xl mx-auto">
                    <div className="mb-8 flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                                Tiptap v3 Editor Prototype
                            </h1>
                            <p className="text-gray-600 dark:text-gray-400">
                                Testing Tiptap v3.10.0 with React 18 in VedicLMS
                            </p>
                        </div>
                        <button
                            onClick={() => setIsDarkMode(!isDarkMode)}
                            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                        >
                            {isDarkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}
                        </button>
                    </div>

                    <TiptapEditor
                        content={content}
                        onChange={(newContent) => setContent(newContent as string)}
                        output="html"
                        placeholder="Start typing..."
                    />


                </div>
            </div>
        </div>
    );
}
