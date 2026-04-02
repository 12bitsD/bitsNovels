import type { ReactNode, KeyboardEvent } from 'react';
import { useFocusMode } from '../../hooks/useFocusMode';

export interface FocusModeProps {
  editorContent: ReactNode;
  statusBar: ReactNode;
  theme?: 'light' | 'dark' | 'sepia';
  onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void;
}

const themeBackgrounds = {
  light: 'bg-[#F5F0E8]',
  dark: 'bg-[#1A1714]',
  sepia: 'bg-[#F5F0E8]',
};

const statusBarBackgrounds = {
  light: 'bg-[#E8D9B8]',
  dark: 'bg-[#232019]',
  sepia: 'bg-[#E8D9B8]',
};

export function FocusMode({
  editorContent,
  statusBar,
  theme = 'light',
  onKeyDown,
}: FocusModeProps) {
  const { isFocusMode, exitFocusMode } = useFocusMode();

  if (!isFocusMode) {
    return (
      <div className="w-full">
        {editorContent}
        {statusBar}
      </div>
    );
  }

  return (
    <div
      data-testid="focus-mode-overlay"
      className={`fixed inset-0 z-50 ${themeBackgrounds[theme]} flex flex-col`}
      onKeyDown={onKeyDown}
    >
      <div className="flex-1 overflow-auto">
        <div
          data-testid="focus-mode-editor-container"
          className="max-w-[800px] mx-auto px-6 py-8"
        >
          {editorContent}
        </div>
      </div>

      <div
        data-testid="focus-mode-status-container"
        className={`${statusBarBackgrounds[theme]} opacity-60`}
      >
        <div className="max-w-[800px] mx-auto">
          {statusBar}
        </div>
      </div>

      <button
        data-testid="focus-mode-exit-button"
        onClick={exitFocusMode}
        className="fixed top-4 right-4 px-4 py-2 bg-white/10 hover:bg-white/20 text-gray-600 dark:text-gray-300 rounded-lg backdrop-blur-sm transition-colors duration-200 opacity-0 hover:opacity-100 focus:opacity-100"
        title="退出专注模式 (Esc)"
      >
        <span className="flex items-center gap-2">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
          退出专注
        </span>
      </button>
    </div>
  );
}
