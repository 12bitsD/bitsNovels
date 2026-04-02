import { useState, useCallback, useEffect } from 'react';

export interface UseFocusModeReturn {
  isFocusMode: boolean;
  enterFocusMode: () => Promise<void>;
  exitFocusMode: () => Promise<void>;
  toggleFocusMode: () => Promise<void>;
}

export function useFocusMode(): UseFocusModeReturn {
  const [isFocusMode, setIsFocusMode] = useState(false);

  const enterFocusMode = useCallback(async () => {
    setIsFocusMode(true);

    if (document.documentElement.requestFullscreen) {
      try {
        await document.documentElement.requestFullscreen();
      } catch {
      }
    }
  }, []);

  const exitFocusMode = useCallback(async () => {
    setIsFocusMode(false);

    if (document.exitFullscreen && document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
      }
    }
  }, []);

  const toggleFocusMode = useCallback(async () => {
    if (isFocusMode) {
      await exitFocusMode();
    } else {
      await enterFocusMode();
    }
  }, [isFocusMode, enterFocusMode, exitFocusMode]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'F11') {
        event.preventDefault();
        toggleFocusMode();
      } else if (event.key === 'Escape' && isFocusMode) {
        exitFocusMode();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFocusMode, toggleFocusMode, exitFocusMode]);

  return {
    isFocusMode,
    enterFocusMode,
    exitFocusMode,
    toggleFocusMode,
  };
}
