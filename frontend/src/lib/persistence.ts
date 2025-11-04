/**
 * @deprecated This file is kept for backwards compatibility and type definitions only.
 * The app now uses API-based storage via hooks (useSession, useSettings, useProgress).
 * Types are now defined in @language-learner/shared package.
 * 
 * All localStorage data (except theme) is automatically cleaned up on app load.
 * See: src/lib/cleanup-storage.ts
 */

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

const SESSION_KEY = (unit: string) => `flashcards:session:${unit}`;

/**
 * @deprecated Use API hooks instead (useSession)
 */
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

/**
 * @deprecated Use API hooks instead (useSession, useSettings, useProgress)
 * This is kept only for backwards compatibility during migration.
 */
export function getStorageProvider(): StorageProvider {
  if (!providerSingleton) providerSingleton = new LocalStorageProvider();
  return providerSingleton;
}
