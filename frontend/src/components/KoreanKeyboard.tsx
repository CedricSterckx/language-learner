import { Button } from '@/components/ui/button';
import { useCallback, useRef, useEffect } from 'react';

// Korean Jamo arrays - ORDER MATTERS for Unicode composition
const INITIALS = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const MEDIALS = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'];
const FINALS = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

// Double consonants can only be initials, not finals
const DOUBLE_CONSONANTS = new Set(['ㄲ', 'ㄸ', 'ㅃ', 'ㅆ', 'ㅉ']);

// Index maps
const INITIAL_IDX: Record<string, number> = {};
INITIALS.forEach((c, i) => { INITIAL_IDX[c] = i; });

const MEDIAL_IDX: Record<string, number> = {};
MEDIALS.forEach((v, i) => { MEDIAL_IDX[v] = i; });

const FINAL_IDX: Record<string, number> = {};
FINALS.forEach((c, i) => { if (c) FINAL_IDX[c] = i; });

// Vowel combinations (base vowel + added vowel = combined vowel)
const VOWEL_COMBOS: Record<string, Record<string, string>> = {
  'ㅗ': { 'ㅏ': 'ㅘ', 'ㅐ': 'ㅙ', 'ㅣ': 'ㅚ' },
  'ㅜ': { 'ㅓ': 'ㅝ', 'ㅔ': 'ㅞ', 'ㅣ': 'ㅟ' },
  'ㅡ': { 'ㅣ': 'ㅢ' },
};

// Final consonant combinations
const FINAL_COMBOS: Record<string, Record<string, string>> = {
  'ㄱ': { 'ㅅ': 'ㄳ' },
  'ㄴ': { 'ㅈ': 'ㄵ', 'ㅎ': 'ㄶ' },
  'ㄹ': { 'ㄱ': 'ㄺ', 'ㅁ': 'ㄻ', 'ㅂ': 'ㄼ', 'ㅅ': 'ㄽ', 'ㅌ': 'ㄾ', 'ㅍ': 'ㄿ', 'ㅎ': 'ㅀ' },
  'ㅂ': { 'ㅅ': 'ㅄ' },
};

// Split combined finals (for when vowel follows)
const SPLIT_FINAL: Record<string, [string, string]> = {
  'ㄳ': ['ㄱ', 'ㅅ'],
  'ㄵ': ['ㄴ', 'ㅈ'],
  'ㄶ': ['ㄴ', 'ㅎ'],
  'ㄺ': ['ㄹ', 'ㄱ'],
  'ㄻ': ['ㄹ', 'ㅁ'],
  'ㄼ': ['ㄹ', 'ㅂ'],
  'ㄽ': ['ㄹ', 'ㅅ'],
  'ㄾ': ['ㄹ', 'ㅌ'],
  'ㄿ': ['ㄹ', 'ㅍ'],
  'ㅀ': ['ㄹ', 'ㅎ'],
  'ㅄ': ['ㅂ', 'ㅅ'],
};

// Helper functions
const isConsonant = (c: string) => INITIAL_IDX[c] !== undefined;
const isVowel = (c: string) => MEDIAL_IDX[c] !== undefined;
const canBeFinal = (c: string) => FINAL_IDX[c] !== undefined && !DOUBLE_CONSONANTS.has(c);

const isSyllable = (c: string) => {
  const code = c.charCodeAt(0);
  return code >= 0xAC00 && code <= 0xD7A3;
};

const compose = (initial: string, medial: string, final = ''): string => {
  const i = INITIAL_IDX[initial];
  const m = MEDIAL_IDX[medial];
  const f = final ? FINAL_IDX[final] : 0;
  if (i === undefined || m === undefined) return '';
  return String.fromCharCode(0xAC00 + i * 588 + m * 28 + f);
};

const decompose = (char: string): { cho: string; jung: string; jong: string } | null => {
  const code = char.charCodeAt(0);
  if (code < 0xAC00 || code > 0xD7A3) return null;
  const offset = code - 0xAC00;
  return {
    cho: INITIALS[Math.floor(offset / 588)],
    jung: MEDIALS[Math.floor((offset % 588) / 28)],
    jong: FINALS[offset % 28],
  };
};

// State: tracks what we're currently building
type ComposeState = {
  cho?: string;   // initial consonant
  jung?: string;  // vowel
  jong?: string;  // final consonant
};

