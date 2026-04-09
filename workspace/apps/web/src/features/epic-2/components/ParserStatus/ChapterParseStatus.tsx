import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Minus,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import type { ParserChapterStatusValue } from './types';

interface ChapterParseStatusProps {
  status: ParserChapterStatusValue;
  failureReason?: string | null;
  chapterTitle?: string;
  onRetry?: () => void;
  className?: string;
}

const normalizeStatus = (status: ParserChapterStatusValue) => {
  if (status === 'empty' || status === 'none') {
    return 'no_content';
  }

  if (status === 'queued' || status === 'cancelled') {
    return 'pending';
  }

  return status;
};

const getStatusIcon = (status: ParserChapterStatusValue) => {
  switch (normalizeStatus(status)) {
    case 'parsed':
      return <CheckCircle2 size={14} className="text-success" aria-label="已解析" />;
    case 'parsing':
      return <Loader2 size={14} className="animate-spin text-amber" aria-label="解析中" />;
    case 'pending':
      return <AlertCircle size={14} className="text-warning" aria-label="待解析" />;
    case 'failed':
      return <XCircle size={14} className="text-error" aria-label="解析失败" />;
    default:
      return <Minus size={14} className="text-ink-light/60" aria-label="无内容" />;
  }
};

export default function ChapterParseStatus({
  status,
  failureReason,
  chapterTitle,
  onRetry,
  className = '',
}: ChapterParseStatusProps) {
  if (normalizeStatus(status) === 'failed' && onRetry) {
    return (
      <button
        type="button"
        onClick={onRetry}
        title={failureReason ?? undefined}
        aria-label={`重试解析 ${chapterTitle ?? '章节'}`}
        className={`inline-flex items-center gap-1 rounded p-1 text-error hover:bg-error/10 focus:outline-none focus:ring-2 focus:ring-amber/20 ${className}`}
      >
        {getStatusIcon(status)}
        <RotateCcw size={12} className="text-error/80" aria-hidden="true" />
      </button>
    );
  }

  return (
    <span className={`inline-flex items-center ${className}`} title={failureReason ?? undefined}>
      {getStatusIcon(status)}
    </span>
  );
}
