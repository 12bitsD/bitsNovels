import { Plus } from 'lucide-react';

interface NewChapterButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export function NewChapterButton({ onClick, disabled }: NewChapterButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center justify-center gap-2 px-4 py-3 
                 bg-amber/10 hover:bg-amber/20 
                 text-amber font-medium text-sm
                 rounded-md border border-amber/30
                 transition-colors duration-200
                 disabled:opacity-50 disabled:cursor-not-allowed"
      aria-label="新章节"
    >
      <Plus size={16} />
      <span>新章节</span>
    </button>
  );
}
