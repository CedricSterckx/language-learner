export type StudyMode = 'list' | 'cards' | 'review';

export type AnswerFeedback = 'correct' | 'incorrect' | null;
export type ReviewFeedback = 'idle' | 'correct' | 'incorrect';

export interface SessionStateV1 {
  schemaVersion: 1;
  unit: string;
  studyMode: StudyMode;
  currentId: string | null;
  showAnswer: boolean;
  showReverse: boolean;
  typedAnswer: string;
  answerFeedback: AnswerFeedback;
  reviewOrderIds: string[];
  reviewIndex: number;
  reviewInput: string;
  reviewFeedback: ReviewFeedback;
  showKoreanHint: boolean;
  reviewRevealed?: boolean;
  // Queue-based drill mode
  queueIds?: string[];
  queueIndex?: number;
  updatedAt: number;
}

export interface StorageProvider {
  getSession(unit: string): Promise<SessionStateV1 | null>;
  saveSession(unit: string, s: SessionStateV1): Promise<void>;
  deleteSession(unit: string): Promise<void>;
}

export interface ProgressMap {
  [cardId: string]: import('./scheduler').ProgressRecord;
}

const SESSION_KEY = (unit: string) => `flashcards:session:${unit}`;

export class LocalStorageProvider implements StorageProvider {
  async getSession(unit: string): Promise<SessionStateV1 | null> {
    try {
      const raw = localStorage.getItem(SESSION_KEY(unit));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<SessionStateV1>;
      if (!parsed || typeof parsed !== 'object') return null;
      // minimal validation and defaulting
      if (parsed.schemaVersion !== 1) return null;
      return {
        schemaVersion: 1,
        unit: String(parsed.unit ?? unit),
        studyMode: (parsed.studyMode as StudyMode) ?? 'list',
        currentId: (parsed.currentId as string | null) ?? null,
        showAnswer: Boolean(parsed.showAnswer),
        showReverse: Boolean(parsed.showReverse),
        typedAnswer: String(parsed.typedAnswer ?? ''),
        answerFeedback: (parsed.answerFeedback as AnswerFeedback) ?? null,
        reviewOrderIds: Array.isArray(parsed.reviewOrderIds) ? (parsed.reviewOrderIds as string[]) : [],
        reviewIndex: Number.isFinite(parsed.reviewIndex) ? Number(parsed.reviewIndex) : 0,
        reviewInput: String(parsed.reviewInput ?? ''),
        reviewFeedback: (parsed.reviewFeedback as ReviewFeedback) ?? 'idle',
        showKoreanHint: Boolean(parsed.showKoreanHint),
        reviewRevealed: Boolean((parsed as any).reviewRevealed),
        queueIds: Array.isArray(parsed.queueIds) ? (parsed.queueIds as string[]) : [],
        queueIndex: Number.isFinite(parsed.queueIndex) ? Number(parsed.queueIndex) : 0,
        updatedAt: Number.isFinite(parsed.updatedAt) ? Number(parsed.updatedAt) : Date.now(),
      };
    } catch {
      return null;
    }
  }

  async saveSession(unit: string, s: SessionStateV1): Promise<void> {
    try {
      localStorage.setItem(SESSION_KEY(unit), JSON.stringify(s));
    } catch {
      // ignore quota errors
    }
  }

  async deleteSession(unit: string): Promise<void> {
    try {
      localStorage.removeItem(SESSION_KEY(unit));
    } catch {
      // ignore
    }
  }
}

let providerSingleton: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (!providerSingleton) providerSingleton = new LocalStorageProvider();
  return providerSingleton;
}

const PROGRESS_KEY = (unit: string) => `flashcards:progress:${unit}`;

export async function loadProgress(unit: string): Promise<ProgressMap> {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY(unit));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ProgressMap;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed;
  } catch {
    return {};
  }
}

export async function saveProgress(unit: string, data: ProgressMap): Promise<void> {
  try {
    localStorage.setItem(PROGRESS_KEY(unit), JSON.stringify(data));
  } catch {
    // ignore quota errors
  }
}
