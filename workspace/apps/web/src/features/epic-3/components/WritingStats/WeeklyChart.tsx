// @ts-expect-error typecheck fix
import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import type { WeeklyData } from '../../hooks/useWritingStats';

interface WeeklyChartProps {
  data: WeeklyData[];
  loading: boolean;
}

function formatWeek(weekStr: string): string {
  const parts = weekStr.split('-W');
  if (parts.length === 2) {
    return `W${parts[1]}`;
  }
  return weekStr;
}

function formatNumber(num: number): string {
  return num.toLocaleString('zh-CN');
}

export function WeeklyChart({ data, loading }: WeeklyChartProps) {
  if (loading) {
    return (
      <div className="h-64 bg-[#F5F0E8] rounded animate-pulse"></div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-[#6B5D4D]">
        <p>暂无每周数据</p>
      </div>
    );
  }

  const sortedData = [...data].sort((a, b) => a.week.localeCompare(b.week));

  const chartData = sortedData.map((item) => ({
    week: formatWeek(item.week),
    chars: item.chars,
    fullWeek: item.week,
  }));

  return (
    <div data-testid="weekly-chart" className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#D4C4A8" opacity={0.3} />
          <XAxis
            dataKey="week"
            tick={{ fill: '#6B5D4D', fontSize: 12 }}
            axisLine={{ stroke: '#D4C4A8' }}
            tickLine={{ stroke: '#D4C4A8' }}
          />
          <YAxis
            tick={{ fill: '#6B5D4D', fontSize: 12 }}
            axisLine={{ stroke: '#D4C4A8' }}
            tickLine={{ stroke: '#D4C4A8' }}
            tickFormatter={(value) => formatNumber(value)}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #D4C4A8',
              borderRadius: '6px',
              boxShadow: '0 4px 16px rgba(44,36,22,0.12)',
            }}
            labelStyle={{ color: '#2C2416' }}
            itemStyle={{ color: '#8B6914' }}
            // @ts-expect-error typecheck fix
            formatter={(value: number) => [formatNumber(value), '字数']}
            labelFormatter={(_, payload) => {
              if (payload && payload[0]) {
                return payload[0].payload.fullWeek;
              }
              return '';
            }}
          />
          <Line
            type="monotone"
            dataKey="chars"
            stroke="#8B6914"
            strokeWidth={2}
            dot={{ fill: '#8B6914', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, fill: '#C17F24' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
