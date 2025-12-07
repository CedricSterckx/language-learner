export type ProgressRecord = {
  ease: number;
  intervalMs: number;
  repetitions: number;
  dueAtMs: number;
  lapses: number;
  updatedAt: number;
};

export type GradeQuality = 'again' | 'hard' | 'good' | 'easy';

export const DEFAULT_PROGRESS: ProgressRecord = {
  ease: 2.5,
  intervalMs: 0,
  repetitions: 0,
  dueAtMs: 0,
  lapses: 0,
  updatedAt: 0,
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function schedule(prev: ProgressRecord | undefined, quality: GradeQuality, nowMs = Date.now()): ProgressRecord {
  const base = prev ?? DEFAULT_PROGRESS;
  let ease = clamp(base.ease, 1.3, 3.0);
  let interval = base.intervalMs;
  let repetitions = base.repetitions;
  let lapses = base.lapses;

  switch (quality) {
    case 'again': {
      ease = clamp(ease - 0.2, 1.3, 3.0);
      interval = 10 * 1000;
      repetitions = 0;
      lapses += 1;
      break;
    }
    case 'hard': {
      ease = clamp(ease - 0.15, 1.3, 3.0);
      interval = Math.max(60 * 1000, Math.round((interval || 30 * 1000) * 1.2));
      break;
    }
    case 'good': {
      if (repetitions === 0) {
        interval = 5 * 60 * 1000;
      } else {
        interval = Math.round(Math.max(2 * 60 * 1000, (interval || 60 * 1000) * ease));
      }
      repetitions = Math.max(1, repetitions + 1);
      break;
    }
    case 'easy': {
      ease = clamp(ease + 0.05, 1.3, 3.0);
      if (repetitions === 0) {
        interval = 10 * 60 * 1000;
      } else {
        interval = Math.round(Math.max(5 * 60 * 1000, (interval || 60 * 1000) * ease * 1.3));
      }
      repetitions = Math.max(1, repetitions + 1);
      break;
    }
  }

  return {
    ease,
    intervalMs: interval,
    repetitions,
    dueAtMs: nowMs + interval,
    lapses,
    updatedAt: nowMs,
  };
}

export function isDue(progress: ProgressRecord | undefined, nowMs = Date.now()): boolean {
  if (!progress) return true;
  return progress.dueAtMs <= nowMs;
}

