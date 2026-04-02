import { useState, useEffect, useCallback } from 'react';

export type ThemeMode = 'light' | 'dark' | 'sepia';
export type FontOption = 'system' | 'serif' | 'sans' | 'kai' | 'mono';
export type LineSpacing = 1.5 | 1.75 | 2.0;

export interface ThemeConfig {
  themeMode: ThemeMode;
  fontFamily: FontOption;
  fontSize: number;
  lineSpacing: LineSpacing;
  followSystem: boolean;
}

export interface ThemeColors {
  background: string;
  editorBackground: string;
  text: string;
  secondaryText: string;
  border: string;
  accent: string;
}

export interface UseEditorThemeReturn extends ThemeConfig {
  setThemeMode: (mode: ThemeMode) => void;
  setFontFamily: (font: FontOption) => void;
  setFontSize: (size: number) => void;
  setLineSpacing: (spacing: LineSpacing) => void;
  setFollowSystem: (follow: boolean) => void;
  resetToDefaults: () => void;
  styles: React.CSSProperties;
  themeColors: ThemeColors;
}

const STORAGE_KEY = 'editor-theme-config';

const defaultConfig: ThemeConfig = {
  themeMode: 'light',
  fontFamily: 'system',
  fontSize: 16,
  lineSpacing: 1.75,
  followSystem: false,
};

const fontFamilyMap: Record<FontOption, string> = {
  system: 'system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif',
  serif: 'SimSun, "Songti SC", serif',
  sans: 'SimHei, "Heiti SC", sans-serif',
  kai: 'KaiTi, "Kaiti SC", serif',
  mono: '"SF Mono", "Cascadia Code", Consolas, monospace',
};

const themeColorsMap: Record<ThemeMode, ThemeColors> = {
  light: {
    background: '#F5F0E8',
    editorBackground: '#FDF8EF',
    text: '#2C2416',
    secondaryText: '#6B5D4D',
    border: '#D4C4A8',
    accent: '#8B6914',
  },
  dark: {
    background: '#1A1714',
    editorBackground: '#232019',
    text: '#E8DCC8',
    secondaryText: '#9B8E7A',
    border: '#4A4235',
    accent: '#D4A843',
  },
  sepia: {
    background: '#F5F0E8',
    editorBackground: '#FDF8EF',
    text: '#2C2416',
    secondaryText: '#6B5D4D',
    border: '#D4C4A8',
    accent: '#8B6914',
  },
};

function loadConfig(): ThemeConfig {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved) as Partial<ThemeConfig>;
      return { ...defaultConfig, ...parsed };
    } catch {
      return defaultConfig;
    }
  }
  return defaultConfig;
}

function saveConfig(config: ThemeConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

function clampFontSize(size: number): number {
  return Math.max(14, Math.min(24, size));
}

function getSystemTheme(): ThemeMode {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

export function useEditorTheme(): UseEditorThemeReturn {
  const [config, setConfig] = useState<ThemeConfig>(defaultConfig);

  useEffect(() => {
    const loaded = loadConfig();
    setConfig(loaded);
  }, []);

  const effectiveThemeMode = config.followSystem
    ? getSystemTheme()
    : config.themeMode;

  const setThemeMode = useCallback((themeMode: ThemeMode) => {
    setConfig((prev) => {
      const next = { ...prev, themeMode };
      saveConfig(next);
      return next;
    });
  }, []);

  const setFontFamily = useCallback((fontFamily: FontOption) => {
    setConfig((prev) => {
      const next = { ...prev, fontFamily };
      saveConfig(next);
      return next;
    });
  }, []);

  const setFontSize = useCallback((fontSize: number) => {
    setConfig((prev) => {
      const next = { ...prev, fontSize: clampFontSize(fontSize) };
      saveConfig(next);
      return next;
    });
  }, []);

  const setLineSpacing = useCallback((lineSpacing: LineSpacing) => {
    setConfig((prev) => {
      const next = { ...prev, lineSpacing };
      saveConfig(next);
      return next;
    });
  }, []);

  const setFollowSystem = useCallback((followSystem: boolean) => {
    setConfig((prev) => {
      const next = { ...prev, followSystem };
      saveConfig(next);
      return next;
    });
  }, []);

  const resetToDefaults = useCallback(() => {
    setConfig(defaultConfig);
    saveConfig(defaultConfig);
  }, []);

  useEffect(() => {
    if (config.followSystem) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => {
        setConfig((prev) => ({ ...prev }));
      };
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [config.followSystem]);

  const styles: React.CSSProperties = {
    '--editor-font-size': `${config.fontSize}px`,
    '--editor-line-height': `${config.lineSpacing}`,
    '--editor-font-family': fontFamilyMap[config.fontFamily],
  } as React.CSSProperties;

  const themeColors = themeColorsMap[effectiveThemeMode];

  return {
    ...config,
    themeMode: effectiveThemeMode,
    setThemeMode,
    setFontFamily,
    setFontSize,
    setLineSpacing,
    setFollowSystem,
    resetToDefaults,
    styles,
    themeColors,
  };
}
