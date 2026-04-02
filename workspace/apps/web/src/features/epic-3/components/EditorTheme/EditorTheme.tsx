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
      className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-5"
    >
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
        编辑器主题
      </h3>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label
            htmlFor="theme-mode"
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            主题
          </label>
          <select
            id="theme-mode"
            value={themeMode}
            onChange={(e) => setThemeMode(e.target.value as ThemeMode)}
            disabled={followSystem}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
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
            className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
          />
          <label
            htmlFor="follow-system"
            className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
          >
            跟随系统
          </label>
        </div>

        <div className="flex items-center justify-between">
          <label
            htmlFor="font-family"
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            字体
          </label>
          <select
            id="font-family"
            value={fontFamily}
            onChange={(e) => setFontFamily(e.target.value as FontOption)}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
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
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              字号
            </label>
            <span className="text-sm text-gray-500">{fontSize}px</span>
          </div>
          <input
            type="range"
            id="font-size"
            min={14}
            max={24}
            step={1}
            value={fontSize}
            onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-600"
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>14px</span>
            <span>24px</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label
            htmlFor="line-spacing"
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            行间距
          </label>
          <select
            id="line-spacing"
            value={lineSpacing}
            onChange={(e) => setLineSpacing(parseFloat(e.target.value) as LineSpacing)}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          >
            {lineSpacingOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={resetToDefaults}
          className="text-sm text-gray-500 hover:text-amber-600 dark:text-gray-400 dark:hover:text-amber-400 transition-colors"
        >
          恢复默认
        </button>
      </div>
    </div>
  );
}
