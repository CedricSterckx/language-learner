import type { User, UserSettings, UserProgress } from './user';
import type { VocabularyUnit, VocabItem } from './vocab';
import type { SessionStateV1 } from './session';

// Auth endpoints
export interface GoogleAuthRequest {
  code: string;
  redirectUri: string;
}

export interface AuthResponse {
  user: User;
}

// Vocabulary endpoints
export interface VocabularyUnitsResponse {
  units: VocabularyUnit[];
}

export interface VocabularyUnitResponse {
  unit: VocabularyUnit;
  items: VocabItem[];
}

// Session endpoints
export interface SessionResponse {
  session: SessionStateV1 | null;
}

export interface SaveSessionRequest {
  session: SessionStateV1;
}

// Settings endpoints
export interface SettingsResponse {
  settings: UserSettings;
}

export interface UpdateSettingsRequest {
  promptSide?: 'korean' | 'english';
  typingMode?: boolean;
  largeListText?: boolean;
}

// Progress endpoints
export interface ProgressResponse {
  progress: Record<string, UserProgress>; // key: vocabItemId
  easySet: string[]; // card IDs
}

export interface MarkEasyRequest {
  cardId: string;
  isEasy: boolean;
}

export interface UpdateProgressRequest {
  cardId: string;
  isEasy: boolean;
}

// Migration endpoint
export interface MigrateLocalStorageRequest {
  sessions: Record<string, SessionStateV1>; // key: unit
  settings: {
    promptSide: 'korean' | 'english';
    typingMode: boolean;
    largeListText: boolean;
  };
  easySets: Record<string, string[]>; // key: unit, value: cardIds
}

export interface MigrateLocalStorageResponse {
  success: boolean;
  migratedSessions: number;
  migratedEasyCards: number;
}

// Error response
export interface ErrorResponse {
  error: string;
  message: string;
}

