import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface GoalProgressRingProps {
  current: number;
  target: number;
  size?: number;
}

export function GoalProgressRing({ current, target, size = 160 }: GoalProgressRingProps) {
  const percent = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const remaining = Math.max(target - current, 0);

  const data = [
    { name: '已完成', value: current },
    { name: '剩余', value: remaining }
  ];

  return (
    <div className="flex flex-col items-center">
      <div style={{ width: size, height: size, position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius="60%"
              outerRadius="80%"
              startAngle={90}
              endAngle={-270}
              dataKey="value"
              strokeWidth={0}
            >
              <Cell fill="var(--color-amber)" />
              <Cell fill="var(--color-border)" opacity={0.4} />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <span className="text-2xl font-bold text-ink">{percent.toFixed(0)}%</span>
          <span className="text-xs text-ink-light">完成度</span>
        </div>
      </div>
      <div className="mt-3 text-center">
        <p className="text-sm text-ink">
          <span className="font-mono">{current.toLocaleString()}</span>
          <span className="text-ink-light"> / {target.toLocaleString()}</span>
        </p>
        <p className="text-xs text-ink-light mt-0.5">字</p>
      </div>
    </div>
  );
}
