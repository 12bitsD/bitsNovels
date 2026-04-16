import { Node } from '@tiptap/core';

export const AIDraftNode = Node.create({
  name: 'aiDraft',

  group: 'block',
  content: 'text*',
  defining: true,
  selectable: false,

  addAttributes() {
    return {
      draftId: {
        default: null,
      },
      status: {
        default: 'generating',
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-ai-draft]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      {
        ...HTMLAttributes,
        'data-ai-draft': 'true',
        class:
          'my-3 rounded-md border border-[var(--color-amber)]/25 bg-[var(--color-amber-light)]/30 px-3 py-2 text-[var(--color-text-primary)]',
      },
      0,
    ];
  },
});

