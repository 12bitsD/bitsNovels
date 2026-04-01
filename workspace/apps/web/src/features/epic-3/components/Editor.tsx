import { EditorContent } from '@tiptap/react';
import { useTipTapEditor } from '../utils/editorConfig';

export interface EditorProps {
  initialContent?: string;
  onChange?: (content: string) => void;
  editable?: boolean;
}

export function Editor({ initialContent = '', onChange, editable = true }: EditorProps) {
  const handleUpdate = (content: string) => {
    if (onChange) {
      onChange(content);
    }
  };

  const editor = useTipTapEditor({
    initialContent,
    onUpdate: handleUpdate,
    editable,
  });

  if (!editor) {
    return (
      <div className="min-h-[300px] bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 animate-pulse">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 m-4"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 m-4"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6 m-4"></div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
      <EditorContent
        editor={editor}
        className="min-h-[300px]"
      />
    </div>
  );
}
