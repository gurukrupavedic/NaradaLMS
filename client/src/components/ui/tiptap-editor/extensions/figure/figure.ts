/** @jsxImportSource @tiptap/core */
import { NodeType } from "@tiptap/pm/model";
import { mergeAttributes, Node, type Editor } from "@tiptap/react";

export interface FigureOptions {
  HTMLAttributes: Record<string, any>;
}

export const Figure = Node.create<FigureOptions>({
  name: "figure",
  group: "block",
  content: "block+",
  selectable: true,
  draggable: false,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  parseHTML() {
    return [{ tag: "figure" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["figure", mergeAttributes(HTMLAttributes), 0];
  },

  addKeyboardShortcuts() {
    return {
      Backspace: ({ editor }) => handleBackspace(editor, this.type),
      Delete: ({ editor }) => handleDelete(editor, this.type),
      Enter: ({ editor }) => handleEnter(editor, this.type),
    };
  },
});

export default Figure;

const handleEnter = (editor: Editor, nodeType: NodeType) => {
  const { selection } = editor.state;
  const { $from } = selection;

  if ($from.parent.type === nodeType) {
    const pos = $from.end();
    return editor
      .chain()
      .focus(pos)
      .insertContentAt(pos, { type: "paragraph" })
      .run();
  }

  return false;
};

const handleDelete = (editor: Editor, nodeType: NodeType) => {
  const { selection, doc } = editor.state;
  const { $from } = selection;

  if ($from.pos === 1) {
    return false;
  }

  // If the current parent is the targeted node type, delete it
  if ($from.parent.type === nodeType) {
    return editor.commands.deleteNode(nodeType);
  }

  // Check if the cursor is at the end of the current block
  const isAtEnd =
    selection.empty && $from.parentOffset === $from.parent.nodeSize - 2;
  if (isAtEnd) {
    const $pos = doc.resolve($from.pos + 1); // Resolve the position after the current block
    const nodeAfter = $pos.nodeAfter; // Get the node after the resolved position

    if (nodeAfter?.type !== nodeType) {
      return false;
    }

    return editor.chain().setNodeSelection($pos.pos).run();
  }

  return false;
};

const handleBackspace = (editor: Editor, nodeType: NodeType) => {
  const { selection, doc } = editor.state;
  const { $from } = selection;

  if ($from.parent.type === nodeType) {
    return editor.commands.deleteNode(nodeType);
  }

  // Check if the cursor is at the start of the current block
  const isAtStart = selection.empty && $from.parentOffset === 0;
  if (isAtStart) {
    const $pos = doc.resolve($from.pos - 1); // Resolve the position before the current block
    const nodeBefore = $pos.nodeBefore; // Get the node after the resolved position

    if (nodeBefore?.type !== nodeType) {
      return false;
    }

    return editor
      .chain()
      .command(({ chain }) => {
        return (
          $from.parent.textContent.length > 0 ||
          chain().deleteCurrentNode().run()
        );
      })
      .setNodeSelection($pos.pos - nodeBefore.nodeSize)
      .run();
  }

  return false;
};
