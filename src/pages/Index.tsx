import WaterProgress from '@/components/WaterProgress';
import QuickAddButtons from '@/components/QuickAddButtons';
import IntakeTimeline from '@/components/IntakeTimeline';
import WeeklyChart from '@/components/WeeklyChart';
import StreakCounter from '@/components/StreakCounter';
import { useWater } from '@/contexts/WaterContext';
import { Target, TrendingUp } from 'lucide-react';

export default function Index() {
  const { todayRecord, settings, userName } = useWater();
  const remaining = Math.max(settings.dailyGoal - todayRecord.total, 0);
  const remainLabel = settings.unit === 'oz'
    ? `${(remaining * 0.033814).toFixed(0)} oz`
    : `${remaining} ml`;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Page title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground leading-tight tracking-tight">
            Hello, {userName || 'there'}!
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Track your daily water intake on your desktop dashboard</p>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-12 gap-6">
          {/* Left column — Progress + Quick Add */}
          <div className="col-span-12 lg:col-span-5 space-y-6">
            <div className="glass rounded-2xl p-8">
              <WaterProgress />
              <div className="mt-4">
                <QuickAddButtons />
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="glass rounded-2xl p-5 flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-accent/20 flex items-center justify-center shrink-0">
                  <Target className="w-5 h-5 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Remaining</p>
                  <p className="text-lg font-bold text-foreground tabular-nums">{remainLabel}</p>
                </div>
              </div>
              <StreakCounter />
            </div>
          </div>

          {/* Right column — Chart + Timeline */}
          <div className="col-span-12 lg:col-span-7 space-y-6">
            <WeeklyChart />
            <IntakeTimeline />
          </div>
        </div>
      </div>
    </div>
  );
}
