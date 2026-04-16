import '@testing-library/jest-dom/vitest';
import { beforeAll, afterEach, afterAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { createElement } from 'react';
import type { ReactNode } from 'react';
import { queryClient } from '../api/client';

vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({
      children,
    }: {
      children: ReactNode | ((size: { width: number; height: number }) => ReactNode);
    }) =>
      createElement(
        'div',
        { 'data-testid': 'mock-responsive-container', style: { width: 800, height: 320 } },
        typeof children === 'function'
          ? children({ width: 800, height: 320 })
          : children,
      ),
  };
});

const storageMock = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(globalThis, 'localStorage', {
  value: storageMock,
  writable: true,
});

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: storageMock,
    writable: true,
  });
}

const { server } = await import('../mocks/server');

export { server };

const LOCALSTORAGE_FILE_WARNING = '`--localstorage-file` was provided without a valid path';
const originalEmitWarning = process.emitWarning.bind(process);

beforeAll(() => {
  process.emitWarning = ((warning: string | Error, ...args: unknown[]) => {
    const message = typeof warning === 'string' ? warning : warning.message;
    if (message.includes(LOCALSTORAGE_FILE_WARNING)) {
      return;
    }
    originalEmitWarning(warning, ...(args as []));
  }) as typeof process.emitWarning;

  server.listen({ onUnhandledRequest: 'bypass' });
});
afterEach(() => {
  server.resetHandlers();
  queryClient.clear();
  cleanup();
});
afterAll(() => {
  process.emitWarning = originalEmitWarning;
  server.close();
});
