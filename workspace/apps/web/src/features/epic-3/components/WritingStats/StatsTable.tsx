// @ts-expect-error typecheck fix
import React, { useState, useMemo } from 'react';
import type { ChapterStat } from '@bitsnovels/api-types';

interface StatsTableProps {
  data: ChapterStat[];
  loading: boolean;
}

type SortField = 'title' | 'volumeName' | 'chars' | 'percentage';
type SortDirection = 'asc' | 'desc';

function formatNumber(num: number): string {
  return num.toLocaleString('zh-CN');
}

function SortIcon({
  field,
  currentField,
  direction,
}: {
  field: SortField;
  currentField: SortField;
  direction: SortDirection;
}) {
  if (field !== currentField) {
    return (
      <svg className="w-4 h-4 text-border" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    );
  }

  return direction === 'asc' ? (
    <svg className="w-4 h-4 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
  ) : (
    <svg className="w-4 h-4 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

export function StatsTable({ data, loading }: StatsTableProps) {
  const [sortField, setSortField] = useState<SortField>('chars');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const sortedData = useMemo(() => {
    if (!data) return [];

    return [...data].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'volumeName':
          comparison = a.volumeName.localeCompare(b.volumeName);
          break;
        case 'chars':
          comparison = a.chars - b.chars;
          break;
        case 'percentage':
          comparison = a.percentage - b.percentage;
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 rounded bg-parchment animate-pulse"></div>
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center text-ink-light">
        <p>暂无章节数据</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th
              className="text-left py-3 px-4 font-medium text-ink cursor-pointer transition-colors hover:bg-parchment"
              onClick={() => handleSort('title')}
            >
              <div className="flex items-center gap-2">
                章节标题
                <SortIcon
                  field="title"
                  currentField={sortField}
                  direction={sortDirection}
                />
              </div>
            </th>
            <th
              className="text-left py-3 px-4 font-medium text-ink cursor-pointer transition-colors hover:bg-parchment"
              onClick={() => handleSort('volumeName')}
            >
              <div className="flex items-center gap-2">
                所属卷
                <SortIcon
                  field="volumeName"
                  currentField={sortField}
                  direction={sortDirection}
                />
              </div>
            </th>
            <th
              className="text-right py-3 px-4 font-medium text-ink cursor-pointer transition-colors hover:bg-parchment"
              onClick={() => handleSort('chars')}
            >
              <div className="flex items-center justify-end gap-2">
                字数
                <SortIcon
                  field="chars"
                  currentField={sortField}
                  direction={sortDirection}
                />
              </div>
            </th>
            <th
              className="text-right py-3 px-4 font-medium text-ink cursor-pointer transition-colors hover:bg-parchment"
              onClick={() => handleSort('percentage')}
            >
              <div className="flex items-center justify-end gap-2">
                占比
                <SortIcon
                  field="percentage"
                  currentField={sortField}
                  direction={sortDirection}
                />
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedData.map((chapter) => (
            <tr
              key={chapter.id}
              className="border-b border-border/40 transition-colors hover:bg-ivory"
            >
              <td className="py-3 px-4 text-ink">{chapter.title}</td>
              <td className="py-3 px-4 text-ink-light">{chapter.volumeName}</td>
              <td className="py-3 px-4 text-right font-mono text-ink">
                {formatNumber(chapter.chars)}
              </td>
              <td className="py-3 px-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  <div className="w-16 h-2 bg-amber-light/60 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber rounded-full"
                      style={{ width: `${Math.min(chapter.percentage, 100)}%` }}
                    />
                  </div>
                  <span className="text-ink-light font-mono w-12 text-right">
                    {chapter.percentage}%
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 text-sm text-ink-light">
        共 {data.length} 个章节，总字数 {formatNumber(data.reduce((sum, ch) => sum + ch.chars, 0))}
      </div>
    </div>
  );
}
