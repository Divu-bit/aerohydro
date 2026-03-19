import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Droplets, GlassWater, TrendingUp, Clock, Target, Award, Plus,
} from 'lucide-react';
import LiquidOrb from '../components/LiquidOrb';
import { loadProfile, loadDailyLog, saveDailyLog } from '../utils/storage';
import { generateSchedule } from '../utils/hydration';
import { scheduleNotifications } from '../utils/notifications';

export default function Dashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [log, setLog] = useState(null);
  const [customAmt, setCustomAmt] = useState('');
  const [rippleKey, setRippleKey] = useState(0);

  useEffect(() => {
    const p = loadProfile();
    if (!p) { navigate('/'); return; }
    setProfile(p);

    let d = loadDailyLog();
    if (!d || d.date !== new Date().toISOString().slice(0, 10)) {
      // New day – regenerate schedule
      const schedule = generateSchedule(p.wakeTime, p.sleepTime, p.dailyGoal);
      d = { logged: 0, schedule, date: new Date().toISOString().slice(0, 10) };
      saveDailyLog(d);
      scheduleNotifications(schedule);
    }
    setLog(d);
  }, [navigate]);

  const logWater = useCallback((ml) => {
    setLog(prev => {
      const updated = { ...prev, logged: prev.logged + ml };
      // Auto-complete the next uncompleted milestone
      const sched = updated.schedule.map((s, i) => {
        if (!s.completed && updated.logged >= updated.schedule.slice(0, i + 1).reduce((a, b) => a + b.amountMl, 0)) {
          return { ...s, completed: true };
        }
        return s;
      });
      updated.schedule = sched;
      saveDailyLog(updated);
      return updated;
    });
    setRippleKey(k => k + 1);
  }, []);

  if (!profile || !log) return null;

  const progress = Math.min(1, log.logged / profile.dailyGoal);
  const pct = Math.round(progress * 100);
  const remaining = Math.max(0, profile.dailyGoal - log.logged);

  // Find the next upcoming milestone
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nextMilestone = log.schedule.find(s => {
    if (s.completed) return false;
    const [h, m] = s.time.split(':').map(Number);
    return h * 60 + m >= nowMinutes;
  });

  return (
    <div className="flex-1 h-full overflow-y-auto p-6 lg:p-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 animate-fade-in-up">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: "'Montserrat', sans-serif" }}>
            Good {now.getHours() < 12 ? 'Morning' : now.getHours() < 17 ? 'Afternoon' : 'Evening'}, {profile.name || 'there'}
          </h1>
          <p className="text-white/40 text-sm mt-1">Stay hydrated, stay sharp.</p>
        </div>
        <div className="flex items-center gap-2 text-white/40 text-sm">
          <Calendar size={14} />
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* ── Left column: Orb + Quick Log ──────── */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-6">
          {/* Orb card */}
          <div className="glass-strong p-6 rounded-2xl animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <LiquidOrb key={rippleKey} progress={progress} onRipple={() => {}} />
            <div className="text-center mt-2">
              <p className="text-4xl font-bold text-sky-300" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                {log.logged} <span className="text-lg text-white/40 font-normal">ml</span>
              </p>
              <p className="text-white/40 text-sm">of {profile.dailyGoal} ml goal</p>
            </div>
          </div>

          {/* Quick log buttons */}
          <div className="glass p-5 rounded-2xl animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3 flex items-center gap-2">
              <GlassWater size={16} className="text-sky-400" /> Log Water
            </h3>
            <div className="flex gap-3 mb-3">
              {[250, 500].map(amt => (
                <button key={amt} onClick={() => logWater(amt)}
                  className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm py-3">
                  <Droplets size={16} /> {amt} ml
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input className="input-glass flex-1 text-sm" type="number" min="1" placeholder="Custom ml"
                value={customAmt} onChange={e => setCustomAmt(e.target.value)} />
              <button className="btn-glass px-4" disabled={!customAmt || Number(customAmt) <= 0}
                onClick={() => { logWater(Number(customAmt)); setCustomAmt(''); }}>
                <Plus size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Right column: Stats + Timeline ───── */}
        <div className="col-span-12 lg:col-span-7 flex flex-col gap-6">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4 animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
            <StatCard icon={<Target size={20} />} label="BMI" value={profile.bmi} color="sky" />
            <StatCard icon={<TrendingUp size={20} />} label="Completed" value={`${pct}%`} color="emerald" />
            <StatCard icon={<Droplets size={20} />} label="Remaining" value={`${remaining} ml`} color="violet" />
          </div>

          {/* Next Sip alert */}
          {nextMilestone && (
            <div className="glass p-4 rounded-2xl flex items-center gap-4 border border-sky-500/20 animate-fade-in-up"
              style={{ animationDelay: '0.25s' }}>
              <div className="w-12 h-12 rounded-xl bg-sky-500/20 flex items-center justify-center">
                <Clock size={22} className="text-sky-400" />
              </div>
              <div>
                <p className="text-sm text-white/50">Next Sip</p>
                <p className="text-lg font-semibold text-sky-300">{nextMilestone.time}</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-sm text-white/50">Amount</p>
                <p className="font-semibold">{nextMilestone.amountMl} ml</p>
              </div>
            </div>
          )}

          {pct >= 100 && (
            <div className="glass p-4 rounded-2xl flex items-center gap-4 border border-emerald-500/30 animate-fade-in-up">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Award size={22} className="text-emerald-400" />
              </div>
              <div>
                <p className="font-semibold text-emerald-300">🎉 Goal Reached!</p>
                <p className="text-sm text-white/50">You've hit your daily hydration target.</p>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="glass p-5 rounded-2xl flex-1 overflow-hidden animate-fade-in-up"
            style={{ animationDelay: '0.3s' }}>
            <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Clock size={16} className="text-sky-400" /> Hydration Timeline
            </h3>
            <div className="overflow-y-auto" style={{ maxHeight: '300px' }}>
              {log.schedule.map((s, i) => {
                const isNext = nextMilestone && s.id === nextMilestone.id;
                return (
                  <div key={i} className="flex items-center gap-4 relative py-3">
                    {/* Vertical line */}
                    {i < log.schedule.length - 1 && (
                      <div className="absolute left-[15px] top-[36px] w-0.5 h-full"
                        style={{ background: s.completed ? 'rgba(56,189,248,0.3)' : 'rgba(255,255,255,0.08)' }} />
                    )}
                    {/* Dot */}
                    <div className={`w-[30px] h-[30px] rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 z-10 ${
                      s.completed
                        ? 'bg-sky-500/30 border-2 border-sky-400'
                        : isNext
                          ? 'bg-sky-500/15 border-2 border-sky-400/60 shadow-lg shadow-sky-500/30'
                          : 'bg-white/5 border border-white/15'
                    }`}>
                      {s.completed ? (
                        <Droplets size={14} className="text-sky-300" />
                      ) : isNext ? (
                        <div className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                      ) : (
                        <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                      )}
                    </div>
                    {/* Info */}
                    <div className="flex-1 flex items-center justify-between">
                      <div>
                        <p className={`text-sm font-medium ${s.completed ? 'text-sky-300' : isNext ? 'text-white' : 'text-white/40'}`}>
                          {s.time}
                        </p>
                        <p className="text-xs text-white/30">{s.amountMl} ml</p>
                      </div>
                      {s.completed && (
                        <span className="text-xs text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full">Done</span>
                      )}
                      {isNext && (
                        <span className="text-xs text-sky-300 bg-sky-500/15 px-2 py-0.5 rounded-full animate-pulse">Next</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Small stat card ─────────────────────────────────── */
function StatCard({ icon, label, value, color }) {
  const colors = {
    sky: 'bg-sky-500/15 text-sky-400 border-sky-500/20',
    emerald: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    violet: 'bg-violet-500/15 text-violet-400 border-violet-500/20',
  };
  return (
    <div className={`glass p-4 rounded-2xl border ${colors[color]}`}>
      <div className="mb-2">{icon}</div>
      <p className="text-xs text-white/40 uppercase tracking-wider">{label}</p>
      <p className="text-xl font-bold mt-0.5">{value}</p>
    </div>
  );
}

function Calendar({ size, className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/>
      <line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>
    </svg>
  );
}
