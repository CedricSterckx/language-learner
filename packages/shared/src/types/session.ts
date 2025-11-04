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
  queueIds?: string[];
  queueIndex?: number;
  updatedAt: number;
}

