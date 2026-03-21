import { useWater } from '@/contexts/WaterContext';
import { Flame } from 'lucide-react';

export default function StreakCounter() {
  const { streak } = useWater();

  return (
    <div className="glass rounded-2xl p-4 flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
        <Flame className="w-6 h-6 text-primary" />
      </div>
      <div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-foreground tabular-nums">{streak}</span>
          <span className="text-sm text-muted-foreground font-medium">
            {streak === 1 ? 'day' : 'days'}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">Current streak</p>
      </div>
    </div>
  );
}
