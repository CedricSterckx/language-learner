import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { loadUnit, type VocabItem } from '@/lib/vocabulary';
import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';

type Mode = 'easy' | 'medium';
type Feedback = 'idle' | 'correct' | 'incorrect';
type PositionKey = 'left' | 'right' | 'in front of' | 'behind' | 'under' | 'next to';

type PositionCard = {
  korean: string;
  english: string;
  key: PositionKey;
};

const ACCEPT_MAP: Record<PositionKey, string[]> = {
  left: ['left', 'on the left', 'to the left', 'left side'],
  right: ['right', 'on the right', 'to the right', 'right side'],
  'in front of': ['in front of', 'front', 'in front'],
  behind: ['behind', 'in back of', 'at the back'],
  under: ['under', 'below', 'beneath', 'underneath'],
  'next to': ['next to', 'beside', 'by', 'near'],
};

const ACCEPT_KO: Record<PositionKey, string[]> = {
  left: ['왼쪽'],
  right: ['오른쪽'],
  'in front of': ['앞'],
  behind: ['뒤'],
  under: ['아래', '밑'],
  'next to': ['옆'],
};

const POSITION_KEYS = Object.keys(ACCEPT_MAP) as PositionKey[];

function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeKo(str: string): string {
  return str.replace(/\s+/g, '').trim();
}

export const Route = createFileRoute('/positions')({
  component: RouteComponent,
});