export function KoreanKeyboard(props: {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
}) {
  const { value, onChange, onClose } = props;
  
  // Use ref to track composition state (doesn't need to trigger rerenders)
  const stateRef = useRef<ComposeState>({});
  const lastValueRef = useRef(value);

  // Reset composition when external value changes
  useEffect(() => {
    if (value !== lastValueRef.current) {
      stateRef.current = {};
      lastValueRef.current = value;
    }
  }, [value]);

  const processKey = useCallback((char: string) => {
    const state = stateRef.current;
    let text = value;
    let newState: ComposeState = {};

    if (isVowel(char)) {
      // VOWEL pressed
      if (!state.cho && !state.jung) {
        // Nothing in progress - check if last char can provide initial
        if (text.length > 0) {
          const last = text[text.length - 1];
          
          if (isSyllable(last)) {
            // Last char is a complete syllable
            const d = decompose(last)!;
            if (d.jong) {
              // Has final - move final to new syllable
              if (SPLIT_FINAL[d.jong]) {
                // Combined final - split it
                const [keep, move] = SPLIT_FINAL[d.jong];
                text = text.slice(0, -1) + compose(d.cho, d.jung, keep) + compose(move, char);
                newState = { cho: move, jung: char };
              } else {
                // Single final - move it
                text = text.slice(0, -1) + compose(d.cho, d.jung) + compose(d.jong, char);
                newState = { cho: d.jong, jung: char };
              }
            } else {
              // No final - just add vowel separately
              text += char;
              newState = {};
            }
          } else if (isConsonant(last) && !isVowel(last)) {
            // Last char is a standalone consonant - combine with vowel
            text = text.slice(0, -1) + compose(last, char);
            newState = { cho: last, jung: char };
          } else {
            // Just add vowel
            text += char;
            newState = {};
          }
        } else {
          text += char;
          newState = {};
        }
      } else if (state.cho && !state.jung) {
        // Have initial, add vowel
        text = text.slice(0, -1) + compose(state.cho, char);
        newState = { cho: state.cho, jung: char };
      } else if (state.cho && state.jung && !state.jong) {
        // Have initial+vowel, try to combine vowels
        const combined = VOWEL_COMBOS[state.jung]?.[char];
        if (combined) {
          text = text.slice(0, -1) + compose(state.cho, combined);
          newState = { cho: state.cho, jung: combined };
        } else {
          // Can't combine - commit and start fresh
          text += char;
          newState = {};
        }
      } else if (state.cho && state.jung && state.jong) {
        // Have full syllable with final - move final to new syllable
        if (SPLIT_FINAL[state.jong]) {
          const [keep, move] = SPLIT_FINAL[state.jong];
          text = text.slice(0, -1) + compose(state.cho, state.jung, keep) + compose(move, char);
          newState = { cho: move, jung: char };
        } else {
          text = text.slice(0, -1) + compose(state.cho, state.jung) + compose(state.jong, char);
          newState = { cho: state.jong, jung: char };
        }
      }
    } else if (isConsonant(char)) {
      // CONSONANT pressed
      if (!state.cho) {
        // Nothing in progress - start new
        text += char;
        newState = { cho: char };
      } else if (state.cho && !state.jung) {
        // Have initial only - replace/add new consonant
        text = text.slice(0, -1) + char;
        newState = { cho: char };
      } else if (state.cho && state.jung && !state.jong) {
        // Have initial+vowel - try to add as final
        if (canBeFinal(char)) {
          text = text.slice(0, -1) + compose(state.cho, state.jung, char);
          newState = { cho: state.cho, jung: state.jung, jong: char };
        } else {
          // Can't be final (double consonant) - start new
          text += char;
          newState = { cho: char };
        }
      } else if (state.cho && state.jung && state.jong) {
        // Have full syllable - try to combine finals or start new
        const combined = FINAL_COMBOS[state.jong]?.[char];
        if (combined && canBeFinal(combined)) {
          text = text.slice(0, -1) + compose(state.cho, state.jung, combined);
          newState = { cho: state.cho, jung: state.jung, jong: combined };
        } else {
          // Can't combine - commit and start new
          text += char;
          newState = { cho: char };
        }
      }
    }

    stateRef.current = newState;
    lastValueRef.current = text;
    onChange(text);
  }, [value, onChange]);

  const handleBackspace = useCallback(() => {
    const state = stateRef.current;
    let text = value;
    let newState: ComposeState = {};

    if (state.jong) {
      // Remove final
      if (SPLIT_FINAL[state.jong]) {
        // Combined final - remove last part
        const [keep] = SPLIT_FINAL[state.jong];
        text = text.slice(0, -1) + compose(state.cho!, state.jung!, keep);
        newState = { cho: state.cho, jung: state.jung, jong: keep };
      } else {
        text = text.slice(0, -1) + compose(state.cho!, state.jung!);
        newState = { cho: state.cho, jung: state.jung };
      }
    } else if (state.jung) {
      // Remove vowel - check if combined
      const baseVowel = Object.entries(VOWEL_COMBOS).find(([, combos]) =>
        Object.values(combos).includes(state.jung!)
      );
      if (baseVowel) {
        const [base] = baseVowel;
        text = text.slice(0, -1) + compose(state.cho!, base);
        newState = { cho: state.cho, jung: base };
      } else {
        text = text.slice(0, -1) + state.cho!;
        newState = { cho: state.cho };
      }
    } else if (state.cho) {
      // Remove initial
      text = text.slice(0, -1);
      newState = {};
    } else if (text.length > 0) {
      // No composition - decompose last char if syllable
      const last = text[text.length - 1];
      if (isSyllable(last)) {
        const d = decompose(last)!;
        if (d.jong) {
          text = text.slice(0, -1) + compose(d.cho, d.jung);
          newState = { cho: d.cho, jung: d.jung };
        } else {
          text = text.slice(0, -1) + d.cho;
          newState = { cho: d.cho };
        }
      } else {
        text = text.slice(0, -1);
        newState = {};
      }
    }

    stateRef.current = newState;
    lastValueRef.current = text;
    onChange(text);
  }, [value, onChange]);

  const handleSpace = useCallback(() => {
    stateRef.current = {};
    const text = value + ' ';
    lastValueRef.current = text;
    onChange(text);
  }, [value, onChange]);

  // Keyboard layout
  const rows = [
    { consonants: ['ㅂ', 'ㅈ', 'ㄷ', 'ㄱ', 'ㅅ'], vowels: ['ㅛ', 'ㅕ', 'ㅑ', 'ㅐ', 'ㅔ'] },
    { consonants: ['ㅁ', 'ㄴ', 'ㅇ', 'ㄹ', 'ㅎ'], vowels: ['ㅗ', 'ㅓ', 'ㅏ', 'ㅣ', 'ㅡ'] },
    { consonants: ['ㅋ', 'ㅌ', 'ㅊ', 'ㅍ'], vowels: ['ㅠ', 'ㅜ', 'ㅒ', 'ㅖ'] },
  ];
  const doubles = ['ㅃ', 'ㅉ', 'ㄸ', 'ㄲ', 'ㅆ'];

  return (
    <div className='fixed bottom-0 left-0 right-0 z-50 border-t bg-background shadow-lg safe-area-inset-bottom'>
      <div className='mx-auto max-w-2xl px-1.5 sm:px-3 py-2 sm:py-3 space-y-1.5 sm:space-y-2'>
        <div className='flex items-center justify-between px-1'>
          <span className='text-xs sm:text-sm text-muted-foreground'>한글</span>
          <Button variant='ghost' size='sm' onClick={onClose} className='h-7 px-2 text-xs sm:text-sm'>✕</Button>
        </div>

        <div className='space-y-0.5 sm:space-y-1'>
          {rows.map((row, i) => (
            <div key={i} className='flex gap-0.5 sm:gap-1 justify-center'>
              {row.consonants.map((k) => (
                <KeyBtn key={k} char={k} onClick={() => processKey(k)} />
              ))}
              <div className='w-0.5 sm:w-1' />
              {row.vowels.map((k) => (
                <KeyBtn key={k} char={k} onClick={() => processKey(k)} type='vowel' />
              ))}
            </div>
          ))}
          <div className='flex gap-0.5 sm:gap-1 justify-center'>
            {doubles.map((k) => (
              <KeyBtn key={k} char={k} onClick={() => processKey(k)} type='double' />
            ))}
          </div>
        </div>

        <div className='flex gap-1.5 sm:gap-2 justify-center px-1'>
          <Button variant='outline' className='h-9 sm:h-10 px-3 sm:px-6 text-xs sm:text-sm' onClick={handleBackspace}>
            ← <span className='hidden sm:inline'>Back</span>
          </Button>
          <Button variant='outline' className='h-9 sm:h-10 flex-1 max-w-xs text-xs sm:text-sm' onClick={handleSpace}>
            Space
          </Button>
        </div>
      </div>
    </div>
  );
}

function KeyBtn(props: { char: string; onClick: () => void; type?: 'consonant' | 'vowel' | 'double' }) {
  const { char, onClick, type = 'consonant' } = props;
  const styles = {
    consonant: 'bg-card hover:bg-accent active:bg-accent',
    vowel: 'bg-primary/10 hover:bg-primary/20 active:bg-primary/20 text-primary',
    double: 'bg-orange-100 hover:bg-orange-200 active:bg-orange-200 dark:bg-orange-900/30 dark:hover:bg-orange-900/50 dark:active:bg-orange-900/50 text-orange-700 dark:text-orange-300',
  };
  return (
    <button
      type='button'
      onClick={onClick}
      className={`w-8 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-md sm:rounded-lg border text-base sm:text-lg font-medium transition-colors ${styles[type]}`}
    >
      {char}
    </button>
  );
}
