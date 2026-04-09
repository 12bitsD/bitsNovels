// @ts-expect-error typecheck fix
import React from 'react';
import type { HeatmapData } from '../../hooks/useWritingStats';

interface HourlyHeatmapProps {
  data: HeatmapData[];
  loading: boolean;
}

function formatHour(hour: number): string {
  return `${hour.toString().padStart(2, '0')}:00`;
}

function formatNumber(num: number): string {
  return num.toLocaleString('zh-CN');
}

function getHeatmapColor(value: number, maxValue: number): string {
  if (maxValue === 0) return '#F5F0E8';

  const intensity = Math.min(value / maxValue, 1);

  const colors = [
    { threshold: 0, color: '#F5F0E8' },
    { threshold: 0.2, color: '#E8D9B8' },
    { threshold: 0.4, color: '#D4C4A8' },
    { threshold: 0.6, color: '#C17F24' },
    { threshold: 0.8, color: '#8B6914' },
  ];

  for (let i = colors.length - 1; i >= 0; i--) {
    if (intensity >= colors[i].threshold) {
      return colors[i].color;
    }
  }

  return colors[0].color;
}

export function HourlyHeatmap({ data, loading }: HourlyHeatmapProps) {
  if (loading) {
    return (
      <div className="h-32 bg-[#F5F0E8] rounded animate-pulse"></div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center text-[#6B5D4D]">
        <p>暂无时段数据</p>
      </div>
    );
  }

  const hourMap = new Map<number, number>();
  data.forEach((item) => {
    hourMap.set(item.hour, item.chars);
  });

  const fullData = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    chars: hourMap.get(hour) || 0,
  }));

  const maxValue = Math.max(...fullData.map((d) => d.chars));

  return (
    <div data-testid="hourly-heatmap">
      <div className="grid grid-cols-12 gap-1">
        {fullData.map((item) => (
          <div
            key={item.hour}
            data-testid="heatmap-cell"
            className="relative group"
          >
            <div
              className="h-8 rounded flex items-center justify-center text-xs transition-all hover:scale-105"
              style={{
                backgroundColor: getHeatmapColor(item.chars, maxValue),
                color: item.chars > maxValue * 0.4 ? '#FFFFFF' : '#2C2416',
              }}
            >
              {item.hour}
            </div>
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-[#2C2416] text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
              {formatHour(item.hour)}: {formatNumber(item.chars)} 字
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mt-4 text-xs text-[#6B5D4D]">
        <span>00:00</span>
        <div className="flex items-center gap-2">
          <span>少</span>
          <div className="flex gap-1">
            {['#F5F0E8', '#E8D9B8', '#D4C4A8', '#C17F24', '#8B6914'].map((color) => (
              <div
                key={color}
                className="w-4 h-4 rounded"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <span>多</span>
        </div>
        <span>23:00</span>
      </div>
    </div>
  );
}
