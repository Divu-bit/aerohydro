import { useWater } from '@/contexts/WaterContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';

export default function WeeklyChart() {
  const { weekData, settings } = useWater();

  return (
    <div className="glass rounded-2xl p-4">
      <h3 className="text-sm font-semibold text-foreground mb-4 px-1">This Week</h3>
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={weekData} barCategoryGap="25%">
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis hide />
            <ReferenceLine
              y={settings.dailyGoal}
              stroke="hsl(var(--primary))"
              strokeDasharray="4 4"
              strokeOpacity={0.5}
            />
            <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={32}>
              {weekData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={
                    entry.total >= settings.dailyGoal
                      ? 'hsl(var(--primary))'
                      : 'hsl(var(--primary) / 0.35)'
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
