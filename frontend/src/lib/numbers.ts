import sinoKoreanData from '@/assets/numbers/sino_korean.json';
import nativeKoreanData from '@/assets/numbers/native_korean.json';

export type NumberSystem = 'sino' | 'native' | 'both';
export type Difficulty = 'easy' | 'medium' | 'hard';

const sinoDigits = sinoKoreanData.digits as Record<string, string>;
const sinoPositions = sinoKoreanData.positions as Record<string, string>;
const nativeUnits = nativeKoreanData.units as Record<string, string>;
const nativeTens = nativeKoreanData.tens as Record<string, string>;

/**
 * Convert number to Sino-Korean (한자어 수)
 * Works for 0 - 999,999
 */
export const toSinoKorean = (n: number): string => {
  if (n < 0 || n > 999999) return '';
  if (n === 0) return sinoDigits['0'];

  let result = '';
  
  // 만 (10,000s place)
  const man = Math.floor(n / 10000);
  if (man > 0) {
    if (man === 1) {
      result += sinoPositions['10000'];
    } else {
      result += toSinoKoreanUnder10000(man) + sinoPositions['10000'];
    }
  }
  
  // Remainder under 10,000
  const remainder = n % 10000;
  if (remainder > 0) {
    result += toSinoKoreanUnder10000(remainder);
  }
  
  return result;
};

/**
 * Helper for numbers under 10,000
 */
const toSinoKoreanUnder10000 = (n: number): string => {
  if (n === 0) return '';
  
  let result = '';
  
  // 천 (1000s)
  const thousands = Math.floor(n / 1000);
  if (thousands > 0) {
    if (thousands === 1) {
      result += sinoPositions['1000'];
    } else {
      result += sinoDigits[thousands.toString()] + sinoPositions['1000'];
    }
  }
  
  // 백 (100s)
  const hundreds = Math.floor((n % 1000) / 100);
  if (hundreds > 0) {
    if (hundreds === 1) {
      result += sinoPositions['100'];
    } else {
      result += sinoDigits[hundreds.toString()] + sinoPositions['100'];
    }
  }
  
  // 십 (10s)
  const tens = Math.floor((n % 100) / 10);
  if (tens > 0) {
    if (tens === 1) {
      result += sinoPositions['10'];
    } else {
      result += sinoDigits[tens.toString()] + sinoPositions['10'];
    }
  }
  
  // 일 (1s)
  const ones = n % 10;
  if (ones > 0) {
    result += sinoDigits[ones.toString()];
  }
  
  return result;
};

/**
 * Convert number to Native Korean (고유어 수)
 * Only works for 1-99, returns empty string for 0 or > 99
 */
export const toNativeKorean = (n: number): string => {
  if (n <= 0 || n > 99) return '';
  
  if (n <= 10) {
    return nativeUnits[n.toString()];
  }
  
  const tens = Math.floor(n / 10) * 10;
  const ones = n % 10;
  
  let result = '';
  
  if (tens === 10) {
    result = nativeUnits['10'];
  } else {
    result = nativeTens[tens.toString()];
  }
  
  if (ones > 0) {
    result += nativeUnits[ones.toString()];
  }
  
  return result;
};

/**
 * Get difficulty range
 */
export const getDifficultyRange = (difficulty: Difficulty): { min: number; max: number } => {
  switch (difficulty) {
    case 'easy':
      return { min: 0, max: 9 };
    case 'medium':
      return { min: 0, max: 999 };
    case 'hard':
      return { min: 0, max: 999999 };
  }
};

/**
 * Generate random number based on difficulty
 */
export const generateRandomNumber = (difficulty: Difficulty): number => {
  const { min, max } = getDifficultyRange(difficulty);
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Generate question: returns the number, system to use, and correct answer
 */
export const generateQuestion = (
  difficulty: Difficulty,
  system: NumberSystem
): { number: number; system: 'sino' | 'native'; answer: string } => {
  let actualSystem: 'sino' | 'native';
  
  if (system === 'both') {
    // For native, limit to 1-99
    const canUseNative = difficulty === 'easy' || Math.random() < 0.5;
    actualSystem = canUseNative ? (Math.random() < 0.5 ? 'sino' : 'native') : 'sino';
  } else {
    actualSystem = system;
  }
  
  let num: number;
  
  if (actualSystem === 'native') {
    // Native Korean only goes 1-99
    const maxForNative = difficulty === 'easy' ? 9 : 99;
    num = Math.floor(Math.random() * maxForNative) + 1; // 1 to maxForNative
  } else {
    num = generateRandomNumber(difficulty);
  }
  
  const answer = actualSystem === 'sino' ? toSinoKorean(num) : toNativeKorean(num);
  
  return { number: num, system: actualSystem, answer };
};

/**
 * Check if answer is correct (case insensitive, trim whitespace)
 */
export const checkAnswer = (userAnswer: string, correctAnswer: string): boolean => {
  return userAnswer.trim() === correctAnswer.trim();
};

// Export data for the chart modal
export const getNumbersChartData = () => ({
  sinoDigits,
  sinoPositions,
  nativeUnits,
  nativeTens,
});

