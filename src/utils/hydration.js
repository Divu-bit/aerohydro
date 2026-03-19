/**
 * BMI & Hydration calculation utilities
 */

export function calculateBMI(weightKg, heightCm) {
  if (!weightKg || !heightCm) return 0;
  const heightM = heightCm / 100;
  return +(weightKg / (heightM * heightM)).toFixed(1);
}

export function calculateDailyGoal(weightKg, bmi, activityLevel) {
  let base = weightKg * 33; // ml
  if (bmi > 25 || activityLevel === 'high' || activityLevel === 'very-high') {
    base *= 1.15; // +15%
  }
  return Math.round(base);
}

/**
 * Convert "HH:MM" time string to total minutes since midnight.
 */
function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Convert total minutes since midnight back to "HH:MM" strings.
 */
function minutesToTime(mins) {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Generate evenly-spaced hydration milestones between wake and sleep.
 * Returns an array of { time: "HH:MM", amountMl: number }
 */
export function generateSchedule(wakeTime, sleepTime, totalMl, slots = 8) {
  const start = timeToMinutes(wakeTime);
  let end = timeToMinutes(sleepTime);
  if (end <= start) end += 24 * 60; // handle overnight

  const interval = (end - start) / (slots - 1);
  const perSlot = Math.round(totalMl / slots);
  const schedule = [];

  for (let i = 0; i < slots; i++) {
    const t = Math.round(start + i * interval);
    schedule.push({
      id: i,
      time: minutesToTime(t),
      amountMl: i === slots - 1 ? totalMl - perSlot * (slots - 1) : perSlot,
      completed: false,
    });
  }
  return schedule;
}

/**
 * Convert lbs → kg and ft/in → cm helpers
 */
export function lbsToKg(lbs) { return +(lbs * 0.453592).toFixed(1); }
export function ftInToCm(ft, inches = 0) { return +((ft * 12 + inches) * 2.54).toFixed(1); }
