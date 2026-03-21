import { useWater } from '@/contexts/WaterContext';
import { Droplets, X } from 'lucide-react';

export default function IntakeTimeline() {
  const { todayRecord, removeEntry, settings } = useWater();
  const entries = [...todayRecord.entries].reverse();

  if (entries.length === 0) {
    return (
      <div className="glass rounded-2xl p-6 text-center">
        <Droplets className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No water logged yet today.</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Tap a button above to get started!</p>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl divide-y divide-border/50 overflow-hidden">
      <div className="px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">Today's Log</h3>
      </div>
      <div className="max-h-52 overflow-y-auto">
        {entries.map(entry => {
          const time = new Date(entry.timestamp).toLocaleTimeString('en', {
            hour: '2-digit',
            minute: '2-digit',
          });
          const amount = settings.unit === 'oz'
            ? `${(entry.amount * 0.033814).toFixed(1)} oz`
            : `${entry.amount} ml`;
          return (
            <div
              key={entry.id}
              className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors duration-150 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Droplets className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <span className="text-sm font-medium text-foreground">{amount}</span>
                  <span className="text-xs text-muted-foreground ml-2">{time}</span>
                </div>
              </div>
              <button
                onClick={() => removeEntry(entry.id)}
                className="opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-destructive/10 transition-all duration-150 active:scale-95"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
