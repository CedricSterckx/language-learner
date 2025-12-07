import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link, createFileRoute } from '@tanstack/react-router';
import { getUnitsMeta, searchVocabulary, type SearchItem } from '@/lib/vocabulary';
import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';

export const Route = createFileRoute('/')({
  component: RouteComponent,
});

const vocabularyUnits = getUnitsMeta();

function RouteComponent() {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [results, setResults] = useState<SearchItem[]>([]);
  const [searching, setSearching] = useState(false);

  const unitNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const u of vocabularyUnits) m.set(u.id, u.name);
    return m;
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query.trim()), 250);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    if (!debounced) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    void (async () => {
      try {
        const r = await searchVocabulary(debounced, 50);
        if (!cancelled) setResults(r);
      } finally {
        if (!cancelled) setSearching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  return (
    <div className='min-h-[calc(100dvh-3rem)] grid place-items-center p-4 sm:p-6'>
      <div className='text-center space-y-5 sm:space-y-8 max-w-2xl w-full'>
        <div className='space-y-1.5 sm:space-y-2'>
          <h1 className='text-2xl sm:text-4xl font-semibold tracking-tight'>Korean Flashcards</h1>
          <p className='text-sm sm:text-base text-muted-foreground'>Practice vocabulary with spaced repetition</p>
        </div>

        <div className='text-left space-y-2'>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Search (한국어 or English)…'
            aria-label='Search vocabulary'
            className='h-10 sm:h-11'
          />
          {query && (
            <div className='rounded-lg border bg-card text-card-foreground shadow-sm max-h-60 sm:max-h-80 overflow-auto'>
              {searching && <div className='px-3 py-2 text-sm text-muted-foreground'>Searching…</div>}
              {!searching && results.length === 0 && (
                <div className='px-3 py-2 text-sm text-muted-foreground'>No results</div>
              )}
              {!searching && results.length > 0 && (
                <ul className='divide-y'>
                  {results.map((item, idx) => (
                    <li key={`${item.unitId}:${item.korean}:${idx}`} className='hover:bg-accent/50 active:bg-accent/50'>
                      <Link
                        to='/flashcards'
                        search={{ unit: item.unitId }}
                        className='flex items-center justify-between gap-2 px-3 py-2'
                      >
                        <div className='text-left min-w-0'>
                          <div className='text-sm sm:text-base font-medium truncate'>{item.korean}</div>
                          <div className='text-xs sm:text-sm text-muted-foreground truncate'>{item.english}</div>
                        </div>
                        <div className='shrink-0 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded border'>
                          {unitNameById.get(item.unitId) ?? item.unitId}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className='grid gap-2 sm:gap-4 grid-cols-2'>
          {vocabularyUnits.map((unit) => (
            <Link key={unit.id} to='/flashcards' search={{ unit: unit.id }}>
              <Button
                variant='outline'
                className='w-full h-auto min-h-[80px] sm:min-h-[100px] flex flex-col items-center justify-center space-y-1.5 sm:space-y-3 p-3 sm:p-5 hover:shadow-md active:shadow-md transition-shadow cursor-pointer relative'
              >
                <UnitCompletionCheck unitId={unit.id} />
                <div className='text-sm sm:text-lg font-medium'>{unit.name}</div>
                <div className='text-xs sm:text-sm text-muted-foreground line-clamp-2'>
                  <UnitKeywords unitId={unit.id} />
                </div>
                <UnitWordCount unitId={unit.id} />
              </Button>
            </Link>
          ))}
        </div>

        <div className='text-xs sm:text-sm text-muted-foreground'>Korean-English vocabulary cards</div>
      </div>
    </div>
  );
}

function UnitKeywords({ unitId }: { unitId: string }) {
  const [text, setText] = useState<string>('Loading…');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const items = await (await import('@/lib/vocabulary')).loadUnit(unitId);
        if (cancelled) return;
        const keywords = computeKeywords(items, 3);
        setText(keywords.length > 0 ? keywords.join(' • ') : 'Vocabulary');
      } catch {
        if (!cancelled) setText('Vocabulary');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [unitId]);

  return <span>{text}</span>;
}

function UnitCompletionCheck({ unitId }: { unitId: string }) {
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const items = await (await import('@/lib/vocabulary')).loadUnit(unitId);
        if (cancelled) return;

        // Load progress (easy set)
        try {
          const raw = localStorage.getItem(`flashcards:${unitId}:easy`);
          const easyIds = raw ? (JSON.parse(raw) as string[]) : [];
          const itemIds = new Set(items.map((item) => `${item.korean}|${item.english}`));
          const done = easyIds.filter((id) => itemIds.has(id)).length;
          setIsCompleted(done === items.length && items.length > 0);
        } catch {
          setIsCompleted(false);
        }
      } catch {
        if (!cancelled) setIsCompleted(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [unitId]);

  if (!isCompleted) return null;

  return (
    <CheckCircle2 className='absolute top-1.5 right-1.5 sm:top-3 sm:right-3 w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-500' />
  );
}

function UnitWordCount({ unitId }: { unitId: string }) {
  const [wordCount, setWordCount] = useState<number | null>(null);
  const [doneCount, setDoneCount] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const items = await (await import('@/lib/vocabulary')).loadUnit(unitId);
        if (cancelled) return;
        setWordCount(items.length);

        // Load progress (easy set)
        try {
          const raw = localStorage.getItem(`flashcards:${unitId}:easy`);
          const easyIds = raw ? (JSON.parse(raw) as string[]) : [];
          const itemIds = new Set(items.map((item) => `${item.korean}|${item.english}`));
          const done = easyIds.filter((id) => itemIds.has(id)).length;
          setDoneCount(done);
        } catch {
          setDoneCount(0);
        }
      } catch {
        if (!cancelled) setWordCount(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [unitId]);

  if (wordCount === null) return null;

  return (
    <span className='absolute bottom-1.5 right-1.5 sm:bottom-3 sm:right-3 text-[10px] sm:text-xs text-muted-foreground'>
      {doneCount > 0 && <span className='text-primary font-medium'>{doneCount}/</span>}
      {wordCount}
    </span>
  );
}

function computeKeywords(items: { korean: string; english: string }[], max = 3): string[] {
  const words: string[] = [];
  for (const v of items) {
    const raw = v.english.replace(/[,.;:!?#]/g, ' ').trim();
    const tokens = raw.split(/\s+/).slice(0, 2).join(' ');
    if (tokens && !words.includes(tokens)) words.push(tokens);
    if (words.length >= max) break;
  }
  return words;
}
