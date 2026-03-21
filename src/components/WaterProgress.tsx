import { useWater } from '@/contexts/WaterContext';

export default function WaterProgress() {
  const { todayRecord, settings } = useWater();
  const percent = Math.min((todayRecord.total / settings.dailyGoal) * 100, 100);
  const radius = 90;
  const stroke = 12;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  const displayAmount = settings.unit === 'oz'
    ? (todayRecord.total * 0.033814).toFixed(1)
    : todayRecord.total;
  const displayGoal = settings.unit === 'oz'
    ? (settings.dailyGoal * 0.033814).toFixed(0)
    : settings.dailyGoal;
  const unitLabel = settings.unit === 'oz' ? 'oz' : 'ml';

  return (
    <div className="flex flex-col items-center py-6">
      <div className="relative w-56 h-56">
        <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
          <circle
            cx="100" cy="100" r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={stroke}
          />
          <circle
            cx="100" cy="100" r={radius}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="flex items-baseline gap-0.5">
            <span className="text-4xl font-bold tracking-tight text-foreground tabular-nums">
              {displayAmount}
            </span>
            <span className="text-sm text-muted-foreground font-medium">{unitLabel}</span>
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            of {displayGoal} {unitLabel}
          </div>
          <div className="text-xs font-semibold mt-2 text-primary tabular-nums">
            {Math.round(percent)}%
          </div>
        </div>
      </div>
    </div>
  );
}
