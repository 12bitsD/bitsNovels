import { useState } from 'react';

export interface CreateSnapshotProps {
  onCreate: (label?: string) => Promise<void>;
  disabled?: boolean;
}

export function CreateSnapshot({ onCreate, disabled = false }: CreateSnapshotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const labelLength = label.length;
  const isOverLimit = labelLength > 100;

  const handleOpen = () => {
    setIsOpen(true);
    setLabel('');
    setError('');
  };

  const handleClose = () => {
    if (isCreating) return;
    setIsOpen(false);
    setLabel('');
    setError('');
  };

  const handleSubmit = async () => {
    if (isOverLimit) {
      setError('标签不能超过100字');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      await onCreate(label.trim() || undefined);
      setIsOpen(false);
      setLabel('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '创建快照失败';
      setError(msg);
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClose();
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  };

  return (
    <>
      <button
        onClick={handleOpen}
        disabled={disabled}
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[#8B6914] bg-[#E8D9B8] hover:bg-[#D4C4A8] rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="创建快照"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        <span>创建快照</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-[rgba(44,36,22,0.5)]"
            onClick={handleClose}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-md mx-4 bg-white dark:bg-[#2D2820] rounded-lg shadow-[0_8px_32px_rgba(44,36,22,0.18)]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#D4C4A8] dark:border-[#4A4235]">
              <h3 className="text-lg font-semibold text-[#2C2416] dark:text-[#E8DCC8]">
                创建版本快照
              </h3>
              <button
                onClick={handleClose}
                disabled={isCreating}
                className="text-[#6B5D4D] hover:text-[#2C2416] dark:text-[#9B8E7A] dark:hover:text-[#E8DCC8] transition-colors disabled:opacity-50"
                aria-label="关闭"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-4">
              <label htmlFor="snapshot-label" className="block text-sm font-medium text-[#6B5D4D] dark:text-[#9B8E7A] mb-2">
                标签/备注（可选）
              </label>
              <textarea
                id="snapshot-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="为快照添加描述，方便日后识别..."
                disabled={isCreating}
                className={`w-full h-24 px-3 py-2 text-sm bg-white dark:bg-[#232019] border rounded focus:outline-none focus:ring-2 resize-none transition-colors
                  ${isOverLimit
                    ? 'border-[#9B3D3D] focus:ring-[#9B3D3D]/20'
                    : 'border-[#D4C4A8] dark:border-[#4A4235] focus:border-[#8B6914] focus:ring-[#8B6914]/20'
                  }
                  text-[#2C2416] dark:text-[#E8DCC8] placeholder-[#9B8E7A]`}
              />
              <div className="flex items-center justify-between mt-2">
                <span className={`text-xs ${isOverLimit ? 'text-[#9B3D3D]' : 'text-[#6B5D4D] dark:text-[#9B8E7A]'}`}>
                  {isOverLimit ? '超过字数限制' : `${labelLength}/100 字`}
                </span>
                <span className="text-xs text-[#9B8E7A]">
                  按 Ctrl+Enter 快速创建
                </span>
              </div>

              {error && (
                <div className="mt-3 px-3 py-2 bg-[#9B3D3D]/10 border border-[#9B3D3D]/20 rounded text-sm text-[#9B3D3D]">
                  {error}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#D4C4A8] dark:border-[#4A4235]">
              <button
                onClick={handleClose}
                disabled={isCreating}
                className="px-4 py-2 text-sm font-medium text-[#6B5D4D] hover:text-[#2C2416] dark:text-[#9B8E7A] dark:hover:text-[#E8DCC8] transition-colors disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={isCreating || isOverLimit}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#8B6914] hover:bg-[#6B5010] rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>创建中...</span>
                  </>
                ) : (
                  <span>创建快照</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
