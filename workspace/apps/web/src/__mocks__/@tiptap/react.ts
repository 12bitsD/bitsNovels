import { vi } from 'vitest';
import React from 'react';

// Mock EditorContent component
export const EditorContent = vi.fn(() => {
  return React.createElement('div', {
    'data-testid': 'tiptap-editor-content',
    'contentEditable': true,
    'suppressContentEditableWarning': true,
  });
});

// Mock useEditor hook
export const useEditor = vi.fn(() => ({
  commands: {
    setContent: vi.fn(),
    getContent: vi.fn(() => ''),
    focus: vi.fn(),
    blur: vi.fn(),
    clearContent: vi.fn(),
    insertContent: vi.fn(),
  },
  isActive: vi.fn(() => false),
  can: vi.fn(() => ({
    chain: vi.fn(() => ({
      // @ts-expect-error typecheck fix
      focus: vi.fn().returnThis(),
      run: vi.fn(),
    })),
  })),
  chain: vi.fn(() => ({
    // @ts-expect-error typecheck fix
    focus: vi.fn().returnThis(),
    run: vi.fn(),
  })),
  getHTML: vi.fn(() => ''),
  getJSON: vi.fn(() => ({})),
  getText: vi.fn(() => ''),
  storage: {},
  extensionManager: {
    extensions: [],
  },
  isEditable: true,
  isDestroyed: false,
  isEmpty: true,
  options: {},
}));

// Mock Editor provider
export const EditorProvider = vi.fn(({ children }) => {
  return React.createElement(React.Fragment, null, children);
});

// Mock Editor instance type
export const Editor = vi.fn();