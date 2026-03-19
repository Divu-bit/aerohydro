import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings as SettingsIcon, Save, Ruler, Activity, Clock, ArrowLeft, RefreshCw,
} from 'lucide-react';
import { loadProfile, saveProfile, saveDailyLog, loadDailyLog } from '../utils/storage';
import { calculateBMI, calculateDailyGoal, generateSchedule, lbsToKg, ftInToCm } from '../utils/hydration';
import { scheduleNotifications } from '../utils/notifications';

export default function Settings() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const p = loadProfile();
    if (!p) { navigate('/'); return; }
    setProfile(p);
    setForm({
      weight: p.unit === 'metric' ? p.weightKg : Math.round(p.weightKg / 0.453592),
      height: p.unit === 'metric' ? p.heightCm : '',
      heightFt: p.unit !== 'metric' ? Math.floor(p.heightCm / 2.54 / 12) : '',
      heightIn: p.unit !== 'metric' ? Math.round((p.heightCm / 2.54) % 12) : '',
      activityLevel: p.activityLevel,
      wakeTime: p.wakeTime,
      sleepTime: p.sleepTime,
      unit: p.unit || 'metric',
      name: p.name || '',
      age: p.age || '',
    });
  }, [navigate]);

  if (!profile) return null;

  const set = (key) => (e) => { setForm(f => ({ ...f, [key]: e.target.value })); setSaved(false); };

  const handleSave = () => {
    const weightKg = form.unit === 'metric' ? Number(form.weight) : lbsToKg(Number(form.weight));
    const heightCm = form.unit === 'metric'
      ? Number(form.height)
      : ftInToCm(Number(form.heightFt), Number(form.heightIn));
    const bmi = calculateBMI(weightKg, heightCm);
    const dailyGoal = calculateDailyGoal(weightKg, bmi, form.activityLevel);
    const schedule = generateSchedule(form.wakeTime, form.sleepTime, dailyGoal);

    const updated = {
      ...profile,
      name: form.name,
      age: Number(form.age),
      weightKg,
      heightCm,
      bmi,
      activityLevel: form.activityLevel,
      wakeTime: form.wakeTime,
      sleepTime: form.sleepTime,
      dailyGoal,
      unit: form.unit,
    };
    saveProfile(updated);

    // Preserve today's logged amount but regenerate schedule
    const existing = loadDailyLog();
    const logged = existing ? existing.logged : 0;
    saveDailyLog({ logged, schedule, date: new Date().toISOString().slice(0, 10) });
    scheduleNotifications(schedule);

    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const weightKg = form.unit === 'metric' ? Number(form.weight) : lbsToKg(Number(form.weight));
  const heightCm = form.unit === 'metric'
    ? Number(form.height || 0)
    : ftInToCm(Number(form.heightFt || 0), Number(form.heightIn || 0));
  const previewBmi = calculateBMI(weightKg, heightCm);
  const previewGoal = calculateDailyGoal(weightKg, previewBmi, form.activityLevel);

  return (
    <div className="flex-1 h-full overflow-y-auto p-6 lg:p-10">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8 animate-fade-in-up">
        <button onClick={() => navigate('/dashboard')} className="btn-glass p-3 rounded-xl">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3" style={{ fontFamily: "'Montserrat', sans-serif" }}>
            <SettingsIcon size={28} className="text-sky-400" /> Settings
          </h1>
          <p className="text-white/40 text-sm mt-1">Update your profile & recalculate your plan.</p>
        </div>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Personal */}
        <Section title="Personal" icon={<Ruler size={18} className="text-sky-400" />}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Name">
              <input className="input-glass" value={form.name} onChange={set('name')} />
            </Field>
            <Field label="Age">
              <input className="input-glass" type="number" min="1" value={form.age} onChange={set('age')} />
            </Field>
          </div>

          <div className="flex gap-2 mt-4">
            {['metric', 'imperial'].map(u => (
              <button key={u}
                onClick={() => { setForm(f => ({ ...f, unit: u })); setSaved(false); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                  form.unit === u ? 'bg-sky-500/30 text-sky-300 border border-sky-500/40' : 'btn-glass'
                }`}
              >{u === 'metric' ? 'Metric (kg/cm)' : 'Imperial (lbs/ft)'}</button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <Field label={`Weight (${form.unit === 'metric' ? 'kg' : 'lbs'})`}>
              <input className="input-glass" type="number" min="1" value={form.weight} onChange={set('weight')} />
            </Field>
            {form.unit === 'metric' ? (
              <Field label="Height (cm)">
                <input className="input-glass" type="number" min="1" value={form.height} onChange={set('height')} />
              </Field>
            ) : (
              <div className="flex gap-2">
                <Field label="Feet">
                  <input className="input-glass" type="number" min="1" value={form.heightFt} onChange={set('heightFt')} />
                </Field>
                <Field label="Inches">
                  <input className="input-glass" type="number" min="0" max="11" value={form.heightIn} onChange={set('heightIn')} />
                </Field>
              </div>
            )}
          </div>
        </Section>

        {/* Activity Level */}
        <Section title="Activity Level" icon={<Activity size={18} className="text-sky-400" />}>
          <div className="grid grid-cols-2 gap-3">
            {[
              { v: 'low', emoji: '🧘', label: 'Low' },
              { v: 'moderate', emoji: '🚶', label: 'Moderate' },
              { v: 'high', emoji: '🏃', label: 'High' },
              { v: 'very-high', emoji: '🏋️', label: 'Very High' },
            ].map(({ v, emoji, label }) => (
              <button key={v}
                onClick={() => { setForm(f => ({ ...f, activityLevel: v })); setSaved(false); }}
                className={`p-3 rounded-xl text-sm text-left transition-all duration-300 ${
                  form.activityLevel === v
                    ? 'bg-sky-500/25 border border-sky-500/40'
                    : 'glass hover:bg-white/8'
                }`}
              >
                <span className="text-xl">{emoji}</span> <span className="font-medium ml-1">{label}</span>
              </button>
            ))}
          </div>
        </Section>

        {/* Schedule */}
        <Section title="Schedule" icon={<Clock size={18} className="text-sky-400" />}>
          <div className="flex gap-4">
            <Field label="Wake Up">
              <input className="input-glass" type="time" value={form.wakeTime} onChange={set('wakeTime')} />
            </Field>
            <Field label="Sleep">
              <input className="input-glass" type="time" value={form.sleepTime} onChange={set('sleepTime')} />
            </Field>
          </div>
        </Section>

        {/* Preview */}
        <div className="glass p-5 rounded-2xl border border-sky-500/15">
          <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3 flex items-center gap-2">
            <RefreshCw size={14} className="text-sky-400" /> Live Preview
          </h3>
          <div className="flex gap-6 text-sm">
            <div>
              <span className="text-white/40">BMI</span>
              <p className="text-xl font-bold text-sky-300">{previewBmi || '—'}</p>
            </div>
            <div>
              <span className="text-white/40">Daily Goal</span>
              <p className="text-xl font-bold text-sky-300">{previewGoal || '—'} ml</p>
            </div>
          </div>
        </div>

        {/* Save */}
        <button onClick={handleSave}
          className={`btn-primary w-full flex items-center justify-center gap-2 py-4 text-base transition-all duration-300 ${
            saved ? '!bg-emerald-500 !shadow-emerald-500/30' : ''
          }`}>
          <Save size={20} /> {saved ? 'Saved ✓' : 'Save & Recalculate'}
        </button>
      </div>
    </div>
  );
}

function Section({ title, icon, children }) {
  return (
    <div className="glass-strong p-6 rounded-2xl animate-fade-in-up">
      <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4 flex items-center gap-2">
        {icon} {title}
      </h3>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="flex-1">
      <label className="text-xs text-white/40 uppercase tracking-wider mb-1 block">{label}</label>
      {children}
    </div>
  );
}
