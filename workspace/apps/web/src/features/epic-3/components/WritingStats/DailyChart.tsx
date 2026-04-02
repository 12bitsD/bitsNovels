import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { DailyData } from '../../hooks/useWritingStats';

interface DailyChartProps {
  data: DailyData[];
  loading: boolean;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function formatNumber(num: number): string {
  return num.toLocaleString('zh-CN');
}

export function DailyChart({ data, loading }: DailyChartProps) {
  if (loading) {
    return (
      <div className="h-64 bg-[#F5F0E8] rounded animate-pulse"></div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-[#6B5D4D]">
        <p>暂无每日数据</p>
      </div>
    );
  }

  const sortedData = [...data].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const chartData = sortedData.map((item) => ({
    date: formatDate(item.date),
    chars: item.chars,
    fullDate: item.date,
  }));

  return (
    <div data-testid="daily-chart" className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#D4C4A8" opacity={0.3} />
          <XAxis
            dataKey="date"
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
            formatter={(value: number) => [formatNumber(value), '字数']}
            labelFormatter={(_, payload) => {
              if (payload && payload[0]) {
                return payload[0].payload.fullDate;
              }
              return '';
            }}
          />
          <Bar
            dataKey="chars"
            fill="#8B6914"
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
