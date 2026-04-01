import { useEditor, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import CharacterCount from '@tiptap/extension-character-count';

export type SaveSource = 'auto' | 'manual';

export interface UseTipTapEditorOptions {
  initialContent?: string;
  onUpdate?: (content: string) => void;
  editable?: boolean;
}

export function useTipTapEditor(options: UseTipTapEditorOptions = {}) {
  const { initialContent = '', onUpdate, editable = true } = options;

  const editor = useEditor({
    extensions: [
      StarterKit,
      CharacterCount,
    ],
    content: initialContent,
    editable,
    onUpdate: ({ editor }) => {
      if (onUpdate) {
        const json = editor.getJSON();
        onUpdate(JSON.stringify(json));
      }
    },
    editorProps: {
      attributes: {
        class: 'prose prose-slate dark:prose-invert max-w-none focus:outline-none min-h-[300px] p-4',
      },
      handlePaste: (view, event) => {
        const clipboardData = event.clipboardData;
        if (!clipboardData) return false;

        const text = clipboardData.getData('text/plain');
        const html = clipboardData.getData('text/html');

        if (html && !text) {
          event.preventDefault();
          const cleanedText = html.replace(/<[^>]+>/g, '');
          view.dispatch(view.state.tr.insertText(cleanedText));
          return true;
        }

        return false;
      },
    },
  });

  return editor;
}

export function calculateWordCount(content: string): number {
  if (!content) return 0;

  try {
    const parsed = JSON.parse(content);
    const plainText = extractPlainTextFromJSON(parsed);
    return calculateCharCount(plainText);
  } catch {
    return calculateCharCount(content);
  }
}

function extractPlainTextFromJSON(node: unknown): string {
  if (typeof node === 'string') {
    return node;
  }

  if (Array.isArray(node)) {
    return node.map(extractPlainTextFromJSON).join('');
  }

  if (node && typeof node === 'object') {
    const obj = node as Record<string, unknown>;
    if (obj.text && typeof obj.text === 'string') {
      return obj.text;
    }
    if (obj.content && Array.isArray(obj.content)) {
      return obj.content.map(extractPlainTextFromJSON).join('');
    }
  }

  return '';
}

function calculateCharCount(text: string): number {
  const textWithoutHtml = text.replace(/<[^>]+>/g, '');
  
  let count = 0;
  for (const char of textWithoutHtml) {
    if (/[\u4e00-\u9fff]/.test(char)) {
      count++;
    } else if (/[a-zA-Z0-9]/.test(char)) {
      count++;
    } else if (/[\u3000-\u303F\uFF00-\uFFEF\u2000-\u206F]/.test(char)) {
      count++;
    }
  }
  
  return count;
}

export function calculateSelectionCount(editor: Editor | null): number {
  if (!editor) return 0;

  const { from, to, empty } = editor.state.selection;
  if (empty) return 0;

  const selectedText = editor.state.doc.textBetween(from, to);
  return calculateCharCount(selectedText);
}
