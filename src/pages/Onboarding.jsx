import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Droplets, User, Ruler, Activity, Calendar, Clock, ChevronRight, ChevronLeft, Sparkles,
} from 'lucide-react';
import {
  calculateBMI, calculateDailyGoal, generateSchedule, lbsToKg, ftInToCm,
} from '../utils/hydration';
import { saveProfile, saveDailyLog } from '../utils/storage';
import { requestNotificationPermission, scheduleNotifications } from '../utils/notifications';

const STEPS = ['Basics', 'Body', 'Lifestyle', 'Schedule', 'Summary'];

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [unit, setUnit] = useState('metric'); // metric | imperial
  const [form, setForm] = useState({
    name: '',
    age: '',
    weight: '',
    height: '',
    heightFt: '',
    heightIn: '',
    activityLevel: 'moderate',
    wakeTime: '07:00',
    sleepTime: '23:00',
  });

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  /* ── Derived values ─────────────────────────── */
  const weightKg = unit === 'metric' ? Number(form.weight) : lbsToKg(Number(form.weight));
  const heightCm = unit === 'metric'
    ? Number(form.height)
    : ftInToCm(Number(form.heightFt), Number(form.heightIn));
  const bmi = calculateBMI(weightKg, heightCm);
  const dailyGoal = calculateDailyGoal(weightKg, bmi, form.activityLevel);
  const schedule = generateSchedule(form.wakeTime, form.sleepTime, dailyGoal);

  const canNext = () => {
    if (step === 0) return form.name.trim().length > 0 && form.age > 0;
    if (step === 1) {
      if (unit === 'metric') return form.weight > 0 && form.height > 0;
      return form.weight > 0 && form.heightFt > 0;
    }
    return true;
  };

  const handleFinish = async () => {
    const profile = {
      name: form.name,
      age: Number(form.age),
      weightKg,
      heightCm,
      bmi,
      activityLevel: form.activityLevel,
      wakeTime: form.wakeTime,
      sleepTime: form.sleepTime,
      dailyGoal,
      unit,
    };
    saveProfile(profile);
    saveDailyLog({ logged: 0, schedule, date: new Date().toISOString().slice(0, 10) });
    await requestNotificationPermission();
    scheduleNotifications(schedule);
    navigate('/dashboard');
  };

  /* ── Step renderers ─────────────────────────── */
  const renderStep = () => {
    switch (step) {
      case 0: return (
        <div className="flex flex-col gap-5 animate-fade-in-up">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <User size={24} className="text-sky-400" /> Welcome
          </h2>
          <p className="text-white/50 text-sm">Let's personalize your hydration plan.</p>
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wider mb-1 block">Your Name</label>
            <input className="input-glass" placeholder="e.g. Alex" value={form.name} onChange={set('name')} />
          </div>
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wider mb-1 block">Age</label>
            <input className="input-glass" type="number" min="1" max="120" placeholder="25" value={form.age} onChange={set('age')} />
          </div>
        </div>
      );

      case 1: return (
        <div className="flex flex-col gap-5 animate-fade-in-up">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Ruler size={24} className="text-sky-400" /> Body Metrics
          </h2>
          <div className="flex gap-2">
            {['metric', 'imperial'].map(u => (
              <button key={u} onClick={() => setUnit(u)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                  unit === u ? 'bg-sky-500/30 text-sky-300 border border-sky-500/40' : 'btn-glass'
                }`}
              >{u === 'metric' ? 'kg / cm' : 'lbs / ft'}</button>
            ))}
          </div>
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wider mb-1 block">
              Weight ({unit === 'metric' ? 'kg' : 'lbs'})
            </label>
            <input className="input-glass" type="number" min="1" placeholder={unit === 'metric' ? '70' : '154'}
              value={form.weight} onChange={set('weight')} />
          </div>
          {unit === 'metric' ? (
            <div>
              <label className="text-xs text-white/40 uppercase tracking-wider mb-1 block">Height (cm)</label>
              <input className="input-glass" type="number" min="1" placeholder="175" value={form.height} onChange={set('height')} />
            </div>
          ) : (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-white/40 uppercase tracking-wider mb-1 block">Feet</label>
                <input className="input-glass" type="number" min="1" placeholder="5" value={form.heightFt} onChange={set('heightFt')} />
              </div>
              <div className="flex-1">
                <label className="text-xs text-white/40 uppercase tracking-wider mb-1 block">Inches</label>
                <input className="input-glass" type="number" min="0" max="11" placeholder="9" value={form.heightIn} onChange={set('heightIn')} />
              </div>
            </div>
          )}
          {bmi > 0 && (
            <div className="glass p-3 rounded-xl text-center text-sm">
              Your BMI: <span className="text-sky-300 font-semibold text-lg">{bmi}</span>
            </div>
          )}
        </div>
      );

      case 2: return (
        <div className="flex flex-col gap-5 animate-fade-in-up">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Activity size={24} className="text-sky-400" /> Activity Level
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { v: 'low', emoji: '🧘', label: 'Low', desc: 'Mostly sedentary' },
              { v: 'moderate', emoji: '🚶', label: 'Moderate', desc: 'Light exercise' },
              { v: 'high', emoji: '🏃', label: 'High', desc: 'Regular workouts' },
              { v: 'very-high', emoji: '🏋️', label: 'Very High', desc: 'Intense training' },
            ].map(({ v, emoji, label, desc }) => (
              <button key={v} onClick={() => setForm(f => ({ ...f, activityLevel: v }))}
                className={`p-4 rounded-xl text-left transition-all duration-300 ${
                  form.activityLevel === v
                    ? 'bg-sky-500/25 border border-sky-500/40 shadow-lg shadow-sky-500/10'
                    : 'glass hover:bg-white/8'
                }`}
              >
                <span className="text-2xl">{emoji}</span>
                <p className="font-semibold mt-1 text-sm">{label}</p>
                <p className="text-xs text-white/40">{desc}</p>
              </button>
            ))}
          </div>
        </div>
      );

      case 3: return (
        <div className="flex flex-col gap-5 animate-fade-in-up">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Clock size={24} className="text-sky-400" /> Your Schedule
          </h2>
          <p className="text-white/50 text-sm">We'll space your hydration milestones evenly.</p>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-xs text-white/40 uppercase tracking-wider mb-1 block">Wake Up</label>
              <input className="input-glass" type="time" value={form.wakeTime} onChange={set('wakeTime')} />
            </div>
            <div className="flex-1">
              <label className="text-xs text-white/40 uppercase tracking-wider mb-1 block">Sleep</label>
              <input className="input-glass" type="time" value={form.sleepTime} onChange={set('sleepTime')} />
            </div>
          </div>
        </div>
      );

      case 4: return (
        <div className="flex flex-col gap-5 animate-fade-in-up">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles size={24} className="text-sky-400" /> Your Plan
          </h2>
          <div className="glass p-5 rounded-xl space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-white/50">BMI</span>
              <span className="font-semibold text-sky-300">{bmi}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-white/50">Daily Goal</span>
              <span className="font-semibold text-sky-300">{dailyGoal} ml</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-white/50">Milestones</span>
              <span className="font-semibold text-sky-300">{schedule.length} sips</span>
            </div>
            <hr className="border-white/10" />
            <div className="max-h-40 overflow-y-auto space-y-1">
              {schedule.map((s, i) => (
                <div key={i} className="flex justify-between text-xs text-white/60 py-1">
                  <span>🕐 {s.time}</span>
                  <span>{s.amountMl} ml</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="flex items-center justify-center w-full h-full">
      <div className="glass-strong p-8 w-full max-w-md animate-fade-in-up" style={{ borderRadius: '24px' }}>
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${
                i === step ? 'bg-sky-400 scale-125 shadow-lg shadow-sky-400/50' :
                i < step ? 'bg-sky-600' : 'bg-white/15'
              }`} />
              {i < STEPS.length - 1 && (
                <div className={`w-6 h-0.5 rounded transition-all duration-500 ${i < step ? 'bg-sky-600' : 'bg-white/10'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="min-h-[300px]">{renderStep()}</div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          {step > 0 ? (
            <button className="btn-glass flex items-center gap-1" onClick={() => setStep(s => s - 1)}>
              <ChevronLeft size={18} /> Back
            </button>
          ) : <div />}

          {step < STEPS.length - 1 ? (
            <button className="btn-primary flex items-center gap-1"
              disabled={!canNext()} onClick={() => setStep(s => s + 1)}>
              Next <ChevronRight size={18} />
            </button>
          ) : (
            <button className="btn-primary flex items-center gap-2" onClick={handleFinish}>
              <Droplets size={18} /> Start Hydrating
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
