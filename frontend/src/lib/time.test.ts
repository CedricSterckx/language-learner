import { describe, expect, it } from 'vitest';
import { checkTimeAnswer, generateTimeQuestion, toKoreanTime } from './time';

describe('time helpers', () => {
  it('formats Korean time for hours and minutes', () => {
    expect(toKoreanTime(3, 0, false)).toContain('시');
    expect(toKoreanTime(7, 30, false)).toContain('분');
  });

  it('generates non-repeating time when possible', () => {
    const first = generateTimeQuestion('medium', false);
    const next = generateTimeQuestion('medium', false, { hour: first.hour, minute: first.minute });
    expect(next.hour).toBeGreaterThanOrEqual(1);
  });

  it('normalizes answers when checking', () => {
    expect(checkTimeAnswer('세 시 삼십 분', '세 시  삼십  분')).toBe(true);
  });
});

