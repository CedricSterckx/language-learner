import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { createFileRoute, Link } from '@tanstack/react-router';
import { getStorageProvider, type SessionStateV1 } from '@/lib/persistence';
import { useEffect, useMemo, useState } from 'react';

// Native TTS for Korean
function speakKorean(text: string) {
  try {
    const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
    if (!synth) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ko-KR';
    u.rate = 0.75;
    synth.speak(u);
  } catch {
    // ignore if not supported
  }
}

type VocabCard = {
  korean: string;
  english: string;
  id: string;
};

type CardProgress = {
  ease: number;
  intervalMs: number;
  repetitions: number;
  dueAtMs: number;
  lapses: number;
};

type ProgressMap = Record<string, CardProgress>;

type Quality = 'again' | 'hard' | 'good' | 'easy';

type Settings = {
  promptSide: 'korean' | 'english';
  typingMode: boolean;
  largeListText: boolean;
};

const DEFAULT_SETTINGS: Settings = { promptSide: 'korean', typingMode: false, largeListText: false };

export const Route = createFileRoute('/flashcards')({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      unit: (search.unit as string) ?? 'voc_1',
    };
  },
});

function RouteComponent() {
  const { unit } = Route.useSearch();
  const [cards, setCards] = useState<VocabCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressMap>(() => loadProgress(unit));
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showReverse, setShowReverse] = useState(false);
  const [allowFuture, setAllowFuture] = useState(false);
  const [studyMode, setStudyMode] = useState<'list' | 'cards' | 'review'>('list');
  const [typedAnswer, setTypedAnswer] = useState('');
  const [answerFeedback, setAnswerFeedback] = useState<'correct' | 'incorrect' | null>(null);

  // review drill state
  const [reviewOrder, setReviewOrder] = useState<VocabCard[]>([]);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [reviewInput, setReviewInput] = useState('');
  const [reviewFeedback, setReviewFeedback] = useState<'idle' | 'correct' | 'incorrect'>('idle');
  const [showKoreanHint, setShowKoreanHint] = useState(false);
  const [showHangulModal, setShowHangulModal] = useState(false);

  const STORAGE_KEY_PROGRESS = `flashcards:${unit}:progress`;
  const storage = useMemo(() => getStorageProvider(), []);
  const [resumeCandidate, setResumeCandidate] = useState<SessionStateV1 | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        const response = await fetch(`/vocabulary/A1/${unit}.json`);
        if (!response.ok) throw new Error(`Failed to load deck: ${response.status}`);
        const raw: Array<{ korean: string; english: string }> = await response.json();
        const withIds: VocabCard[] = raw.map((r) => ({ ...r, id: `${r.korean}|${r.english}` }));
        setCards(withIds);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    })();
  }, [unit]);

  // Load saved session once cards are available
  useEffect(() => {
    if (loading || cards.length === 0) return;
    let cancelled = false;
    (async () => {
      const saved = await storage.getSession(unit);
      if (cancelled) return;
      if (!saved) {
        setResumeCandidate(null);
        return;
      }
      const normalized = normalizeSessionAgainstCards(saved, cards);
      setResumeCandidate(normalized);
    })();
    return () => {
      cancelled = true;
    };
  }, [unit, loading, cards, storage]);

  useEffect(() => {
    setProgress(loadProgress(unit));
  }, [unit]);

  useEffect(() => {
    saveProgress(progress, STORAGE_KEY_PROGRESS);
  }, [progress, STORAGE_KEY_PROGRESS]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // Autosave session (debounced)
  useEffect(() => {
    if (cards.length === 0) return;
    const reviewOrderIds = reviewOrder.map((c) => c.id);
    const session: SessionStateV1 = {
      schemaVersion: 1,
      unit,
      studyMode,
      currentId,
      showAnswer,
      showReverse,
      allowFuture,
      typedAnswer,
      answerFeedback,
      reviewOrderIds,
      reviewIndex,
      reviewInput,
      reviewFeedback,
      showKoreanHint,
      updatedAt: Date.now(),
    };
    const timer = window.setTimeout(() => {
      void storage.saveSession(unit, session);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [
    unit,
    studyMode,
    currentId,
    showAnswer,
    showReverse,
    allowFuture,
    typedAnswer,
    answerFeedback,
    reviewOrder,
    reviewIndex,
    reviewInput,
    reviewFeedback,
    showKoreanHint,
    cards,
    storage,
  ]);

  const now = Date.now();

  const { nextCard, dueCount, totalCount, nextDueInMs, hasFutureOnly } = useMemo(() => {
    if (cards.length === 0)
      return { nextCard: undefined, dueCount: 0, totalCount: 0, nextDueInMs: 0, hasFutureOnly: false };
    const enriched = cards
      .map((c) => ({ card: c, p: progress[c.id] }))
      .map(({ card, p }) => ({
        card,
        dueAtMs: p?.dueAtMs ?? 0,
      }))
      .sort((a, b) => a.dueAtMs - b.dueAtMs);

    const dueNow = enriched.filter((e) => e.dueAtMs <= now);
    const next = (allowFuture ? enriched : dueNow)[0]?.card;
    const nextDue = enriched[0]?.dueAtMs ?? 0;
    return {
      nextCard: next,
      dueCount: dueNow.length,
      totalCount: cards.length,
      nextDueInMs: Math.max(0, nextDue - now),
      hasFutureOnly: dueNow.length === 0 && enriched.length > 0,
    };
  }, [cards, progress, now, allowFuture]);

  useEffect(() => {
    if (nextCard && studyMode === 'cards') {
      setCurrentId(nextCard.id);
      setShowAnswer(false);
      setShowReverse(false);
      setTypedAnswer('');
      setAnswerFeedback(null);
    } else if (studyMode === 'list') {
      setCurrentId(null);
    }
  }, [nextCard, studyMode]);

  function handleGrade(quality: Quality) {
    if (!currentId) return;
    const currentCard = cards.find((c) => c.id === currentId);
    if (!currentCard) return;
    const current = progress[currentId] ?? createInitialProgress();
    const updated = schedule(current, quality, Date.now());
    setProgress((prev) => ({ ...prev, [currentId]: updated }));
    setShowAnswer(false);
    setShowReverse(false);
    setTypedAnswer('');
    setAnswerFeedback(null);
  }

  function handleTypedAnswer() {
    if (!currentId) return;
    const currentCard = cards.find((c) => c.id === currentId);
    if (!currentCard) return;

    const correctAnswer = settings.promptSide === 'korean' ? currentCard.english : currentCard.korean;
    const normalizedCorrect = correctAnswer.toLowerCase().trim();
    const normalizedUser = typedAnswer.toLowerCase().trim();

    if (normalizedUser === normalizedCorrect) {
      setAnswerFeedback('correct');
      setShowAnswer(true);
    } else {
      setAnswerFeedback('incorrect');
      setShowAnswer(true);
    }
  }

  function toggleTypingMode(checked: boolean) {
    setSettings((s) => ({ ...s, typingMode: checked }));
    setTypedAnswer('');
    setAnswerFeedback(null);
    if (!showAnswer) {
      setShowAnswer(false);
    }
  }

  function toggleLargeListText(checked: boolean) {
    setSettings((s) => ({ ...s, largeListText: checked }));
  }

  function handleResetProgress() {
    setProgress({});
    setAllowFuture(false);
    setShowAnswer(false);
    setShowReverse(false);
  }

  function togglePromptSide() {
    setSettings((s) => ({ ...s, promptSide: s.promptSide === 'korean' ? 'english' : 'korean' }));
  }

  // Simple review drill helpers (English → 한국어)
  function startReview() {
    if (cards.length === 0) return;
    setReviewOrder(shuffleArray(cards));
    setReviewIndex(0);
    setReviewInput('');
    setReviewFeedback('idle');
    setShowKoreanHint(false);
    setStudyMode('review');
  }

  function applySessionState(s: SessionStateV1) {
    // Apply basic mode state first
    setStudyMode(s.studyMode);
    setCurrentId(s.currentId ?? null);
    setShowAnswer(Boolean(s.showAnswer));
    setShowReverse(Boolean(s.showReverse));
    setAllowFuture(Boolean(s.allowFuture));
    setTypedAnswer(s.typedAnswer ?? '');
    setAnswerFeedback(s.answerFeedback ?? null);
    // Rebuild review order from IDs
    const idToCard = new Map(cards.map((c) => [c.id, c] as const));
    const rebuilt = (s.reviewOrderIds ?? []).map((id) => idToCard.get(id)).filter(Boolean) as VocabCard[];
    setReviewOrder(rebuilt);
    setReviewIndex(Math.min(Math.max(0, s.reviewIndex ?? 0), Math.max(0, rebuilt.length - 1)));
    setReviewInput(s.reviewInput ?? '');
    setReviewFeedback(s.reviewFeedback ?? 'idle');
    setShowKoreanHint(Boolean(s.showKoreanHint));
  }

  function normalizeSessionAgainstCards(s: SessionStateV1, available: VocabCard[]): SessionStateV1 {
    const validIds = new Set(available.map((c) => c.id));
    const filteredOrder = (s.reviewOrderIds ?? []).filter((id) => validIds.has(id));
    const currentOk = s.currentId && validIds.has(s.currentId) ? s.currentId : null;
    let studyMode: typeof s.studyMode = s.studyMode;
    if (studyMode === 'cards' && !currentOk) {
      studyMode = 'list';
    }
    if (studyMode === 'review' && filteredOrder.length === 0) {
      studyMode = 'list';
    }
    return {
      ...s,
      currentId: currentOk,
      reviewOrderIds: filteredOrder,
      studyMode,
    };
  }

  async function handleResume() {
    if (!resumeCandidate) return;
    applySessionState(resumeCandidate);
    setResumeCandidate(null);
  }

  async function handleClearSession() {
    await storage.deleteSession(unit);
    setResumeCandidate(null);
  }

  function submitReview() {
    const current = reviewOrder[reviewIndex];
    if (!current) return;
    const expected = current.korean.trim();
    const user = reviewInput.trim();
    if (!user) return;
    if (user === expected) {
      setReviewFeedback('correct');
      // advance to next
      const nextIdx = reviewIndex + 1;
      setTimeout(() => {
        setReviewIndex(nextIdx);
        setReviewInput('');
        setReviewFeedback('idle');
      }, 300);
    } else {
      setReviewFeedback('incorrect');
    }
  }

  function exitReview() {
    setStudyMode('list');
    setReviewOrder([]);
    setReviewIndex(0);
    setReviewInput('');
    setReviewFeedback('idle');
  }

  if (loading) {
    return (
      <div className='min-h-dvh grid place-items-center'>
        <div className='text-lg animate-fade-in'>Loading deck…</div>
      </div>
    );
  }
  if (error) {
    return (
      <div className='min-h-dvh grid place-items-center p-4 text-center'>
        <div className='space-y-3'>
          <div className='text-destructive'>{error}</div>
          <Button onClick={() => location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  const card = cards.find((c) => c.id === currentId);

  return (
    <div className='min-h-dvh flex flex-col'>
      <header className='sticky top-0 z-10 border-b bg-background/80 backdrop-blur'>
        <div className='mx-auto max-w-2xl px-4 py-3 flex items-center justify-between gap-2'>
          <div className='flex items-center gap-4'>
            <Link to='/' className='text-sm text-muted-foreground hover:text-foreground'>
              ← Back to units
            </Link>
            <div className='text-sm text-muted-foreground'>
              {studyMode === 'list' && `Vocabulary List (${totalCount} words)`}
              {studyMode === 'cards' && `Due: ${dueCount} / ${totalCount}`}
              {studyMode === 'review' &&
                `Review: ${Math.min(reviewIndex + 1, reviewOrder.length)} / ${reviewOrder.length}`}
            </div>
          </div>
          <div className='flex items-center gap-2'>
            <Button variant='outline' size='sm' onClick={() => setShowHangulModal(true)}>
              Hangul chart
            </Button>
            {studyMode === 'cards' && hasFutureOnly && (
              <span className='text-xs text-muted-foreground'>Next in {formatDuration(nextDueInMs)}</span>
            )}
            {studyMode === 'cards' && (
              <>
                <Button variant='outline' size='sm' onClick={togglePromptSide}>
                  Show: {settings.promptSide === 'korean' ? '한국어 → English' : 'English → 한국어'}
                </Button>
                <div className='flex items-center gap-2'>
                  <Switch checked={settings.typingMode} onCheckedChange={toggleTypingMode} />
                  <span className='text-sm text-muted-foreground'>Typing</span>
                </div>
              </>
            )}
            {studyMode === 'review' && (
              <>
                <div className='flex items-center gap-2'>
                  <Switch checked={showKoreanHint} onCheckedChange={setShowKoreanHint} />
                  <span className='text-sm text-muted-foreground'>Show Korean</span>
                </div>
                <Button variant='outline' size='sm' onClick={exitReview}>
                  Exit review
                </Button>
              </>
            )}
            <Button variant='outline' size='sm' onClick={handleResetProgress}>
              Reset
            </Button>
          </div>
        </div>
      </header>

      <main className='flex-1 mx-auto max-w-2xl w-full px-4 py-8'>
        {showHangulModal && <HangulChartModal onClose={() => setShowHangulModal(false)} />}
        {studyMode === 'list' ? (
          <>
            {resumeCandidate && (
              <div className='mb-6 rounded-lg border p-4 bg-muted/40 flex items-center justify-between gap-3'>
                <div className='text-sm text-muted-foreground'>
                  You have a previous session. Resume where you left off?
                </div>
                <div className='flex gap-2'>
                  <Button size='sm' onClick={handleResume}>
                    Resume
                  </Button>
                  <Button size='sm' variant='outline' onClick={handleClearSession}>
                    Clear
                  </Button>
                </div>
              </div>
            )}
            <VocabularyList
              cards={cards}
              progress={progress}
              largeText={settings.largeListText}
              onToggleLargeText={toggleLargeListText}
              onStartCards={() => setStudyMode('cards')}
              onStartReview={startReview}
            />
          </>
        ) : studyMode === 'review' ? (
          <ReviewDrill
            items={reviewOrder}
            index={reviewIndex}
            input={reviewInput}
            feedback={reviewFeedback}
            setInput={setReviewInput}
            onSubmit={submitReview}
            onExit={exitReview}
            showKorean={showKoreanHint}
          />
        ) : card ? (
          <div className='space-y-6'>
            <Flashcard
              key={currentId}
              prompt={settings.promptSide === 'korean' ? card.korean : card.english}
              answer={settings.promptSide === 'korean' ? card.english : card.korean}
              revealed={showAnswer}
              showReverse={showReverse}
              onReveal={() => setShowAnswer(true)}
              onToggleReverse={() => setShowReverse(!showReverse)}
              onSpeakKorean={() => speakKorean(card.korean)}
            />

            {showAnswer ? (
              <div className='space-y-4'>
                {settings.typingMode && (
                  <div
                    className={`p-4 rounded-lg border ${
                      answerFeedback === 'correct'
                        ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800'
                        : answerFeedback === 'incorrect'
                          ? 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
                          : 'bg-muted'
                    }`}
                  >
                    <div className='text-center text-sm font-medium'>
                      {answerFeedback === 'correct' && '✓ Correct!'}
                      {answerFeedback === 'incorrect' && (
                        <div className='space-y-2'>
                          <div>✗ Incorrect</div>
                          <div className='text-base font-medium mt-2'>Your answer: {typedAnswer}</div>
                        </div>
                      )}
                      {!answerFeedback && 'Show Answer'}
                    </div>
                  </div>
                )}
                <div className='grid grid-cols-2 md:grid-cols-4 gap-2'>
                  <Button variant='destructive' onClick={() => handleGrade('again')}>
                    Again
                  </Button>
                  <Button variant='outline' onClick={() => handleGrade('hard')}>
                    Hard
                  </Button>
                  <Button onClick={() => handleGrade('good')}>Good</Button>
                  <Button variant='secondary' onClick={() => handleGrade('easy')}>
                    Easy
                  </Button>
                </div>
              </div>
            ) : settings.typingMode ? (
              <div className='space-y-3'>
                <Input
                  value={typedAnswer}
                  onChange={(e) => setTypedAnswer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && typedAnswer.trim()) {
                      handleTypedAnswer();
                    }
                  }}
                  placeholder='Type your answer...'
                  autoFocus
                />
                <Button className='w-full' onClick={handleTypedAnswer} disabled={!typedAnswer.trim()}>
                  Check Answer
                </Button>
                {hasFutureOnly && (
                  <Button variant='outline' onClick={() => setAllowFuture(true)}>
                    Study ahead
                  </Button>
                )}
              </div>
            ) : (
              <div className='flex gap-3'>
                <Button className='flex-1' onClick={() => setShowAnswer(true)}>
                  Show answer
                </Button>
                {hasFutureOnly && (
                  <Button variant='outline' onClick={() => setAllowFuture(true)}>
                    Study ahead
                  </Button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className='min-h-[60dvh] grid place-items-center'>
            <div className='text-center space-y-3'>
              <div className='text-xl'>All caught up 🎉</div>
              {hasFutureOnly && (
                <div className='text-sm text-muted-foreground'>Next card in {formatDuration(nextDueInMs)}</div>
              )}
              {hasFutureOnly && (
                <Button onClick={() => setAllowFuture(true)} variant='outline'>
                  Study ahead
                </Button>
              )}
              <Button onClick={() => setStudyMode('list')} variant='outline'>
                Back to list
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function HangulChartModal(props: { onClose: () => void }) {
  const { onClose } = props;

  // Data derived from the provided chart
  const simpleConsonants: Array<[string, string, string]> = [
    ['ㄱ', 'g / k', 'k'],
    ['ㄴ', 'n', 'n'],
    ['ㄷ', 'd / t', 't'],
    ['ㄹ', 'r / l', 'l'],
    ['ㅁ', 'm', 'm'],
    ['ㅂ', 'b / p', 'p'],
    ['ㅅ', 's / t', 't'],
    ['ㅇ', '- / ng', 'ng'],
    ['ㅈ', 'j / t', 't'],
    ['ㅊ', 'ch / t', 't'],
    ['ㅋ', 'k', 'k'],
    ['ㅌ', 't', 't'],
    ['ㅍ', 'p', 'p'],
    ['ㅎ', 'h / t', 't'],
  ];

  const doubleConsonants: Array<[string, string, string]> = [
    ['ㄲ', 'kk', 'k'],
    ['ㄸ', 'tt', 't'],
    ['ㅃ', 'pp', 'p'],
    ['ㅆ', 'ss', 's'],
    ['ㅉ', 'jj', 'j'],
  ];

  const simpleVowels: Array<[string, string]> = [
    ['ㅏ', 'a'],
    ['ㅑ', 'ya'],
    ['ㅓ', 'eo'],
    ['ㅕ', 'yeo'],
    ['ㅗ', 'o'],
    ['ㅛ', 'yo'],
    ['ㅜ', 'u'],
    ['ㅠ', 'yu'],
    ['ㅡ', 'eu'],
    ['ㅣ', 'i'],
  ];

  const compoundVowels: Array<[string, string]> = [
    ['ㅐ', 'ae'],
    ['ㅒ', 'yae'],
    ['ㅔ', 'e'],
    ['ㅖ', 'ye'],
    ['ㅘ', 'wa'],
    ['ㅙ', 'wae'],
    ['ㅚ', 'oe'],
    ['ㅝ', 'weo'],
    ['ㅞ', 'we'],
    ['ㅟ', 'wi'],
    ['ㅢ', 'ui'],
  ];

  return (
    <div className='fixed inset-0 z-40 px-4 py-6 grid place-items-center' role='dialog' aria-modal='true'>
      <div className='absolute inset-0 bg-black/50' onClick={onClose} />
      <div className='relative z-10 max-w-3xl w-full rounded-xl border bg-background shadow-xl overflow-hidden'>
        <div className='flex items-center justify-between px-4 py-3 border-b'>
          <div className='font-semibold'>Korean alphabet (Hangul)</div>
          <Button size='sm' variant='outline' onClick={onClose}>
            Close
          </Button>
        </div>
        <div className='max-h-[75vh] overflow-auto p-4 space-y-6 text-sm'>
          <section className='space-y-2'>
            <div className='text-sm font-medium'>14 Simple consonants</div>
            <table className='w-full border-separate border-spacing-y-1'>
              <thead>
                <tr className='text-left text-muted-foreground'>
                  <th className='px-2'>Jamo</th>
                  <th className='px-2'>Romanization</th>
                  <th className='px-2'>Final</th>
                </tr>
              </thead>
              <tbody>
                {simpleConsonants.map(([j, r, f]) => (
                  <tr key={j} className='bg-muted/30'>
                    <td className='px-2 py-1 font-medium text-lg'>{j}</td>
                    <td className='px-2 py-1'>{r}</td>
                    <td className='px-2 py-1'>{f}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className='space-y-2'>
            <div className='text-sm font-medium'>5 Double consonants</div>
            <table className='w-full border-separate border-spacing-y-1'>
              <thead>
                <tr className='text-left text-muted-foreground'>
                  <th className='px-2'>Jamo</th>
                  <th className='px-2'>Romanization</th>
                  <th className='px-2'>Final</th>
                </tr>
              </thead>
              <tbody>
                {doubleConsonants.map(([j, r, f]) => (
                  <tr key={j} className='bg-muted/30'>
                    <td className='px-2 py-1 font-medium text-lg'>{j}</td>
                    <td className='px-2 py-1'>{r}</td>
                    <td className='px-2 py-1'>{f}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className='space-y-2'>
            <div className='text-sm font-medium'>10 Simple vowels</div>
            <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2'>
              {simpleVowels.map(([j, r]) => (
                <div key={j} className='rounded-md border bg-card p-2 flex items-center justify-between'>
                  <span className='text-xl font-medium'>{j}</span>
                  <span className='text-muted-foreground'>{r}</span>
                </div>
              ))}
            </div>
          </section>

          <section className='space-y-2'>
            <div className='text-sm font-medium'>11 Compound vowels</div>
            <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2'>
              {compoundVowels.map(([j, r]) => (
                <div key={j} className='rounded-md border bg-card p-2 flex items-center justify-between'>
                  <span className='text-xl font-medium'>{j}</span>
                  <span className='text-muted-foreground'>{r}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function VocabularyList(props: {
  cards: VocabCard[];
  progress: ProgressMap;
  largeText: boolean;
  onToggleLargeText: (checked: boolean) => void;
  onStartCards: () => void;
  onStartReview: () => void;
}) {
  const { cards, progress, largeText, onToggleLargeText, onStartCards, onStartReview } = props;

  const now = Date.now();
  const cardsWithStatus = cards.map((card) => {
    const cardProgress = progress[card.id];
    const isDue = !cardProgress || cardProgress.dueAtMs <= now;
    const nextReview = cardProgress ? formatDuration(Math.max(0, cardProgress.dueAtMs - now)) : 'now';

    return {
      ...card,
      isDue,
      nextReview,
      repetitions: cardProgress?.repetitions ?? 0,
      lapses: cardProgress?.lapses ?? 0,
    };
  });

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-2xl font-semibold'>Vocabulary</h2>
          <p className='text-muted-foreground'>Browse the words or start a session</p>
        </div>
        <div className='flex items-center gap-2'>
          <div className='flex items-center gap-2'>
            <Switch checked={largeText} onCheckedChange={onToggleLargeText} />
            <span className='text-sm text-muted-foreground'>Big text</span>
          </div>
          <Button variant='outline' onClick={onStartReview} size='lg'>
            Review vocabulary list
          </Button>
          <Button onClick={onStartCards} size='lg'>
            Start Flashcards
          </Button>
        </div>
      </div>

      <details className='rounded-lg border bg-muted/30 p-4'>
        <summary className='cursor-pointer font-medium'>How the flashcard scheduling works</summary>
        <div className='mt-3 text-sm text-muted-foreground space-y-2'>
          <p>
            Each card is scheduled using spaced repetition. After you see a card, choose one of the four ratings. Your
            choice sets the next review time:
          </p>
          <ul className='list-disc pl-5 space-y-1'>
            <li>
              <span className='font-medium'>Again</span>: ~10s; ease decreases and repetitions reset.
            </li>
            <li>
              <span className='font-medium'>Hard</span>: about previous interval × 1.2 (at least 1 minute).
            </li>
            <li>
              <span className='font-medium'>Good</span>: first time in 5 minutes; later by ease (min 2 minutes).
            </li>
            <li>
              <span className='font-medium'>Easy</span>: first time in 10 minutes; later interval × ease × 1.3 (min 5
              minutes).
            </li>
          </ul>
          <p>
            Cards marked <span className='font-medium'>Due</span> are ready now. You can "Study ahead" to see future
            cards, and use "Reset" to clear progress.
          </p>
        </div>
      </details>

      <div className='grid gap-3'>
        {cardsWithStatus.map((card) => (
          <div
            key={card.id}
            className={`rounded-lg border p-4 transition-all duration-200 ease-in-out hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/30 hover:bg-accent/50 cursor-pointer ${
              card.isDue
                ? 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950'
                : 'border-border bg-card'
            }`}
          >
            <div className='flex items-center justify-between'>
              <div className='flex-1'>
                <div className='flex items-center gap-4'>
                  <div className='flex items-center gap-2'>
                    <Button
                      variant='ghost'
                      size='icon-sm'
                      onClick={() => speakKorean(card.korean)}
                      aria-label='Speak Korean word'
                      title='Play pronunciation'
                    >
                      <span>🔊</span>
                    </Button>
                    <div className={`${largeText ? 'text-2xl md:text-3xl' : 'text-xl'} font-medium`}>{card.korean}</div>
                  </div>
                  <div className='text-muted-foreground'>→</div>
                  <div className={`${largeText ? 'text-xl md:text-2xl' : 'text-lg'}`}>{card.english}</div>
                </div>
              </div>
              <div className='flex items-center gap-4 text-sm text-muted-foreground'>
                <div className='flex items-center gap-2'>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      card.isDue
                        ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                        : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    }`}
                  >
                    {card.isDue ? 'Due' : 'Next: ' + card.nextReview}
                  </span>
                </div>
                {card.repetitions > 0 && (
                  <div className='flex items-center gap-1'>
                    <span>✓{card.repetitions}</span>
                    {card.lapses > 0 && <span className='text-red-500'>✗{card.lapses}</span>}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewDrill(props: {
  items: VocabCard[];
  index: number;
  input: string;
  feedback: 'idle' | 'correct' | 'incorrect';
  setInput: (v: string) => void;
  onSubmit: () => void;
  onExit: () => void;
  showKorean: boolean;
}) {
  const { items, index, input, feedback, setInput, onSubmit, onExit, showKorean } = props;
  const total = items.length;
  const done = index >= total;
  const current = items[index];

  if (total === 0) {
    return (
      <div className='min-h-[60dvh] grid place-items-center'>
        <div className='text-center space-y-3'>
          <div className='text-muted-foreground'>No words to review.</div>
          <Button variant='outline' onClick={onExit}>
            Back to list
          </Button>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className='min-h-[60dvh] grid place-items-center'>
        <div className='text-center space-y-3'>
          <div className='text-xl'>Review complete 🎉</div>
          <div className='text-sm text-muted-foreground'>You went through all {total} words.</div>
          <Button onClick={onExit} variant='outline'>
            Back to list
          </Button>
        </div>
      </div>
    );
  }

  const feedbackClasses =
    feedback === 'correct'
      ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950'
      : feedback === 'incorrect'
        ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950'
        : 'border-border bg-card';

  return (
    <div className='space-y-6'>
      <div className='text-sm text-muted-foreground'>
        Word {index + 1} of {total}
      </div>
      <div className={`rounded-xl border p-6 md:p-8 text-center relative ${feedbackClasses}`}>
        <button
          type='button'
          onClick={() => speakKorean(current.korean)}
          className='absolute top-4 right-4 text-2xl hover:scale-110 transition-transform'
          aria-label='Speak Korean word'
          title='Play pronunciation'
        >
          🔊
        </button>
        <div className='space-y-2'>
          <div className='text-3xl md:text-4xl font-semibold tracking-tight'>{current.english}</div>
          {showKorean && <div className='text-2xl md:text-3xl font-medium text-muted-foreground'>{current.korean}</div>}
          <div className='text-sm text-muted-foreground'>Type the Korean translation</div>
        </div>
      </div>

      <div className='space-y-3'>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && input.trim()) onSubmit();
          }}
          placeholder='한국어로 입력하세요…'
          autoFocus
        />
        <div className='flex gap-2'>
          <Button className='flex-1' onClick={onSubmit} disabled={!input.trim()}>
            Check
          </Button>
          <Button variant='outline' onClick={onExit}>
            Exit
          </Button>
        </div>
        {feedback === 'incorrect' && (
          <div className='text-sm text-destructive space-y-2'>
            <div>Try again</div>
            <div className='text-base font-medium'>Your answer: {input}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function Flashcard(props: {
  prompt: string;
  answer: string;
  revealed: boolean;
  showReverse: boolean;
  onReveal: () => void;
  onToggleReverse: () => void;
  onSpeakKorean: () => void;
}) {
  const { prompt, answer, revealed, showReverse, onReveal, onToggleReverse, onSpeakKorean } = props;

  const isFlipped = revealed && !showReverse; // front: prompt, back: answer

  const handleClick = () => {
    if (!revealed) {
      onReveal();
      return;
    }
    onToggleReverse();
  };

  return (
    <div className='relative w-full select-none flip-scene'>
      <button
        type='button'
        onClick={(e) => {
          e.stopPropagation();
          onSpeakKorean();
        }}
        className='absolute top-4 right-4 z-20 text-2xl hover:scale-110 transition-transform'
        aria-label='Speak Korean word'
        title='Play pronunciation'
      >
        🔊
      </button>
      <div className={`flip-card cursor-pointer`} onClick={handleClick} style={{ height: '16rem' }}>
        <div
          className={`absolute inset-0 rounded-xl border bg-card text-card-foreground shadow-sm p-6 md:p-8 flip-face grid place-items-center`}
        >
          <div className='text-center space-y-3'>
            <div className='text-3xl md:text-4xl font-semibold tracking-tight'>{prompt}</div>
            {!revealed && <div className='text-sm text-muted-foreground'>Tap card to reveal answer</div>}
            {revealed && showReverse && (
              <div className='text-sm text-muted-foreground'>Tap card to flip • Showing prompt</div>
            )}
          </div>
        </div>

        <div
          className={`absolute inset-0 rounded-xl border bg-card text-card-foreground shadow-sm p-6 md:p-8 flip-face flip-back grid place-items-center`}
        >
          <div className='text-center space-y-3'>
            <div className='text-3xl md:text-4xl font-semibold tracking-tight'>{answer}</div>
            {revealed && !showReverse && (
              <div className='text-sm text-muted-foreground'>Tap card to flip • Showing answer</div>
            )}
          </div>
        </div>
      </div>

      {/* rotation state wrapper to avoid reflow */}
      <style>
        {`.flip-card{position:relative}
          .flip-card${isFlipped ? '' : ''}{transform:${isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'};}
        `}
      </style>
    </div>
  );
}

function createInitialProgress(): CardProgress {
  return {
    ease: 2.5,
    intervalMs: 0,
    repetitions: 0,
    dueAtMs: 0,
    lapses: 0,
  };
}

function schedule(prev: CardProgress, quality: Quality, nowMs: number): CardProgress {
  const easeMin = 1.3;
  const clampEase = (v: number) => Math.max(easeMin, Math.min(3.0, v));

  let ease = prev.ease;
  let interval = prev.intervalMs;
  let repetitions = prev.repetitions;
  let lapses = prev.lapses;

  switch (quality) {
    case 'again': {
      ease = clampEase(ease - 0.2);
      interval = 10_000; // 10s
      repetitions = 0;
      lapses += 1;
      break;
    }
    case 'hard': {
      ease = clampEase(ease - 0.15);
      interval = Math.max(60_000, Math.round((interval || 30_000) * 1.2));
      break;
    }
    case 'good': {
      if (repetitions === 0) {
        interval = 5 * 60_000; // 5m
      } else {
        interval = Math.round(Math.max(2 * 60_000, (interval || 60_000) * ease));
      }
      repetitions = Math.max(1, repetitions + 1);
      break;
    }
    case 'easy': {
      ease = clampEase(ease + 0.05);
      if (repetitions === 0) {
        interval = 10 * 60_000; // 10m
      } else {
        interval = Math.round(Math.max(5 * 60_000, (interval || 60_000) * ease * 1.3));
      }
      repetitions = Math.max(1, repetitions + 1);
      break;
    }
  }

  return {
    ease,
    intervalMs: interval,
    repetitions,
    dueAtMs: nowMs + interval,
    lapses,
  };
}

function loadProgress(unit: string): ProgressMap {
  try {
    const storageKey = `flashcards:${unit}:progress`;
    const raw = localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as ProgressMap) : {};
  } catch {
    return {};
  }
}

function saveProgress(map: ProgressMap, storageKey: string) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(map));
  } catch {
    // ignore
  }
}

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem('flashcards:settings');
    return raw ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Settings) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(s: Settings) {
  try {
    localStorage.setItem('flashcards:settings', JSON.stringify(s));
  } catch {
    // ignore
  }
}

function formatDuration(ms: number): string {
  if (ms <= 0) return 'now';
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.round(min / 60);
  return `${hr}h`;
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a;
}
