import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface DailyWritingPoint {
  date: string;
  writtenChars: number;
}

interface WritingTrendChartProps {
  data: DailyWritingPoint[];
}

export function WritingTrendChart({ data }: WritingTrendChartProps) {
  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
          <XAxis
            dataKey="date"
            tickFormatter={(value) => {
              const date = new Date(value);
              return `${date.getMonth() + 1}/${date.getDate()}`;
            }}
            stroke="var(--color-ink-light)"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: 'var(--color-border)' }}
          />
          <YAxis
            stroke="var(--color-ink-light)"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: 'var(--color-border)' }}
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--color-white)',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              fontSize: '12px',
              boxShadow: 'var(--shadow-card)'
            }}
            labelFormatter={(value) => {
              const date = new Date(value);
              return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
            }}
            formatter={(value: unknown) => [`${(value as number).toLocaleString()} 字`, '写作字数']}
          />
          <Line
            type="monotone"
            dataKey="writtenChars"
            stroke="var(--color-amber)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: 'var(--color-amber)', stroke: 'var(--color-white)', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
