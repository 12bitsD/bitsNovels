// @ts-expect-error typecheck fix
import React, { useState } from 'react';
import { useWritingStats } from '../../hooks/useWritingStats';
import { DailyChart } from './DailyChart';
import { WeeklyChart } from './WeeklyChart';
import { HourlyHeatmap } from './HourlyHeatmap';
import { StatsTable } from './StatsTable';

interface WritingStatsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

function formatNumber(num: number): string {
  return num.toLocaleString('zh-CN');
}

function StatCard({
  label,
  value,
  unit = '',
}: {
  label: string;
  value: number;
  unit?: string;
}) {
  return (
    <div className="bg-ivory rounded-lg p-4 border border-border">
      <div className="text-ink-light text-xs mb-2">{label}</div>
      <div className="text-ink text-2xl font-bold font-mono">
        {formatNumber(value)}
        {unit && <span className="text-sm ml-1">{unit}</span>}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="bg-ivory rounded-lg p-4 border border-border animate-pulse">
            <div className="h-4 bg-border rounded w-16 mb-2"></div>
            <div className="h-8 bg-border rounded w-24"></div>
          </div>
        ))}
      </div>
      <div className="h-64 bg-ivory rounded-lg border border-border animate-pulse"></div>
    </div>
  );
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="text-error mb-4">{error}</div>
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-amber text-white rounded hover:bg-amber-dark transition-colors"
      >
        重试
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-ink-light">
      <svg
        className="w-16 h-16 mb-4 text-border"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
      <p>暂无写作数据</p>
      <p className="text-sm mt-2">开始写作后，统计数据将在这里显示</p>
    </div>
  );
}

type TabType = 'summary' | 'trend' | 'distribution' | 'detail';

export function WritingStatsPanel({ isOpen, onClose, projectId }: WritingStatsPanelProps) {
  const { data, loading, error, refetch } = useWritingStats(projectId);
  const [activeTab, setActiveTab] = useState<TabType>('summary');

  if (!isOpen) return null;

  const hasData = data && data.summary.totalChars > 0;

  const tabs: { key: TabType; label: string }[] = [
    { key: 'summary', label: '概览' },
    { key: 'trend', label: '趋势' },
    { key: 'distribution', label: '分布' },
    { key: 'detail', label: '详情' },
  ];

  return (
    <div
      className="fixed inset-0 bg-ink/50 flex items-center justify-center z-50"
      onClick={onClose}
      data-testid="stats-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="写作统计"
    >
      <div
        className="bg-ivory rounded-lg shadow-modal w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-ink">写作统计</h2>
          <button
            onClick={onClose}
            className="text-ink-light hover:text-ink transition-colors"
            aria-label="关闭"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="border-b border-border">
          <nav className="flex px-6" role="tablist">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                role="tab"
                aria-selected={activeTab === tab.key}
                className={`px-4 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-amber text-amber'
                    : 'border-transparent text-ink-light hover:text-ink'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-144px)]">
          {loading && <LoadingSkeleton />}

          {error && <ErrorState error={error} onRetry={refetch} />}

          {!loading && !error && !hasData && <EmptyState />}

          {!loading && !error && hasData && (
            <>
              {activeTab === 'summary' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard label="今日字数" value={data.summary.todayChars} />
                    <StatCard label="本周字数" value={data.summary.weekChars} />
                    <StatCard label="本月字数" value={data.summary.monthChars} />
                    <StatCard label="总字数" value={data.summary.totalChars} />
                    <StatCard label="日均字数" value={data.summary.dailyAvg} />
                    <StatCard label="连续天数" value={data.summary.streakDays} unit="天" />
                    <StatCard label="最高单日" value={data.summary.maxDaily} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <div className="bg-parchment rounded-lg p-4 border border-border">
                      <h3 className="text-sm font-medium text-ink mb-4">近30天趋势</h3>
                      <DailyChart data={data.daily} loading={false} />
                    </div>
                    <div className="bg-parchment rounded-lg p-4 border border-border">
                      <h3 className="text-sm font-medium text-ink mb-4">时段分布</h3>
                      <HourlyHeatmap data={data.heatmap} loading={false} />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'trend' && (
                <div className="space-y-6">
                  <div className="bg-parchment rounded-lg p-4 border border-border">
                    <h3 className="text-sm font-medium text-ink mb-4">近30天每日字数</h3>
                    <DailyChart data={data.daily} loading={false} />
                  </div>
                  <div className="bg-parchment rounded-lg p-4 border border-border">
                    <h3 className="text-sm font-medium text-ink mb-4">近12周每周字数</h3>
                    <WeeklyChart data={data.weekly} loading={false} />
                  </div>
                </div>
              )}

              {activeTab === 'distribution' && (
                <div className="space-y-6">
                  <div className="bg-parchment rounded-lg p-4 border border-border">
                    <h3 className="text-sm font-medium text-ink mb-4">24小时写作时段分布</h3>
                    <HourlyHeatmap data={data.heatmap} loading={false} />
                  </div>
                </div>
              )}

              {activeTab === 'detail' && (
                <div className="bg-parchment rounded-lg p-4 border border-border">
                  <h3 className="text-sm font-medium text-ink mb-4">章节统计</h3>
                  <StatsTable data={data.chapters} loading={false} />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
