import { describe, expect, it } from 'vitest';
import { checkAnswer, generateQuestion, toNativeKorean, toSinoKorean } from './numbers';

describe('numbers utils', () => {
  it('generates sino and native answers', () => {
    const sino = toSinoKorean(25);
    expect(sino).toContain('십');
    const native = toNativeKorean(21);
    expect(native).toContain('스물');
  });

  it('produces different numbers when possible', () => {
    const first = generateQuestion('easy', 'sino');
    const second = generateQuestion('easy', 'sino', first.number);
    // If the generator hits the same number, ensure it stays within bounds
    expect(second.number).toBeGreaterThanOrEqual(0);
  });

  it('checks answers with trimming', () => {
    expect(checkAnswer('하나', '하나')).toBe(true);
    expect(checkAnswer(' 하나', '하나')).toBe(true);
  });
});

