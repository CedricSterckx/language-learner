import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { HangulChartModal } from '@/components/HangulChartModal';
import { createFileRoute, Link } from '@tanstack/react-router';
import { getStorageProvider, type SessionStateV1 } from '@/lib/persistence';
import { loadUnit } from '@/lib/vocabulary';
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

type Quality = 'again' | 'hard' | 'good' | 'easy';

type Settings = {
  promptSide: 'korean' | 'english';
  typingMode: boolean;
  largeListText: boolean;
};

const DEFAULT_SETTINGS: Settings = {
  promptSide: 'korean',
  typingMode: false,
  largeListText: false,
};

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
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showReverse, setShowReverse] = useState(false);
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
  const [reviewRevealed, setReviewRevealed] = useState(false);
  // queue-based drill state
  const [sessionQueue, setSessionQueue] = useState<string[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  // track cards marked Easy to tint list items
  const [easySet, setEasySet] = useState<Set<string>>(() => loadEasySet(unit));

  const storage = useMemo(() => getStorageProvider(), []);
  const [resumeCandidate, setResumeCandidate] = useState<SessionStateV1 | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        const raw = await loadUnit(unit);
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
      setResumeCandidate(normalized); // Will be null if no meaningful session to resume
    })();
    return () => {
      cancelled = true;
    };
  }, [unit, loading, cards, storage]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // Reload easySet on unit change
  useEffect(() => {
    setEasySet(loadEasySet(unit));
  }, [unit]);

  // Persist easySet (debounced)
  useEffect(() => {
    const timer = window.setTimeout(() => saveEasySet(unit, easySet), 300);
    return () => window.clearTimeout(timer);
  }, [unit, easySet]);

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
      typedAnswer,
      answerFeedback,
      reviewOrderIds,
      reviewIndex,
      reviewInput,
      reviewFeedback,
      showKoreanHint,
      reviewRevealed,
      queueIds: sessionQueue,
      queueIndex,
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
    typedAnswer,
    answerFeedback,
    reviewOrder,
    reviewIndex,
    reviewInput,
    reviewFeedback,
    showKoreanHint,
    reviewRevealed,
    cards,
    storage,
    sessionQueue,
    queueIndex,
  ]);

  const gradeHints = useMemo(() => {
    return {
      again: 'add back: +2',
      hard: 'add back: +5',
      good: 'add back: end',
      easy: 'remove',
    } as const;
  }, []);

  const totalCount = cards.length;

  useEffect(() => {
    if (studyMode === 'list') {
      setCurrentId(null);
    }
  }, [studyMode]);

  function handleGrade(quality: Quality) {
    return handleGradeQueue(quality);
  }

  function startCards() {
    setStudyMode('cards');
    const shuffled = shuffleArray(cards.map((c) => c.id));
    setSessionQueue(shuffled);
    setQueueIndex(0);
    setCurrentId(shuffled[0] ?? null);
    setShowAnswer(false);
    setShowReverse(false);
    setTypedAnswer('');
    setAnswerFeedback(null);
  }

  function handleGradeQueue(quality: Quality) {
    if (!currentId) return;
    const q = sessionQueue.slice();
    const idx = Math.min(queueIndex, Math.max(0, q.length - 1));
    let removeAt = idx < q.length && q[idx] === currentId ? idx : q.indexOf(currentId);
    if (removeAt >= 0) q.splice(removeAt, 1);

    const insertAhead = (n: number) => Math.min((removeAt >= 0 ? removeAt : idx) + n, q.length);
    switch (quality) {
      case 'again':
        q.splice(insertAhead(2), 0, currentId);
        // remove from easy set if user struggled
        if (easySet.has(currentId)) setEasySet((prev) => new Set([...prev].filter((id) => id !== currentId)));
        break;
      case 'hard':
        q.splice(insertAhead(5), 0, currentId);
        if (easySet.has(currentId)) setEasySet((prev) => new Set([...prev].filter((id) => id !== currentId)));
        break;
      case 'good':
        q.push(currentId);
        if (easySet.has(currentId)) setEasySet((prev) => new Set([...prev].filter((id) => id !== currentId)));
        break;
      case 'easy':
        // drop from queue
        setEasySet((prev) => new Set(prev).add(currentId));
        break;
    }

    if (q.length === 0) {
      setSessionQueue([]);
      setQueueIndex(0);
      setCurrentId(null);
      setStudyMode('list');
      setShowAnswer(false);
      setShowReverse(false);
      setTypedAnswer('');
      setAnswerFeedback(null);
      return;
    }

    const nextIdx = Math.min(removeAt, q.length - 1);
    setSessionQueue(q);
    setQueueIndex(Math.max(0, nextIdx));
    setCurrentId(q[Math.max(0, nextIdx)]);
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
    // Clear queue and UI state
    setSessionQueue([]);
    setQueueIndex(0);
    setCurrentId(null);
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
    // no allowFuture in queue-only mode
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
    setReviewRevealed(Boolean(s.reviewRevealed));
    // Restore queue state
    const filteredQueue = (s.queueIds ?? []).filter((id) => idToCard.has(id));
    setSessionQueue(filteredQueue);
    setQueueIndex(Math.min(Math.max(0, s.queueIndex ?? 0), Math.max(0, filteredQueue.length - 1)));
  }

  function normalizeSessionAgainstCards(s: SessionStateV1, available: VocabCard[]): SessionStateV1 | null {
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

    // Normalize queue state
    const filteredQueue = (s.queueIds ?? []).filter((id) => validIds.has(id));
    let queueIndex = Math.min(Math.max(0, s.queueIndex ?? 0), Math.max(0, filteredQueue.length - 1));
    if (filteredQueue.length === 0) {
      // no queue to restore, fallback to list
      studyMode = 'list';
    }

    // If the session has been downgraded to 'list' mode and has no meaningful state, return null
    if (studyMode === 'list' && !currentOk) {
      return null;
    }

    return {
      ...s,
      currentId: currentOk,
      reviewOrderIds: filteredOrder,
      queueIds: filteredQueue,
      queueIndex,
      studyMode,
    };
  }

  async function handleResume() {
    if (!resumeCandidate) return;
    applySessionState(resumeCandidate);
    setResumeCandidate(null);
  }

  async function handleResetSession() {
    await storage.deleteSession(unit);
    setResumeCandidate(null);
    // Clear queue and card session state
    setSessionQueue([]);
    setQueueIndex(0);
    setCurrentId(null);
    setShowAnswer(false);
    setShowReverse(false);
    setTypedAnswer('');
    setAnswerFeedback(null);
    setStudyMode('list');
    // Clear review drill state
    setReviewOrder([]);
    setReviewIndex(0);
    setReviewInput('');
    setReviewFeedback('idle');
    setShowKoreanHint(false);
    setReviewRevealed(false);
    // Clear easy marks for this unit
    const cleared = new Set<string>();
    setEasySet(cleared);
    saveEasySet(unit, cleared);
  }

  function submitReview() {
    const current = reviewOrder[reviewIndex];
    if (!current) return;
    const expected = showKoreanHint ? current.english.trim() : current.korean.trim();
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
        setReviewRevealed(false);
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
    setReviewRevealed(false);
  }

  function skipRevealed() {
    const current = reviewOrder[reviewIndex];
    if (!current) return;
    const newOrder = reviewOrder.slice();
    // remove current at index
    newOrder.splice(reviewIndex, 1);
    // reinsert 5-10 ahead
    const ahead = 5 + Math.floor(Math.random() * 6); // 5..10
    const insertAt = Math.min(reviewIndex + ahead, newOrder.length);
    newOrder.splice(insertAt, 0, current);
    setReviewOrder(newOrder);
    // stay at same index to show next item
    setReviewRevealed(false);
    setReviewFeedback('idle');
    setReviewInput('');
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
        <div className='mx-auto max-w-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-2'>
          <div className='flex items-center gap-4 min-w-0'>
            <Link to='/' className='text-sm text-muted-foreground hover:text-foreground'>
              ← Back to units
            </Link>
            <div className='text-sm text-muted-foreground'>
              {studyMode === 'list' && `Vocabulary List (${totalCount} words)`}
              {studyMode === 'cards' &&
                `Queue: ${Math.min(queueIndex + 1, Math.max(1, sessionQueue.length))} / ${sessionQueue.length}`}
              {studyMode === 'review' &&
                `Review: ${Math.min(reviewIndex + 1, reviewOrder.length)} / ${reviewOrder.length}`}
            </div>
          </div>
          <div className='flex items-center gap-2 flex-wrap ml-auto'>
            <Button variant='outline' size='sm' onClick={() => setShowHangulModal(true)}>
              Korean Alphabet (Hangul)
            </Button>
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
                  <span className='text-sm text-muted-foreground'>
                    Direction: {showKoreanHint ? '한국어 → English' : 'English → 한국어'}
                  </span>
                </div>
                <Button variant='outline' size='sm' onClick={exitReview}>
                  Exit review
                </Button>
              </>
            )}
            {studyMode !== 'list' && (
              <Button variant='outline' size='sm' onClick={handleResetProgress}>
                Reset
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className='flex-1 mx-auto max-w-2xl w-full px-4 py-6 sm:py-8'>
        {showHangulModal && <HangulChartModal onClose={() => setShowHangulModal(false)} />}
        {studyMode === 'list' ? (
          <>
            <VocabularyList
              cards={cards}
              largeText={settings.largeListText}
              onToggleLargeText={toggleLargeListText}
              onStartCards={startCards}
              onStartReview={startReview}
              hasResume={Boolean(resumeCandidate) || easySet.size > 0}
              onResume={resumeCandidate ? handleResume : startCards}
              onReset={handleResetSession}
              easySet={easySet}
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
            revealed={reviewRevealed}
            onReveal={() => setReviewRevealed(true)}
            onSkip={skipRevealed}
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
                <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                  <Button
                    size='lg'
                    variant='destructive'
                    onClick={() => handleGrade('again')}
                    className='relative overflow-hidden group transition-all hover:-translate-y-0.5 hover:shadow-lg h-12 md:h-14 rounded-lg'
                  >
                    <span className='pointer-events-none absolute inset-0 bg-gradient-to-br from-white/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity' />
                    <div className='flex flex-col leading-tight items-center'>
                      <span className='text-lg md:text-xl font-semibold text-white'>Again</span>
                      <span className='text-xs text-white/90'>{gradeHints.again}</span>
                    </div>
                  </Button>
                  <Button
                    size='lg'
                    variant='outline'
                    onClick={() => handleGrade('hard')}
                    className='relative overflow-hidden group transition-all hover:-translate-y-0.5 hover:shadow-lg h-12 md:h-14 rounded-lg'
                  >
                    <span className='pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity' />
                    <div className='flex flex-col leading-tight items-center'>
                      <span className='text-lg md:text-xl font-semibold'>Hard</span>
                      <span className='text-xs text-muted-foreground'>{gradeHints.hard}</span>
                    </div>
                  </Button>
                  <Button
                    size='lg'
                    onClick={() => handleGrade('good')}
                    className='relative overflow-hidden group transition-all hover:-translate-y-0.5 hover:shadow-lg h-12 md:h-14 rounded-lg'
                  >
                    <span className='pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity' />
                    <div className='flex flex-col leading-tight items-center'>
                      <span className='text-lg md:text-xl font-semibold text-white'>Good</span>
                      <span className='text-xs text-white/90'>{gradeHints.good}</span>
                    </div>
                  </Button>
                  <Button
                    size='lg'
                    variant='secondary'
                    onClick={() => handleGrade('easy')}
                    className='relative overflow-hidden group transition-all hover:-translate-y-0.5 hover:shadow-lg h-12 md:h-14 rounded-lg'
                  >
                    <span className='pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity' />
                    <div className='flex flex-col leading-tight items-center'>
                      <span className='text-lg md:text-xl font-semibold'>Easy</span>
                      <span className='text-xs text-muted-foreground'>{gradeHints.easy}</span>
                    </div>
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
              </div>
            ) : (
              <div className='flex gap-3'>
                <Button className='flex-1' onClick={() => setShowAnswer(true)}>
                  Show answer
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className='min-h-[60dvh] grid place-items-center'>
            <div className='text-center space-y-3'>
              <div className='text-xl'>All caught up 🎉</div>

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

function VocabularyList(props: {
  cards: VocabCard[];
  largeText: boolean;
  onToggleLargeText: (checked: boolean) => void;
  onStartCards: () => void;
  onStartReview: () => void;
  hasResume: boolean;
  onResume: () => void;
  onReset: () => void;
  easySet: Set<string>;
}) {
  const { cards, largeText, onToggleLargeText, onStartCards, onStartReview, hasResume, onResume, onReset, easySet } =
    props;

  const total = cards.length;
  const easyCount = easySet.size;
  const percent = total > 0 ? Math.round((easyCount / total) * 100) : 0;

  const cardsWithStatus = cards.map((card) => {
    return {
      ...card,
      isEasy: easySet.has(card.id),
    } as VocabCard & { isEasy: boolean };
  });

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h2 className='text-2xl font-semibold'>Vocabulary</h2>
          <p className='text-muted-foreground'>Browse the words or start a session</p>
        </div>
        <div className='flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap'>
          <div className='flex items-center gap-3 pr-1'>
            <CircularProgress value={percent} label={`${easyCount}/${total}`} size={56} strokeWidth={8} />
          </div>
          <div className='flex items-center gap-2'>
            <Switch checked={largeText} onCheckedChange={onToggleLargeText} />
            <span className='text-sm text-muted-foreground'>Big text</span>
          </div>
          <Button variant='outline' onClick={onStartReview} className='w-full sm:w-auto'>
            Practice Vocabulary
          </Button>
          {hasResume ? (
            <Button onClick={onResume} className='w-full sm:w-auto'>
              Resume Flashcards
            </Button>
          ) : (
            <Button onClick={onStartCards} className='w-full sm:w-auto'>
              Start Flashcards
            </Button>
          )}
          <Button variant='outline' onClick={onReset} className='w-full sm:w-auto'>
            Reset Session
          </Button>
        </div>
      </div>

      <div className='grid gap-3'>
        {cardsWithStatus.map((card) => (
          <div
            key={card.id}
            className={`rounded-lg border p-4 transition-all duration-200 ease-in-out hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/30 hover:bg-accent/50 cursor-pointer ${
              card.isEasy
                ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950'
                : 'border-border bg-card'
            }`}
          >
            <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
              <div className='flex-1'>
                <div className='flex items-center gap-3 sm:gap-4 flex-wrap'>
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
              <div className='flex items-center gap-3 sm:gap-4 text-sm text-muted-foreground' />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CircularProgress(props: { value: number; label: string; size?: number; strokeWidth?: number }) {
  const { value, label, size = 64, strokeWidth = 8 } = props;
  const clamped = Math.max(0, Math.min(100, value));
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const dash = (c * clamped) / 100;
  const offset = c - dash;
  const center = size / 2;

  return (
    <div className='relative' style={{ width: size, height: size }} aria-label={`Progress ${clamped}%`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className='block'>
        <circle
          cx={center}
          cy={center}
          r={r}
          strokeWidth={strokeWidth}
          stroke='currentColor'
          className='text-muted-foreground/30'
          fill='none'
        />
        <circle
          cx={center}
          cy={center}
          r={r}
          strokeWidth={strokeWidth}
          stroke='currentColor'
          className='text-primary'
          fill='none'
          strokeLinecap='round'
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 300ms ease' }}
        />
      </svg>
      <div className='absolute inset-0 grid place-items-center text-sm font-medium text-primary'>{label}</div>
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
  revealed: boolean;
  onReveal: () => void;
  onSkip: () => void;
}) {
  const { items, index, input, feedback, setInput, onSubmit, onExit, showKorean, revealed, onReveal, onSkip } = props;
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
      <div className={`rounded-xl border p-4 md:p-6 text-center relative ${feedbackClasses}`}>
        <Flashcard
          prompt={showKorean ? current.korean : current.english}
          answer={showKorean ? current.english : current.korean}
          revealed={revealed}
          showReverse={!revealed}
          onReveal={onReveal}
          onToggleReverse={onReveal}
          onSpeakKorean={() => speakKorean(current.korean)}
        />
        <div className='mt-3 text-sm text-muted-foreground'>
          {showKorean ? 'Type the English translation' : 'Type the Korean translation'}
        </div>
      </div>

      {!revealed ? (
        <div className='space-y-3'>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && input.trim()) onSubmit();
            }}
            placeholder={showKorean ? 'Type in English…' : '한국어로 입력하세요…'}
            autoFocus
          />
          <div className='flex gap-2 flex-wrap'>
            <Button className='flex-1' onClick={onSubmit} disabled={!input.trim()}>
              Check
            </Button>
            <Button variant='outline' onClick={onReveal}>
              Show Answer
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
      ) : (
        <div className='flex gap-2'>
          <Button className='flex-1' onClick={onSkip}>
            Skip to next
          </Button>
          <Button variant='outline' onClick={onExit}>
            Exit
          </Button>
        </div>
      )}
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
      <div className={`flip-card cursor-pointer h-[14rem] sm:h-[16rem] md:h-[20rem]`} onClick={handleClick}>
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

function loadEasySet(unit: string): Set<string> {
  try {
    const raw = localStorage.getItem(`flashcards:${unit}:easy`);
    const arr = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set(arr);
  } catch {
    return new Set();
  }
}

function saveEasySet(unit: string, set: Set<string>) {
  try {
    localStorage.setItem(`flashcards:${unit}:easy`, JSON.stringify(Array.from(set)));
  } catch {
    // ignore
  }
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
