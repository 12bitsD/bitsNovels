import { useEffect, useState } from 'react';
import type { DiffResult } from '../../hooks/useSnapshots';

export interface SnapshotDiffProps {
  originalContent: string;
  snapshotContent: string;
  isLoading?: boolean;
  error?: string;
}

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  lineNum: number;
}

function computeSimpleDiff(original: string, snapshot: string): DiffLine[] {
  const originalLines = original.split('\n');
  const snapshotLines = snapshot.split('\n');
  const result: DiffLine[] = [];

  let lineNum = 1;
  const maxLen = Math.max(originalLines.length, snapshotLines.length);

  for (let i = 0; i < maxLen; i++) {
    const orig = originalLines[i] || '';
    const snap = snapshotLines[i] || '';

    if (orig === snap) {
      result.push({
        type: 'unchanged',
        content: orig,
        lineNum: lineNum++,
      });
    } else {
      if (orig) {
        result.push({
          type: 'removed',
          content: orig,
          lineNum: lineNum,
        });
      }
      if (snap) {
        result.push({
          type: 'added',
          content: snap,
          lineNum: lineNum,
        });
      }
      lineNum++;
    }
  }

  return result;
}

export function SnapshotDiff({
  originalContent,
  snapshotContent,
  isLoading,
  error,
}: SnapshotDiffProps) {
  const [diffLines, setDiffLines] = useState<DiffLine[]>([]);

  useEffect(() => {
    const lines = computeSimpleDiff(originalContent, snapshotContent);
    setDiffLines(lines);
  }, [originalContent, snapshotContent]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <svg className="w-6 h-6 animate-spin text-[#8B6914]" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span className="ml-2 text-sm text-[#6B5D4D] dark:text-[#9B8E7A]">计算差异...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12 text-[#9B3D3D]">
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  const addedCount = diffLines.filter(l => l.type === 'added').length;
  const removedCount = diffLines.filter(l => l.type === 'removed').length;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#D4C4A8] dark:border-[#4A4235] bg-[#FDF8EF] dark:bg-[#1A1714]">
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#4A7C59]"></span>
            <span className="text-[#6B5D4D] dark:text-[#9B8E7A]">新增 {addedCount} 行</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#9B3D3D]"></span>
            <span className="text-[#6B5D4D] dark:text-[#9B8E7A]">删除 {removedCount} 行</span>
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-auto font-mono text-sm">
        {diffLines.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-[#6B5D4D] dark:text-[#9B8E7A]">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>内容相同</span>
          </div>
        ) : (
          <div className="divide-y divide-[#D4C4A8]/30 dark:divide-[#4A4235]/30">
            {diffLines.map((line, index) => {
              let bgClass = '';
              let borderClass = '';
              let prefix = ' ';

              switch (line.type) {
                case 'added':
                  bgClass = 'bg-[#4A7C59]/10 dark:bg-[#6BAB7D]/10';
                  borderClass = 'border-l-2 border-[#4A7C59]';
                  prefix = '+';
                  break;
                case 'removed':
                  bgClass = 'bg-[#9B3D3D]/10 dark:bg-[#C75B5B]/10';
                  borderClass = 'border-l-2 border-[#9B3D3D]';
                  prefix = '-';
                  break;
                default:
                  bgClass = '';
                  borderClass = 'border-l-2 border-transparent';
                  prefix = ' ';
              }

              return (
                <div
                  key={index}
                  className={`
                    flex items-start px-4 py-1 ${bgClass} ${borderClass}
                    ${line.type === 'unchanged' ? 'text-[#6B5D4D] dark:text-[#9B8E7A]' : ''}
                  `}
                >
                  <span className={`
                    select-none w-6 flex-shrink-0 text-[10px] pt-0.5
                    ${line.type === 'added' ? 'text-[#4A7C59]' : ''}
                    ${line.type === 'removed' ? 'text-[#9B3D3D]' : ''}
                    ${line.type === 'unchanged' ? 'text-[#9B8E7A]' : ''}
                  `}>
                    {line.lineNum}
                  </span>
                  <span className={`
                    select-none w-4 flex-shrink-0 text-[10px] pt-0.5
                    ${line.type === 'added' ? 'text-[#4A7C59]' : ''}
                    ${line.type === 'removed' ? 'text-[#9B3D3D]' : ''}
                    ${line.type === 'unchanged' ? 'text-[#9B8E7A]' : ''}
                  `}>
                    {prefix}
                  </span>
                  <span className={`
                    flex-1 break-all
                    ${line.type === 'added' ? 'text-[#2C2416] dark:text-[#E8DCC8]' : ''}
                    ${line.type === 'removed' ? 'text-[#2C2416] dark:text-[#E8DCC8]' : ''}
                  `}>
                    {line.content || ' '}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