function RouteComponent() {
  const [items, setItems] = useState<PositionCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('easy');
  const [current, setCurrent] = useState<PositionCard | null>(null);
  const [answerState, setAnswerState] = useState<Feedback>('idle');
  const [typed, setTyped] = useState('');
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const raw = await loadUnit('voc_3');
        const parsed = extractPositionCards(raw);
        setItems(parsed);
        setCurrent(randomItem(parsed));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load positions');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const options = useMemo(() => {
    const byKey = new Map<PositionKey, PositionCard>();
    for (const item of items) {
      if (!byKey.has(item.key)) byKey.set(item.key, item);
    }
    return POSITION_KEYS.map((k) => byKey.get(k)).filter(Boolean) as PositionCard[];
  }, [items]);

  const canSubmit = mode === 'medium' ? typed.trim().length > 0 : true;

  const handleAnswer = (value: string) => {
    if (!current || answerState !== 'idle') return;
    const normalizedEn = normalize(value);
    const normalizedKo = normalizeKo(value);
    const expectedEn = ACCEPT_MAP[current.key].map(normalize);
    const expectedKo = ACCEPT_KO[current.key].map(normalizeKo);
    const isCorrect = expectedEn.includes(normalizedEn) || expectedKo.includes(normalizedKo);
    setAnswerState(isCorrect ? 'correct' : 'incorrect');
    setCorrectCount((c) => c + (isCorrect ? 1 : 0));
    setWrongCount((c) => c + (isCorrect ? 0 : 1));
  };

  const handleSubmitTyped = () => {
    handleAnswer(typed);
  };

  const nextQuestion = () => {
    setAnswerState('idle');
    setTyped('');
    setShowHelp(false);
    setCurrent(randomItem(items));
  };

  if (loading) {
    return (
      <div className='min-h-[calc(100dvh-3rem)] grid place-items-center'>
        <div className='text-lg text-muted-foreground'>Loading positions…</div>
      </div>
    );
  }

  if (error || !current) {
    return (
      <div className='min-h-[calc(100dvh-3rem)] grid place-items-center p-4 text-center space-y-3'>
        <div className='text-destructive'>{error ?? 'No positions found'}</div>
        <Button onClick={() => location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className='min-h-[calc(100dvh-3rem)] flex flex-col'>
      <main className='flex-1 mx-auto max-w-2xl w-full px-4 py-6 sm:py-8 space-y-6'>
        <header className='space-y-2 text-center'>
          <p className='text-sm text-muted-foreground'>Train positions</p>
          <h1 className='text-2xl sm:text-3xl font-semibold'>Positions Practice</h1>
          <div className='flex items-center justify-center gap-3 text-sm text-muted-foreground'>
            <span>✓ {correctCount}</span>
            <span>|</span>
            <span>✗ {wrongCount}</span>
          </div>
          <div className='flex items-center justify-center gap-2'>
            <Button
              size='sm'
              variant={mode === 'easy' ? 'default' : 'outline'}
              onClick={() => {
                setMode('easy');
                setAnswerState('idle');
                setTyped('');
                setShowHelp(false);
              }}
              className='w-24'
            >
              Easy
            </Button>
            <Button
              size='sm'
              variant={mode === 'medium' ? 'default' : 'outline'}
              onClick={() => {
                setMode('medium');
                setAnswerState('idle');
                setTyped('');
                setShowHelp(false);
              }}
              className='w-24'
            >
              Medium
            </Button>
            <Button
              size='sm'
              variant='ghost'
              onClick={() => {
                setCorrectCount(0);
                setWrongCount(0);
                setAnswerState('idle');
                setTyped('');
                setShowHelp(false);
              }}
              className='w-20'
            >
              Reset
            </Button>
          </div>
        </header>

        <section className='space-y-4'>
          <div className='text-center space-y-1'>
            <p className='text-sm sm:text-base text-muted-foreground'>Where is the orange object?</p>
            <p className='text-xs text-muted-foreground'>Answer relative to the blue object.</p>
          </div>

          <Scene positionKey={current.key} />

          <div className='rounded-lg border p-4 space-y-3 bg-card'>
            <div className='flex items-center justify-between text-sm text-muted-foreground'>
              <div className='flex items-center gap-2'>
                <span>Word</span>
                {mode === 'easy' && (
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => setShowHelp(!showHelp)}
                    className='h-6 px-2 text-xs'
                  >
                    Help
                  </Button>
                )}
              </div>
              {answerState !== 'idle' && (
                <span className={answerState === 'correct' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                  {answerState === 'correct' ? 'Correct!' : 'Try again'}
                </span>
              )}
            </div>
            <div className='flex items-center gap-2'>
              <span className='text-lg font-semibold'>{current.english}</span>
            </div>
            {mode === 'easy' ? (
              <div className='grid grid-cols-2 sm:grid-cols-3 gap-2'>
                {options.map((opt) => (
                  <Button
                    key={opt.key}
                    variant={answerState !== 'idle' && current.key === opt.key ? 'default' : 'outline'}
                    onClick={() => handleAnswer(opt.korean)}
                    disabled={answerState !== 'idle'}
                    className={showHelp ? 'h-auto py-2 flex flex-col items-center justify-center gap-1' : 'h-12 text-base font-semibold'}
                  >
                    <span className={showHelp ? 'text-base font-semibold' : 'text-base font-semibold'}>{opt.korean}</span>
                    {showHelp && (
                      <span className='text-xs text-muted-foreground'>{opt.english}</span>
                    )}
                  </Button>
                ))}
              </div>
            ) : (
              <div className='space-y-2'>
                <Input
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  placeholder='정답을 한국어로 입력하세요 (예: 왼쪽)'
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && canSubmit) handleSubmitTyped();
                  }}
                  disabled={answerState !== 'idle'}
                />
                <div className='flex gap-2'>
                  <Button className='flex-1' onClick={handleSubmitTyped} disabled={!canSubmit || answerState !== 'idle'}>
                    Check
                  </Button>
                  <Button variant='outline' onClick={nextQuestion} disabled={answerState === 'idle'}>
                    Next
                  </Button>
                </div>
              </div>
            )}
            {mode === 'easy' && (
              <div className='flex justify-end'>
                <Button variant='outline' size='sm' onClick={nextQuestion} disabled={answerState === 'idle'}>
                  Next
                </Button>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function Scene({ positionKey }: { positionKey: PositionKey }) {
  const layout = getLayout(positionKey);
  return (
    <div className='rounded-xl border bg-muted/30 p-4'>
      <div className='relative mx-auto h-56 sm:h-64 md:h-72 max-w-[480px] bg-background rounded-lg border'>
        <div className='absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 sm:w-18 sm:h-18 rounded-xl bg-blue-500 shadow-md' aria-label='Reference object' />
        <div
          className='absolute left-1/2 top-1/2 w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-orange-400 shadow-md transition-transform duration-200'
          style={{ transform: `translate(${layout.x}px, ${layout.y}px)` }}
          aria-label='Target object'
        />
      </div>
    </div>
  );
}

function getLayout(key: PositionKey): { x: number; y: number } {
  switch (key) {
    case 'left':
      return { x: -110, y: 0 };
    case 'right':
      return { x: 110, y: 0 };
    case 'in front of':
      return { x: 0, y: -110 };
    case 'behind':
      return { x: 0, y: 110 };
    case 'under':
      return { x: 0, y: 90 };
    case 'next to':
      return { x: 80, y: 0 };
    default:
      return { x: 0, y: 0 };
  }
}

function extractPositionCards(items: VocabItem[]): PositionCard[] {
  const results: PositionCard[] = [];
  for (const item of items) {
    const norm = normalize(item.english);
    const matchedKey = POSITION_KEYS.find((key) => ACCEPT_MAP[key].some((term) => normalize(term) === norm));
    if (matchedKey) {
      results.push({ korean: item.korean, english: item.english, key: matchedKey });
    }
  }

  if (results.length === 0) {
    return [
      { korean: '왼쪽', english: 'left', key: 'left' },
      { korean: '오른쪽', english: 'right', key: 'right' },
      { korean: '앞', english: 'in front of', key: 'in front of' },
      { korean: '뒤', english: 'behind', key: 'behind' },
      { korean: '아래', english: 'under', key: 'under' },
      { korean: '옆', english: 'next to', key: 'next to' },
    ];
  }

  // Deduplicate by key, keep first occurrence from JSON
  const seen = new Set<PositionKey>();
  return results.filter((r) => {
    if (seen.has(r.key)) return false;
    seen.add(r.key);
    return true;
  });
}

function randomItem(arr: PositionCard[]): PositionCard | null {
  if (arr.length === 0) return null;
  const idx = Math.floor(Math.random() * arr.length);
  return arr[idx];
}

