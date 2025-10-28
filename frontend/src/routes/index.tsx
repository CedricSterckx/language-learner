import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link, createFileRoute } from '@tanstack/react-router';
import { getUnitsMeta, searchVocabulary, type SearchItem } from '@/lib/vocabulary';
import { useEffect, useMemo, useState } from 'react';

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
    <div className='min-h-dvh grid place-items-center p-6'>
      <div className='text-center space-y-8 max-w-2xl w-full'>
        <div className='space-y-2'>
          <h1 className='text-4xl font-semibold tracking-tight'>Korean Flashcards</h1>
          <p className='text-muted-foreground'>
            Practice your vocabulary with spaced repetition. Select a unit to begin.
          </p>
        </div>

        <div className='text-left space-y-2'>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Search vocabulary (한국어 or English)…'
            aria-label='Search vocabulary'
          />
          {query && (
            <div className='rounded-lg border bg-card text-card-foreground shadow-sm max-h-80 overflow-auto'>
              {searching && <div className='px-3 py-2 text-sm text-muted-foreground'>Searching…</div>}
              {!searching && results.length === 0 && (
                <div className='px-3 py-2 text-sm text-muted-foreground'>No results</div>
              )}
              {!searching && results.length > 0 && (
                <ul className='divide-y'>
                  {results.map((item, idx) => (
                    <li key={`${item.unitId}:${item.korean}:${idx}`} className='hover:bg-accent/50'>
                      <Link
                        to='/flashcards'
                        search={{ unit: item.unitId }}
                        className='flex items-center justify-between gap-3 px-3 py-2'
                      >
                        <div className='text-left'>
                          <div className='text-base font-medium'>{item.korean}</div>
                          <div className='text-sm text-muted-foreground'>{item.english}</div>
                        </div>
                        <div className='shrink-0 text-xs px-2 py-1 rounded border'>
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

        <div className='grid gap-4 md:grid-cols-2'>
          {vocabularyUnits.map((unit) => (
            <Link key={unit.id} to='/flashcards' search={{ unit: unit.id }}>
              <Button
                variant='outline'
                className='w-full h-20 sm:h-24 flex flex-col items-center justify-center space-y-2 hover:shadow-md transition-shadow'
              >
                <div className='text-lg font-medium'>{unit.name}</div>
                <div className='text-sm text-muted-foreground'>{unit.description ?? 'Practice vocabulary'}</div>
              </Button>
            </Link>
          ))}
        </div>

        <div className='text-sm text-muted-foreground'>
          Each unit contains vocabulary cards with Korean-English pairs
        </div>
      </div>
    </div>
  );
}
