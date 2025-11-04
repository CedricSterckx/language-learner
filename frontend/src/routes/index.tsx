import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { HangulChartModal } from '@/components/HangulChartModal';
import { GoogleLoginButton } from '@/components/GoogleLoginButton';
import { MigrationPrompt } from '@/components/MigrationPrompt';
import { Link, createFileRoute } from '@tanstack/react-router';
import { searchVocabulary, type SearchItem, type UnitMeta } from '@/lib/vocabulary';
import { useVocabularyUnits } from '@/lib/hooks/useVocabulary';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useMemo, useState } from 'react';

export const Route = createFileRoute('/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  
  // Show login screen if not authenticated
  if (isLoading) {
    return (
      <div className="min-h-dvh grid place-items-center">
        <div className="text-lg animate-fade-in">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-dvh grid place-items-center p-6">
        <div className="text-center space-y-8 max-w-md w-full">
          <div className="space-y-4">
            <h1 className="text-4xl font-semibold tracking-tight">Korean Flashcards</h1>
            <p className="text-muted-foreground">
              Sign in with your Google account to start learning and sync your progress across devices.
            </p>
          </div>
          <GoogleLoginButton />
        </div>
      </div>
    );
  }

  return (
    <>
      <MigrationPrompt />
      <AuthenticatedHome user={user!} onLogout={logout} />
    </>
  );
}

function AuthenticatedHome({ user, onLogout }: { user: { name: string; email: string }; onLogout: () => void }) {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [results, setResults] = useState<SearchItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [showHangulModal, setShowHangulModal] = useState(false);

  // Fetch vocabulary units from API
  const { data: unitsData, isLoading: unitsLoading } = useVocabularyUnits();
  const vocabularyUnits: UnitMeta[] = useMemo(() => {
    if (!unitsData) return [];
    return unitsData.units.map(unit => ({
      id: unit.id.toString(),
      name: unit.name,
      description: unit.description,
    }));
  }, [unitsData]);

  const unitNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const u of vocabularyUnits) m.set(u.id, u.name);
    return m;
  }, [vocabularyUnits]);

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

  if (unitsLoading) {
    return (
      <div className='min-h-dvh grid place-items-center'>
        <div className='text-lg animate-fade-in'>Loading units...</div>
      </div>
    );
  }

  return (
    <div className='min-h-dvh grid place-items-center p-6'>
      <div className='text-center space-y-8 max-w-2xl w-full'>
        <div className='space-y-4'>
          <div className='space-y-2'>
            <h1 className='text-4xl font-semibold tracking-tight'>Korean Flashcards</h1>
            <p className='text-muted-foreground'>
              Welcome, {user.name}! Practice your vocabulary with spaced repetition.
            </p>
          </div>
          <div className='flex justify-center gap-2 flex-wrap'>
            <Button variant='outline' size='sm' onClick={() => setShowHangulModal(true)}>
              📚 Korean Alphabet (Hangul)
            </Button>
            <Button variant='outline' size='sm' onClick={onLogout}>
              Sign Out
            </Button>
          </div>
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
                className='w-full h-20 sm:h-24 flex flex-col items-center justify-center space-y-2 hover:shadow-md transition-shadow cursor-pointer'
              >
                <div className='text-lg font-medium'>{unit.name}</div>
                <div className='text-sm text-muted-foreground'>
                  <UnitKeywords unitId={unit.id} />
                </div>
              </Button>
            </Link>
          ))}
        </div>

        <div className='text-sm text-muted-foreground'>
          Each unit contains vocabulary cards with Korean-English pairs
        </div>
      </div>
      {showHangulModal && <HangulChartModal onClose={() => setShowHangulModal(false)} />}
    </div>
  );
}

function UnitKeywords({ unitId }: { unitId: string }) {
  const [text, setText] = useState<string>('Loading…');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { apiClient } = await import('@/lib/api');
        const { items } = await apiClient.getUnit(unitId);
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

function computeKeywords(items: { korean: string; english: string }[], max = 3): string[] {
  const words: string[] = [];
  for (const v of items) {
    // pull first 1-2 tokens from english, trimmed
    const raw = v.english.replace(/[,.;:!?#]/g, ' ').trim();
    const tokens = raw.split(/\s+/).slice(0, 2).join(' ');
    if (tokens && !words.includes(tokens)) words.push(tokens);
    if (words.length >= max) break;
  }
  return words;
}
