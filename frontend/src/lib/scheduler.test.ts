import { describe, expect, it } from 'vitest';
import { DEFAULT_PROGRESS, isDue, schedule } from './scheduler';

describe('schedule', () => {
  it('applies Again with short interval and lower ease', () => {
    const now = 1_000;
    const next = schedule(DEFAULT_PROGRESS, 'again', now);
    expect(next.ease).toBeLessThan(DEFAULT_PROGRESS.ease);
    expect(next.intervalMs).toBe(10_000);
    expect(next.dueAtMs).toBe(now + 10_000);
  });

  it('applies Good after first pass', () => {
    const now = 1_000;
    const prev = { ...DEFAULT_PROGRESS, repetitions: 1, intervalMs: 60_000 };
    const next = schedule(prev, 'good', now);
    expect(next.repetitions).toBeGreaterThan(prev.repetitions);
    expect(next.intervalMs).toBeGreaterThanOrEqual(120_000);
  });

  it('marks due items correctly', () => {
    const now = Date.now();
    expect(isDue(undefined, now)).toBe(true);
    expect(isDue({ ...DEFAULT_PROGRESS, dueAtMs: now - 1000 }, now)).toBe(true);
    expect(isDue({ ...DEFAULT_PROGRESS, dueAtMs: now + 1000 }, now)).toBe(false);
  });
});

