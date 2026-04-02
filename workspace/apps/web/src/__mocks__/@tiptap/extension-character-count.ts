import { vi } from 'vitest';

// Mock CharacterCount extension
const CharacterCount = vi.fn(() => ({
  name: 'characterCount',
  options: {},
  storage: {},
  type: 'extension',
}));

export default CharacterCount;