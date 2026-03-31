import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  useTipTapEditor,
  calculateWordCount,
  calculateSelectionCount,
} from '../utils/editorConfig';

vi.mock('@tiptap/react', () => ({
  useEditor: vi.fn((options) => ({
    getJSON: () => options?.content || { type: 'doc', content: [] },
    getHTML: () => '<p></p>',
    isEditable: options?.editable ?? true,
    state: {
      selection: { from: 0, to: 0, empty: true },
      doc: { textBetween: () => '' },
    },
    _options: options,
  })),
}));

describe('editorConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useTipTapEditor', () => {
    it('should create editor with default options', async () => {
      const { useEditor } = await import('@tiptap/react');
      const mockedUseEditor = vi.mocked(useEditor);
      
      renderHook(() => useTipTapEditor());

      expect(mockedUseEditor).toHaveBeenCalledWith(
        expect.objectContaining({ content: '', editable: true })
      );
    });

    it('should create editor with initial content', async () => {
      const { useEditor } = await import('@tiptap/react');
      const mockedUseEditor = vi.mocked(useEditor);
      
      renderHook(() => useTipTapEditor({ initialContent: '<p>Hello World</p>' }));

      expect(mockedUseEditor).toHaveBeenCalledWith(
        expect.objectContaining({ content: '<p>Hello World</p>' })
      );
    });

    it('should create editor with editable false', async () => {
      const { useEditor } = await import('@tiptap/react');
      const mockedUseEditor = vi.mocked(useEditor);
      
      renderHook(() => useTipTapEditor({ editable: false }));

      expect(mockedUseEditor).toHaveBeenCalledWith(
        expect.objectContaining({ editable: false })
      );
    });

    it('should call onUpdate callback when content changes', async () => {
      const onUpdate = vi.fn();
      const { useEditor } = await import('@tiptap/react');
      let capturedUpdate: (({ editor }: { editor: { getJSON: () => unknown } }) => void) | undefined;
      
      vi.mocked(useEditor).mockImplementationOnce((options) => {
        capturedUpdate = options?.onUpdate;
        return { getJSON: () => ({ type: 'doc', content: [] }), isEditable: true } as unknown as ReturnType<typeof useEditor>;
      });

      renderHook(() => useTipTapEditor({ onUpdate }));

      if (capturedUpdate) {
        capturedUpdate({ editor: { getJSON: () => ({ type: 'doc', content: [] }) } });
      }

      expect(onUpdate).toHaveBeenCalled();
    });

    it('should include StarterKit and CharacterCount extensions', async () => {
      const { useEditor } = await import('@tiptap/react');
      renderHook(() => useTipTapEditor());

      const callArgs = vi.mocked(useEditor).mock.calls[0][0];
      expect(callArgs.extensions).toHaveLength(2);
    });

    it('should apply correct editorProps attributes', async () => {
      const { useEditor } = await import('@tiptap/react');
      renderHook(() => useTipTapEditor());

      const callArgs = vi.mocked(useEditor).mock.calls[0][0];
      expect(callArgs.editorProps.attributes.class).toContain('prose');
      expect(callArgs.editorProps.attributes.class).toContain('min-h-[300px]');
    });
  });

  describe('calculateWordCount', () => {
    it('should return 0 for empty content', () => {
      expect(calculateWordCount('')).toBe(0);
    });

    it('should count Chinese characters', () => {
      const content = JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '你好世界' }] }] });
      expect(calculateWordCount(content)).toBe(4);
    });

    it('should count English words', () => {
      const content = JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello World' }] }] });
      expect(calculateWordCount(content)).toBe(10);
    });

    it('should count mixed Chinese and English', () => {
      const content = JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello你好World世界' }] }] });
      expect(calculateWordCount(content)).toBe(14);
    });

    it('should count numbers', () => {
      const content = JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '12345' }] }] });
      expect(calculateWordCount(content)).toBe(5);
    });

    it('should handle plain text input', () => {
      expect(calculateWordCount('Hello World')).toBe(10);
    });

    it('should ignore HTML tags', () => {
      expect(calculateWordCount('<p>Hello</p><div>World</div>')).toBe(10);
    });

    it('should ignore punctuation', () => {
      const content = JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello, World!' }] }] });
      expect(calculateWordCount(content)).toBe(10);
    });

    it('should handle nested content structure', () => {
      const content = JSON.stringify({
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'First' }, { type: 'text', text: 'Second' }] }],
      });
      expect(calculateWordCount(content)).toBe(11);
    });

    it('should handle invalid JSON gracefully', () => {
      expect(calculateWordCount('not valid json')).toBe(12);
    });

    it('should handle Chinese punctuation', () => {
      const content = JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '你好，世界！' }] }] });
      expect(calculateWordCount(content)).toBe(6);
    });

    it('should handle empty content array', () => {
      const content = JSON.stringify({ type: 'doc', content: [] });
      expect(calculateWordCount(content)).toBe(0);
    });

    it('should handle deeply nested content', () => {
      const content = JSON.stringify({
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Deep', marks: [{ type: 'bold' }] }] }],
      });
      expect(calculateWordCount(content)).toBe(4);
    });

    it('should handle array node content', () => {
      const content = JSON.stringify({ type: 'doc', content: ['Hello', 'World'] });
      expect(calculateWordCount(content)).toBe(10);
    });

    it('should handle string node directly', () => {
      const content = JSON.stringify('Hello World');
      expect(calculateWordCount(content)).toBe(10);
    });

    it('should handle unicode fullwidth characters', () => {
      const content = JSON.stringify({ type: 'doc', content: [{ type: 'text', text: 'ＡＢＣ' }] });
      expect(calculateWordCount(content)).toBe(3);
    });

    it('should handle whitespace-only content', () => {
      expect(calculateWordCount('   ')).toBe(0);
    });
  });

  describe('calculateSelectionCount', () => {
    it('should return 0 when editor is null', () => {
      expect(calculateSelectionCount(null)).toBe(0);
    });

    it('should return 0 when selection is empty', () => {
      const mockEditor = {
        state: {
          selection: { from: 0, to: 0, empty: true },
          doc: { textBetween: () => '' },
        },
      };
      expect(calculateSelectionCount(mockEditor as unknown as import('@tiptap/react').Editor)).toBe(0);
    });

    it('should count selected text', () => {
      const mockEditor = {
        state: {
          selection: { from: 0, to: 11, empty: false },
          doc: { textBetween: () => 'Hello World' },
        },
      };
      expect(calculateSelectionCount(mockEditor as unknown as import('@tiptap/react').Editor)).toBe(10);
    });

    it('should count Chinese selection', () => {
      const mockEditor = {
        state: {
          selection: { from: 0, to: 4, empty: false },
          doc: { textBetween: () => '你好世界' },
        },
      };
      expect(calculateSelectionCount(mockEditor as unknown as import('@tiptap/react').Editor)).toBe(4);
    });

    it('should handle selection with punctuation', () => {
      const mockEditor = {
        state: {
          selection: { from: 0, to: 13, empty: false },
          doc: { textBetween: () => 'Hello, World!' },
        },
      };
      expect(calculateSelectionCount(mockEditor as unknown as import('@tiptap/react').Editor)).toBe(10);
    });

    it('should handle empty selection text', () => {
      const mockEditor = {
        state: {
          selection: { from: 5, to: 5, empty: false },
          doc: { textBetween: () => '' },
        },
      };
      expect(calculateSelectionCount(mockEditor as unknown as import('@tiptap/react').Editor)).toBe(0);
    });
  });
});
