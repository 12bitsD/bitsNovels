import { useState, useEffect, useCallback } from 'react';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import CharacterCount from '@tiptap/extension-character-count';
import { EditorContent } from '@tiptap/react';
import { StatusBar } from './StatusBar';
import { useAutoSave } from '../hooks/useAutoSave';
import { calculateWordCount, calculateSelectionCount, type SaveSource } from '../utils/editorConfig';
import { client } from '../../../api/client';

export interface EditorWorkspaceProps {
  projectId: string;
  chapterId: string;
  initialContent?: string;
  initialTitle?: string;
}

export function EditorWorkspace({ projectId, chapterId, initialContent = '', initialTitle = '' }: EditorWorkspaceProps) {
  const [title, setTitle] = useState(initialTitle);
  const [wordCount, setWordCount] = useState(0);
  const [selectionCount, setSelectionCount] = useState(0);

  const handleSave = useCallback(async (content: string, source: SaveSource) => {
    const { error } = await client.PATCH(`/api/projects/${projectId}/chapters/${chapterId}`, {
      body: {
        content,
        title,
        saveSource: source,
      },
    });

    if (error) {
      throw new Error('Save failed');
    }
  }, [projectId, chapterId, title]);

  const { saveStatus, lastSavedAt, saveNow } = useAutoSave({
    content: initialContent,
    onSave: handleSave,
    debounceMs: 3000,
    maxRetries: 3,
  });

  const editor = useEditor({
    extensions: [
      StarterKit,
      CharacterCount,
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      const content = JSON.stringify(json);
      setWordCount(calculateWordCount(content));
    },
    onSelectionUpdate: ({ editor }) => {
      setSelectionCount(calculateSelectionCount(editor));
    },
    editorProps: {
      attributes: {
        class: 'prose prose-slate dark:prose-invert max-w-none focus:outline-none min-h-[400px] p-6',
      },
    },
  });

  useEffect(() => {
    if (editor) {
      const json = editor.getJSON();
      const content = JSON.stringify(json);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWordCount(calculateWordCount(content));
    }
  }, [editor]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        saveNow();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [saveNow]);

  if (!editor) {
    return (
      <div className="max-w-[800px] mx-auto p-4">
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-6"></div>
          <div className="h-[400px] bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[800px] mx-auto">
      <div className="mb-6">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="章节标题"
          className="w-full text-2xl font-bold bg-transparent border-0 border-b-2 border-transparent focus:border-amber-500 focus:outline-none px-0 py-2 text-ink dark:text-gray-100 placeholder-gray-400"
        />
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <EditorContent editor={editor} className="min-h-[400px]" />
        <StatusBar
          wordCount={wordCount}
          selectionCount={selectionCount}
          saveStatus={saveStatus}
          lastSavedAt={lastSavedAt}
        />
      </div>

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 space-y-1">
        <p>快捷键: <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">Ctrl+S</kbd> 保存</p>
        <p>Markdown 支持: **加粗** *斜体* ## 标题</p>
      </div>
    </div>
  );
}
