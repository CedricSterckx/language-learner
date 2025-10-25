import { Button } from "@/components/ui/button";
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
};

const DEFAULT_SETTINGS: Settings = { promptSide: "korean" };

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

  const STORAGE_KEY_PROGRESS = `flashcards:${unit}:progress`;
  const STORAGE_KEY_SETTINGS = "flashcards:settings";

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
    saveSettings(settings, STORAGE_KEY_SETTINGS);
  }, [settings, STORAGE_KEY_SETTINGS]);

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
    if (nextCard) {
      setCurrentId(nextCard.id);
      setShowAnswer(false);
      setShowReverse(false);
    } else {
      setCurrentId(null);
    }
  }, [nextCard]);

  function handleGrade(quality: Quality) {
    if (!currentId) return;
    const currentCard = cards.find((c) => c.id === currentId);
    if (!currentCard) return;
    const current = progress[currentId] ?? createInitialProgress();
    const updated = schedule(current, quality, Date.now());
    setProgress((prev) => ({ ...prev, [currentId]: updated }));
    setShowAnswer(false);
    setShowReverse(false);
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
            <div className="text-sm text-muted-foreground">Due: <span className="font-medium text-foreground">{dueCount}</span> / {totalCount}</div>
          </div>
          <div className="flex items-center gap-2">
            {hasFutureOnly && (
              <span className="text-xs text-muted-foreground">
                Next in {formatDuration(nextDueInMs)}
              </span>
            )}
            <Button variant="outline" size="sm" onClick={togglePromptSide}>
              Show: {settings.promptSide === "korean" ? "한국어 → English" : "English → 한국어"}
            </Button>
            <Button variant="outline" size="sm" onClick={handleResetProgress}>Reset</Button>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto max-w-2xl w-full px-4 py-8">
        {card ? (
          <div className="space-y-6">
            <Flashcard
              prompt={settings.promptSide === "korean" ? card.korean : card.english}
              answer={settings.promptSide === "korean" ? card.english : card.korean}
              revealed={showAnswer}
              showReverse={showReverse}
              onReveal={() => setShowAnswer(true)}
              onToggleReverse={() => setShowReverse(!showReverse)}
            />

            {showAnswer ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Button variant="destructive" onClick={() => handleGrade("again")}>Again</Button>
                <Button variant="outline" onClick={() => handleGrade("hard")}>Hard</Button>
                <Button onClick={() => handleGrade("good")}>Good</Button>
                <Button variant="secondary" onClick={() => handleGrade("easy")}>Easy</Button>
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
            </div>
          </div>
        )}
      </main>
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
  
  const handleClick = () => {
    if (!revealed) {
      onReveal();
    } else {
      onToggleReverse();
    }
  };

  const displayText = revealed 
    ? (showReverse ? prompt : answer)
    : prompt;

  return (
    <div className="relative w-full select-none">
      <div 
        className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 md:p-8 cursor-pointer hover:shadow-md transition-shadow"
        onClick={handleClick}
      >
        <div className="text-center space-y-4">
          <div className="text-3xl md:text-4xl font-semibold tracking-tight">
            {displayText}
          </div>
          {!revealed && (
            <div className="text-sm text-muted-foreground">Tap card to reveal answer</div>
          )}
          {revealed && (
            <div className="text-sm text-muted-foreground">
              Tap card to flip • {showReverse ? "Showing prompt" : "Showing answer"}
            </div>
          )}
        </div>
      </div>
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


