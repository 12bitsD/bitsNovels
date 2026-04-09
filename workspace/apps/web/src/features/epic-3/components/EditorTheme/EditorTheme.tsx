import { useEditorTheme, type ThemeMode, type FontOption, type LineSpacing } from '../../hooks/useEditorTheme';

export function EditorTheme() {
  const {
    themeMode,
    fontFamily,
    fontSize,
    lineSpacing,
    followSystem,
    setThemeMode,
    setFontFamily,
    setFontSize,
    setLineSpacing,
    setFollowSystem,
    resetToDefaults,
  } = useEditorTheme();

  const themeOptions: { value: ThemeMode; label: string }[] = [
    { value: 'light', label: '浅色' },
    { value: 'dark', label: '深色' },
    { value: 'sepia', label: '羊皮纸' },
  ];

  const fontOptions: { value: FontOption; label: string }[] = [
    { value: 'system', label: '系统默认' },
    { value: 'serif', label: '宋体' },
    { value: 'sans', label: '黑体' },
    { value: 'kai', label: '楷体' },
    { value: 'mono', label: '等宽字体' },
  ];

  const lineSpacingOptions: { value: LineSpacing; label: string }[] = [
    { value: 1.5, label: '紧凑 (1.5)' },
    { value: 1.75, label: '舒适 (1.75)' },
    { value: 2.0, label: '宽松 (2.0)' },
  ];

  return (
    <div
      data-testid="editor-theme-panel"
      className="bg-ivory rounded-lg shadow-sm border border-border p-8 space-y-8"
    >
      <h3 className="text-xl font-medium text-ink mb-4">
        编辑器主题
      </h3>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label
            htmlFor="theme-mode"
            className="text-sm font-medium text-ink-light"
          >
            主题
          </label>
          <select
            id="theme-mode"
            value={themeMode}
            onChange={(e) => setThemeMode(e.target.value as ThemeMode)}
            disabled={followSystem}
            className="px-4 py-2 text-sm border border-border rounded-md bg-parchment text-ink disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-amber/20 focus:border-amber outline-none transition-colors"
          >
            {themeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="follow-system"
            checked={followSystem}
            onChange={(e) => setFollowSystem(e.target.checked)}
            className="w-4 h-4 text-amber border-border rounded focus:ring-amber/20 accent-amber"
          />
          <label
            htmlFor="follow-system"
            className="text-sm text-ink-light cursor-pointer"
          >
            跟随系统
          </label>
        </div>

        <div className="flex items-center justify-between">
          <label
            htmlFor="font-family"
            className="text-sm font-medium text-ink-light"
          >
            字体
          </label>
          <select
            id="font-family"
            value={fontFamily}
            onChange={(e) => setFontFamily(e.target.value as FontOption)}
            className="px-4 py-2 text-sm border border-border rounded-md bg-parchment text-ink focus:ring-2 focus:ring-amber/20 focus:border-amber outline-none transition-colors"
          >
            {fontOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="font-size"
              className="text-sm font-medium text-ink-light"
            >
              字号
            </label>
            <span className="text-sm text-ink-light/70">{fontSize}px</span>
          </div>
          <input
            type="range"
            id="font-size"
            min={14}
            max={24}
            step={1}
            value={fontSize}
            onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
            className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer accent-amber"
          />
          <div className="flex justify-between text-xs text-ink-light/70">
            <span>14px</span>
            <span>24px</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label
            htmlFor="line-spacing"
            className="text-sm font-medium text-ink-light"
          >
            行间距
          </label>
          <select
            id="line-spacing"
            value={lineSpacing}
            onChange={(e) => setLineSpacing(parseFloat(e.target.value) as LineSpacing)}
            className="px-4 py-2 text-sm border border-border rounded-md bg-parchment text-ink focus:ring-2 focus:ring-amber/20 focus:border-amber outline-none transition-colors"
          >
            {lineSpacingOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="pt-4 border-t border-border mt-8">
        <button
          onClick={resetToDefaults}
          className="text-sm text-ink-light hover:text-amber-dark transition-colors"
        >
          恢复默认
        </button>
      </div>
    </div>
  );
}
