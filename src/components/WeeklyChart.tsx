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
  Tooltip,
} from 'recharts';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg">
        <p className="text-sm font-semibold text-foreground">
          {label}: <span className="text-primary">{payload[0].value} ml</span>
        </p>
      </div>
    );
  }
  return null;
};

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
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--primary) / 0.08)' }} />
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
