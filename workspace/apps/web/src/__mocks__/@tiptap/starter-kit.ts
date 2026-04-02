import { vi } from 'vitest';

// Mock StarterKit extension
const StarterKit = vi.fn(() => ({
  name: 'starterKit',
  options: {},
  storage: {},
  type: 'extension',
}));

export default StarterKit;