import { useWater } from '@/contexts/WaterContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Save } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function Settings() {
  const { settings, updateSettings, resetAllData } = useWater();
  const [goalInput, setGoalInput] = useState(String(settings.dailyGoal));
  const [intervalInput, setIntervalInput] = useState(String(settings.reminderInterval));
  const [cupInput, setCupInput] = useState('');

  const handleGoalBlur = () => {
    const val = parseInt(goalInput, 10);
    if (val > 0) updateSettings({ dailyGoal: val });
    else setGoalInput(String(settings.dailyGoal));
  };

  const handleIntervalBlur = () => {
    const val = parseInt(intervalInput, 10);
    if (val > 0) updateSettings({ reminderInterval: val });
    else setIntervalInput(String(settings.reminderInterval));
  };

  const addCupSize = () => {
    const val = parseInt(cupInput, 10);
    if (val > 0 && !settings.cupSizes.includes(val)) {
      updateSettings({ cupSizes: [...settings.cupSizes, val].sort((a, b) => a - b) });
      setCupInput('');
    }
  };

  const removeCupSize = (size: number) => {
    if (settings.cupSizes.length > 1) {
      updateSettings({ cupSizes: settings.cupSizes.filter(s => s !== size) });
    }
  };

  const saveSettings = async () => {
    const dailyGoal = parseInt(goalInput, 10);
    const reminderInterval = parseInt(intervalInput, 10);
    
    await updateSettings({
      dailyGoal: dailyGoal > 0 ? dailyGoal : settings.dailyGoal,
      reminderInterval: reminderInterval > 0 ? reminderInterval : settings.reminderInterval,
    });
    
    toast.success('Settings saved successfully!');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground leading-tight">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Customize your hydration preferences</p>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Left column */}
          <div className="col-span-12 lg:col-span-6 space-y-5">
            {/* Daily Goal */}
            <div className="glass rounded-2xl p-6 space-y-3">
              <Label className="text-sm font-semibold">Daily Water Goal ({settings.unit})</Label>
              <Input
                type="number"
                value={goalInput}
                onChange={e => setGoalInput(e.target.value)}
                onBlur={handleGoalBlur}
                className="rounded-xl max-w-xs"
              />
            </div>

            {/* Unit */}
            <div className="glass rounded-2xl p-6 space-y-3">
              <Label className="text-sm font-semibold">Unit</Label>
              <Select
                value={settings.unit}
                onValueChange={(v: 'ml' | 'oz') => updateSettings({ unit: v })}
              >
                <SelectTrigger className="rounded-xl max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ml">Milliliters (ml)</SelectItem>
                  <SelectItem value="oz">Ounces (oz)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Reminder Interval */}
            <div className="glass rounded-2xl p-6 space-y-3">
              <Label className="text-sm font-semibold">Reminder Interval (minutes)</Label>
              <Input
                type="number"
                value={intervalInput}
                onChange={e => setIntervalInput(e.target.value)}
                onBlur={handleIntervalBlur}
                className="rounded-xl max-w-xs"
              />
            </div>
          </div>

          {/* Right column */}
          <div className="col-span-12 lg:col-span-6 space-y-5">
            {/* Cup Sizes */}
            <div className="glass rounded-2xl p-6 space-y-3">
              <Label className="text-sm font-semibold">Quick Add Sizes ({settings.unit})</Label>
              <div className="flex flex-wrap gap-2">
                {settings.cupSizes.map(size => (
                  <button
                    key={size}
                    onClick={() => removeCupSize(size)}
                    className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium hover:bg-destructive/10 hover:text-destructive transition-colors active:scale-[0.97] group"
                    title="Click to remove"
                  >
                    {size}{settings.unit}
                    <span className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity">×</span>
                  </button>
                ))}
              </div>
              <div className="flex gap-2 max-w-xs">
                <Input
                  type="number"
                  placeholder="Add size"
                  value={cupInput}
                  onChange={e => setCupInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCupSize()}
                  className="rounded-xl"
                />
                <Button onClick={addCupSize} variant="outline" className="rounded-xl">
                  Add
                </Button>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-4">
              <Button onClick={saveSettings} className="w-full rounded-2xl h-12 text-md">
                <Save className="w-5 h-5 mr-2" />
                Save Changes
              </Button>
            </div>

            {/* Notifications */}
            <div className="glass rounded-2xl p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Browser Notifications</p>
                <p className="text-xs text-muted-foreground mt-0.5">Get reminded to drink water</p>
              </div>
              <Switch
                checked={settings.notificationsEnabled}
                onCheckedChange={v => {
                  if (v && 'Notification' in window) {
                    Notification.requestPermission().then(p => {
                      updateSettings({ notificationsEnabled: p === 'granted' });
                    });
                  } else {
                    updateSettings({ notificationsEnabled: v });
                  }
                }}
              />
            </div>

            {/* Reset */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full rounded-2xl border-destructive/30 text-destructive hover:bg-destructive/10 hover:border-destructive/50 active:scale-[0.98] transition-all"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Reset All Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="glass rounded-3xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset all data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all your water intake history and reset settings to defaults.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={resetAllData}
                    className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Reset Everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </div>
  );
}
