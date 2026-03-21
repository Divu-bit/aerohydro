import { useState } from "react";
import { useNavigate } from "react-router-dom";
import OnboardingLayout from "@/components/OnboardingLayout";
import { User, Link2, Activity, Clock, Sparkles, Droplets } from "lucide-react";
import { createOrUpdateUser } from "@/utils/storage";

const TOTAL_STEPS = 5;

const Onboarding = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [data, setData] = useState({
    name: "",
    age: "25",
    unit: "metric",
    weight: "70",
    height: "175",
    activity: "moderate",
    wakeUp: "07:00",
    sleep: "23:00",
  });

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const weightNum = parseFloat(data.weight) || 0;
  const heightNum = parseFloat(data.height) || 0;
  const heightM = data.unit === "metric" ? heightNum / 100 : heightNum * 0.3048;
  const weightKg = data.unit === "metric" ? weightNum : weightNum * 0.4536;
  const bmi = heightM > 0 ? (weightKg / (heightM * heightM)).toFixed(1) : "0";

  const activityMultiplier = {
    low: 30,
    moderate: 33,
    high: 37,
    very_high: 40,
  };
  const dailyGoal = Math.round(weightKg * (activityMultiplier[data.activity] || 33));

  const inputClasses =
    "w-full rounded-md border border-border bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-shadow";
  const labelClasses = "block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5";

  const activities = [
    { key: "low", label: "Low", desc: "Mostly sedentary", emoji: "🧘" },
    { key: "moderate", label: "Moderate", desc: "Light exercise", emoji: "🏃" },
    { key: "high", label: "High", desc: "Regular workouts", emoji: "🏋️" },
    { key: "very_high", label: "Very High", desc: "Intense training", emoji: "🤸" },
  ];

  const handleFinish = async () => {
    setIsSubmitting(true);
    
    // Create new profile object mapped to defaults plus user input
    const newProfile = {
      name: data.name || "AeroHydrator",
      age: parseInt(data.age, 10),
      weightKg,
      dailyGoal,
      reminderInterval: 60, // Default 60 mins
      cupSizes: [100, 250, 500],
      unit: "ml",
      notificationsEnabled: false
    };

    // Make an empty list of entries to kick off their first day
    const initialLog = {
      entries: [],
      date: new Date().toISOString().slice(0, 10),
      logged: 0
    };

    try {
      await createOrUpdateUser(newProfile, initialLog, null);
      if ('Notification' in window) {
        // Just request it here so it pops up contextually
        Notification.requestPermission();
      }
      // Force page reload so WaterContext picks up the new userId
      window.location.href = '/dashboard';
    } catch (e) {
      console.error(e);
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {step === 0 && (
        <OnboardingLayout
          step={0}
          totalSteps={TOTAL_STEPS}
          title="Welcome"
          icon={<User className="h-6 w-6" />}
          subtitle="Let's personalize your hydration plan."
          onNext={next}
        >
          <div className="space-y-5">
            <div>
              <label className={labelClasses}>Your Name</label>
              <input
                className={inputClasses}
                placeholder="Alex"
                value={data.name}
                onChange={(e) => setData({ ...data, name: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClasses}>Age</label>
              <input
                className={`${inputClasses} max-w-[120px]`}
                type="number"
                value={data.age}
                onChange={(e) => setData({ ...data, age: e.target.value })}
              />
            </div>
          </div>
        </OnboardingLayout>
      )}

      {step === 1 && (
        <OnboardingLayout
          step={1}
          totalSteps={TOTAL_STEPS}
          title="Body Metrics"
          icon={<Link2 className="h-6 w-6" />}
          onBack={back}
          onNext={next}
        >
          <div className="space-y-5">
            <div className="flex rounded-lg border border-border overflow-hidden">
              {["metric", "imperial"].map((u) => (
                <button
                  key={u}
                  onClick={() => setData({ ...data, unit: u })}
                  className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                    data.unit === u
                      ? "bg-primary/20 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {u === "metric" ? "kg / cm" : "lbs / ft"}
                </button>
              ))}
            </div>
            <div>
              <label className={labelClasses}>
                Weight ({data.unit === "metric" ? "kg" : "lbs"})
              </label>
              <input
                className={inputClasses}
                type="number"
                value={data.weight}
                onChange={(e) => setData({ ...data, weight: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClasses}>
                Height ({data.unit === "metric" ? "cm" : "ft"})
              </label>
              <input
                className={inputClasses}
                type="number"
                value={data.height}
                onChange={(e) => setData({ ...data, height: e.target.value })}
              />
            </div>
          </div>
        </OnboardingLayout>
      )}

      {step === 2 && (
        <OnboardingLayout
          step={2}
          totalSteps={TOTAL_STEPS}
          title="Activity Level"
          icon={<Activity className="h-6 w-6" />}
          onBack={back}
          onNext={next}
        >
          <div className="grid grid-cols-2 gap-3">
            {activities.map((a) => (
              <button
                key={a.key}
                onClick={() => setData({ ...data, activity: a.key })}
                className={`rounded-lg border p-4 text-left transition-all active:scale-[0.97] ${
                  data.activity === a.key
                    ? "border-primary/50 bg-primary/10 shadow-[0_0_12px_hsl(var(--primary)/0.15)]"
                    : "border-border hover:border-muted-foreground/40"
                }`}
              >
                <span className="text-xl">{a.emoji}</span>
                <p className="mt-2 text-sm font-semibold text-foreground">{a.label}</p>
                <p className="text-xs text-muted-foreground">{a.desc}</p>
              </button>
            ))}
          </div>
        </OnboardingLayout>
      )}

      {step === 3 && (
        <OnboardingLayout
          step={3}
          totalSteps={TOTAL_STEPS}
          title="Your Schedule"
          icon={<Clock className="h-6 w-6" />}
          subtitle="We'll space your hydration milestones evenly."
          onBack={back}
          onNext={next}
        >
          <div className="flex gap-8">
            <div>
              <label className={labelClasses}>Wake Up</label>
              <input
                type="time"
                className={`${inputClasses} max-w-[140px]`}
                value={data.wakeUp}
                onChange={(e) => setData({ ...data, wakeUp: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClasses}>Sleep</label>
              <input
                type="time"
                className={`${inputClasses} max-w-[140px]`}
                value={data.sleep}
                onChange={(e) => setData({ ...data, sleep: e.target.value })}
              />
            </div>
          </div>
        </OnboardingLayout>
      )}

      {step === 4 && (
        <OnboardingLayout
          step={4}
          totalSteps={TOTAL_STEPS}
          title="Your Plan"
          icon={<Sparkles className="h-6 w-6" />}
          onBack={back}
          onNext={isSubmitting ? undefined : handleFinish}
          nextLabel={isSubmitting ? "Saving..." : "Start Hydrating"}
          nextIcon={<Droplets className="h-4 w-4" />}
        >
          <div className="rounded-lg border border-border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">BMI</span>
              <span className="font-semibold text-primary">{bmi}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Daily Goal</span>
              <span className="font-semibold text-primary">{dailyGoal} ml</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Reminder Interval</span>
              <span className="font-semibold text-primary">60 mins</span>
            </div>
          </div>
        </OnboardingLayout>
      )}
    </>
  );
};

export default Onboarding;
