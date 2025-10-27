import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

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

type Quality = "again" | "hard" | "good" | "easy";

type Settings = {
  promptSide: "korean" | "english";
  typingMode: boolean;
};

const DEFAULT_SETTINGS: Settings = { promptSide: "korean", typingMode: false };

export const Route = createFileRoute("/flashcards")({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      unit: (search.unit as string) ?? "voc_1",
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
  const [studyMode, setStudyMode] = useState<"list" | "cards">("list");
  const [typedAnswer, setTypedAnswer] = useState("");
  const [answerFeedback, setAnswerFeedback] = useState<"correct" | "incorrect" | null>(null);

  const STORAGE_KEY_PROGRESS = `flashcards:${unit}:progress`;

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        const response = await fetch(`/src/assets/vocabulary/A1/${unit}.json`);
        if (!response.ok) throw new Error(`Failed to load deck: ${response.status}`);
        const raw: Array<{ korean: string; english: string }> = await response.json();
        const withIds: VocabCard[] = raw.map((r) => ({ ...r, id: `${r.korean}|${r.english}` }));
        setCards(withIds);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    })();
  }, [unit]);

  useEffect(() => {
    setProgress(loadProgress(unit));
  }, [unit]);

  useEffect(() => {
    saveProgress(progress, STORAGE_KEY_PROGRESS);
  }, [progress, STORAGE_KEY_PROGRESS]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const now = Date.now();

  const { nextCard, dueCount, totalCount, nextDueInMs, hasFutureOnly } = useMemo(() => {
    if (cards.length === 0) return { nextCard: undefined, dueCount: 0, totalCount: 0, nextDueInMs: 0, hasFutureOnly: false };
    const enriched = cards.map((c) => ({ card: c, p: progress[c.id] }))
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
    if (nextCard && studyMode === "cards") {
      setCurrentId(nextCard.id);
      setShowAnswer(false);
      setShowReverse(false);
      setTypedAnswer("");
      setAnswerFeedback(null);
    } else if (studyMode === "list") {
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
    setTypedAnswer("");
    setAnswerFeedback(null);
  }

  function handleTypedAnswer() {
    if (!currentId) return;
    const currentCard = cards.find((c) => c.id === currentId);
    if (!currentCard) return;
    
    const correctAnswer = settings.promptSide === "korean" ? currentCard.english : currentCard.korean;
    const normalizedCorrect = correctAnswer.toLowerCase().trim();
    const normalizedUser = typedAnswer.toLowerCase().trim();
    
    if (normalizedUser === normalizedCorrect) {
      setAnswerFeedback("correct");
      setShowAnswer(true);
    } else {
      setAnswerFeedback("incorrect");
      setShowAnswer(true);
    }
  }

  function toggleTypingMode(checked: boolean) {
    setSettings((s) => ({ ...s, typingMode: checked }));
    setTypedAnswer("");
    setAnswerFeedback(null);
    if (!showAnswer) {
      setShowAnswer(false);
    }
  }

  function handleResetProgress() {
    setProgress({});
    setAllowFuture(false);
    setShowAnswer(false);
    setShowReverse(false);
  }

  function togglePromptSide() {
    setSettings((s) => ({ ...s, promptSide: s.promptSide === "korean" ? "english" : "korean" }));
  }

  if (loading) {
    return (
      <div className="min-h-dvh grid place-items-center">
        <div className="text-lg animate-fade-in">Loading deck…</div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-dvh grid place-items-center p-4 text-center">
        <div className="space-y-3">
          <div className="text-destructive">{error}</div>
          <Button onClick={() => location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  const card = cards.find((c) => c.id === currentId);

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto max-w-2xl px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Back to units</Link>
            <div className="text-sm text-muted-foreground">
              {studyMode === "list" ? `Vocabulary List (${totalCount} words)` : `Due: ${dueCount} / ${totalCount}`}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {studyMode === "cards" && hasFutureOnly && (
              <span className="text-xs text-muted-foreground">
                Next in {formatDuration(nextDueInMs)}
              </span>
            )}
            {studyMode === "cards" && (
              <>
                <Button variant="outline" size="sm" onClick={togglePromptSide}>
                  Show: {settings.promptSide === "korean" ? "한국어 → English" : "English → 한국어"}
                </Button>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={settings.typingMode}
                    onCheckedChange={toggleTypingMode}
                  />
                  <span className="text-sm text-muted-foreground">Typing</span>
                </div>
              </>
            )}
            <Button variant="outline" size="sm" onClick={handleResetProgress}>Reset</Button>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto max-w-2xl w-full px-4 py-8">
        {studyMode === "list" ? (
          <VocabularyList 
            cards={cards} 
            progress={progress}
            onStartCards={() => setStudyMode("cards")}
          />
        ) : card ? (
          <div className="space-y-6">
            <Flashcard
              key={currentId}
              prompt={settings.promptSide === "korean" ? card.korean : card.english}
              answer={settings.promptSide === "korean" ? card.english : card.korean}
              revealed={showAnswer}
              showReverse={showReverse}
              onReveal={() => setShowAnswer(true)}
              onToggleReverse={() => setShowReverse(!showReverse)}
            />

            {showAnswer ? (
              <div className="space-y-4">
                {settings.typingMode && (
                  <div className={`p-4 rounded-lg border ${
                    answerFeedback === "correct" 
                      ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800" 
                      : answerFeedback === "incorrect"
                      ? "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800"
                      : "bg-muted"
                  }`}>
                    <div className="text-center text-sm font-medium">
                      {answerFeedback === "correct" && "✓ Correct!"}
                      {answerFeedback === "incorrect" && "✗ Incorrect"}
                      {!answerFeedback && "Show Answer"}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Button variant="destructive" onClick={() => handleGrade("again")}>Again</Button>
                  <Button variant="outline" onClick={() => handleGrade("hard")}>Hard</Button>
                  <Button onClick={() => handleGrade("good")}>Good</Button>
                  <Button variant="secondary" onClick={() => handleGrade("easy")}>Easy</Button>
                </div>
              </div>
            ) : settings.typingMode ? (
              <div className="space-y-3">
                <Input
                  value={typedAnswer}
                  onChange={(e) => setTypedAnswer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && typedAnswer.trim()) {
                      handleTypedAnswer();
                    }
                  }}
                  placeholder="Type your answer..."
                  autoFocus
                />
                <Button 
                  className="w-full" 
                  onClick={handleTypedAnswer}
                  disabled={!typedAnswer.trim()}
                >
                  Check Answer
                </Button>
                {hasFutureOnly && (
                  <Button variant="outline" onClick={() => setAllowFuture(true)}>Study ahead</Button>
                )}
              </div>
            ) : (
              <div className="flex gap-3">
                <Button className="flex-1" onClick={() => setShowAnswer(true)}>Show answer</Button>
                {hasFutureOnly && (
                  <Button variant="outline" onClick={() => setAllowFuture(true)}>Study ahead</Button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="min-h-[60dvh] grid place-items-center">
            <div className="text-center space-y-3">
              <div className="text-xl">All caught up 🎉</div>
              {hasFutureOnly && (
                <div className="text-sm text-muted-foreground">Next card in {formatDuration(nextDueInMs)}</div>
              )}
              {hasFutureOnly && (
                <Button onClick={() => setAllowFuture(true)} variant="outline">Study ahead</Button>
              )}
              <Button onClick={() => setStudyMode("list")} variant="outline">Back to list</Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function VocabularyList(props: { 
  cards: VocabCard[]; 
  progress: ProgressMap;
  onStartCards: () => void;
}) {
  const { cards, progress, onStartCards } = props;
  
  const now = Date.now();
  const cardsWithStatus = cards.map(card => {
    const cardProgress = progress[card.id];
    const isDue = !cardProgress || cardProgress.dueAtMs <= now;
    const nextReview = cardProgress ? formatDuration(Math.max(0, cardProgress.dueAtMs - now)) : "now";
    
    return {
      ...card,
      isDue,
      nextReview,
      repetitions: cardProgress?.repetitions ?? 0,
      lapses: cardProgress?.lapses ?? 0,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Vocabulary Review</h2>
          <p className="text-muted-foreground">Quick overview of all words in this unit</p>
        </div>
        <Button onClick={onStartCards} size="lg">
          Start Flashcards
        </Button>
      </div>

      <div className="grid gap-3">
        {cardsWithStatus.map((card) => (
          <div 
            key={card.id}
            className={`rounded-lg border p-4 transition-colors ${
              card.isDue 
                ? "border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950" 
                : "border-border bg-card"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-4">
                  <div className="text-xl font-medium">{card.korean}</div>
                  <div className="text-muted-foreground">→</div>
                  <div className="text-lg">{card.english}</div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    card.isDue 
                      ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                      : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  }`}>
                    {card.isDue ? "Due" : "Next: " + card.nextReview}
                  </span>
                </div>
                {card.repetitions > 0 && (
                  <div className="flex items-center gap-1">
                    <span>✓{card.repetitions}</span>
                    {card.lapses > 0 && <span className="text-red-500">✗{card.lapses}</span>}
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

function Flashcard(props: { 
  prompt: string; 
  answer: string; 
  revealed: boolean; 
  showReverse: boolean;
  onReveal: () => void;
  onToggleReverse: () => void;
}) {
  const { prompt, answer, revealed, showReverse, onReveal, onToggleReverse } = props;

  const isFlipped = revealed && !showReverse; // front: prompt, back: answer

  const handleClick = () => {
    if (!revealed) {
      onReveal();
      return;
    }
    onToggleReverse();
  };

  return (
    <div className="relative w-full select-none flip-scene">
      <div 
        className={`flip-card cursor-pointer`} 
        onClick={handleClick}
        style={{ height: "16rem" }}
      >
        <div className={`absolute inset-0 rounded-xl border bg-card text-card-foreground shadow-sm p-6 md:p-8 flip-face grid place-items-center`}>
          <div className="text-center space-y-3">
            <div className="text-3xl md:text-4xl font-semibold tracking-tight">{prompt}</div>
            {!revealed && (
              <div className="text-sm text-muted-foreground">Tap card to reveal answer</div>
            )}
            {revealed && showReverse && (
              <div className="text-sm text-muted-foreground">Tap card to flip • Showing prompt</div>
            )}
          </div>
        </div>

        <div className={`absolute inset-0 rounded-xl border bg-card text-card-foreground shadow-sm p-6 md:p-8 flip-face flip-back grid place-items-center`}>
          <div className="text-center space-y-3">
            <div className="text-3xl md:text-4xl font-semibold tracking-tight">{answer}</div>
            {revealed && !showReverse && (
              <div className="text-sm text-muted-foreground">Tap card to flip • Showing answer</div>
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
    case "again": {
      ease = clampEase(ease - 0.2);
      interval = 10_000; // 10s
      repetitions = 0;
      lapses += 1;
      break;
    }
    case "hard": {
      ease = clampEase(ease - 0.15);
      interval = Math.max(60_000, Math.round((interval || 30_000) * 1.2));
      break;
    }
    case "good": {
      if (repetitions === 0) {
        interval = 5 * 60_000; // 5m
      } else {
        interval = Math.round(Math.max(2 * 60_000, (interval || 60_000) * ease));
      }
      repetitions = Math.max(1, repetitions + 1);
      break;
    }
    case "easy": {
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
    const raw = localStorage.getItem("flashcards:settings");
    return raw ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Settings) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(s: Settings) {
  try {
    localStorage.setItem("flashcards:settings", JSON.stringify(s));
  } catch {
    // ignore
  }
}

function formatDuration(ms: number): string {
  if (ms <= 0) return "now";
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.round(min / 60);
  return `${hr}h`;
}


