import { toSinoKorean } from './numbers';

export type TimeDifficulty = 'easy' | 'medium' | 'hard' | 'expert';

// Native Korean hours (shortened forms used with 시)
const KOREAN_HOURS: Record<number, string> = {
  1: '한',
  2: '두',
  3: '세',
  4: '네',
  5: '다섯',
  6: '여섯',
  7: '일곱',
  8: '여덟',
  9: '아홉',
  10: '열',
  11: '열한',
  12: '열두',
};

// For 24h format, hours 13-24 use these
const KOREAN_HOURS_EXTENDED: Record<number, string> = {
  ...KOREAN_HOURS,
  13: '열세',
  14: '열네',
  15: '열다섯',
  16: '열여섯',
  17: '열일곱',
  18: '열여덟',
  19: '열아홉',
  20: '스무',
  21: '스물한',
  22: '스물두',
  23: '스물세',
  0: '영', // midnight in 24h
  24: '스물네',
};

/**
 * Convert hour to Korean
 * @param hour - 0-23 for 24h format, 1-12 for 12h format
 * @param is24h - whether using 24h format
 */
export const toKoreanHour = (hour: number, is24h: boolean): string => {
  if (is24h) {
    // 24h format: 0-23
    if (hour === 0) return '영';
    if (hour <= 12) return KOREAN_HOURS[hour];
    return KOREAN_HOURS_EXTENDED[hour] || '';
  } else {
    // 12h format: 1-12
    const h = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return KOREAN_HOURS[h] || '';
  }
};

/**
 * Convert minute to Korean using Sino-Korean numbers
 */
export const toKoreanMinute = (minute: number): string => {
  if (minute === 0) return '';
  return toSinoKorean(minute);
};

/**
 * Convert time to full Korean string
 * Format: [hour] 시 [minute] 분
 */
export const toKoreanTime = (hour: number, minute: number, is24h: boolean): string => {
  const hourStr = toKoreanHour(hour, is24h);
  const minuteStr = toKoreanMinute(minute);
  
  if (minute === 0) {
    return `${hourStr} 시`;
  }
  return `${hourStr} 시 ${minuteStr} 분`;
};

/**
 * Get minutes array based on difficulty
 */
const getMinutesForDifficulty = (difficulty: TimeDifficulty): number[] => {
  switch (difficulty) {
    case 'easy':
      return [0]; // Full hours only
    case 'medium':
      return [0, 15, 30, 45]; // Quarter hours
    case 'hard':
      return [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]; // 5-min intervals
    case 'expert':
      return Array.from({ length: 60 }, (_, i) => i); // Any minute
  }
};

/**
 * Generate a random time question
 */
export const generateTimeQuestion = (
  difficulty: TimeDifficulty,
  is24h: boolean,
  previousTime?: { hour: number; minute: number }
): { hour: number; minute: number; answer: string } => {
  const minutes = getMinutesForDifficulty(difficulty);
  const maxHour = is24h ? 23 : 12;
  const minHour = is24h ? 0 : 1;
  
  let hour: number;
  let minute: number;
  let attempts = 0;
  
  do {
    hour = Math.floor(Math.random() * (maxHour - minHour + 1)) + minHour;
    minute = minutes[Math.floor(Math.random() * minutes.length)];
    attempts++;
  } while (
    previousTime &&
    previousTime.hour === hour &&
    previousTime.minute === minute &&
    attempts < 50
  );
  
  const answer = toKoreanTime(hour, minute, is24h);
  
  return { hour, minute, answer };
};

/**
 * Check if answer is correct (normalize spaces)
 */
export const checkTimeAnswer = (userAnswer: string, correctAnswer: string): boolean => {
  const normalize = (s: string) => s.trim().replace(/\s+/g, ' ');
  return normalize(userAnswer) === normalize(correctAnswer);
};

/**
 * Get difficulty label with description
 */
export const getTimeDifficultyLabel = (d: TimeDifficulty): string => {
  switch (d) {
    case 'easy':
      return 'Easy (full hours)';
    case 'medium':
      return 'Medium (quarter hours)';
    case 'hard':
      return 'Hard (5-min intervals)';
    case 'expert':
      return 'Expert (any minute)';
  }
};

// Export hour data for chart modal
export const getTimeChartData = () => ({
  hours12: KOREAN_HOURS,
  hours24: KOREAN_HOURS_EXTENDED,
});

