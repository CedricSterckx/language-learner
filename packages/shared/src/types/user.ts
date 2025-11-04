export interface User {
  id: number;
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string;
  createdAt: number;
}

export interface GoogleProfile {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}

export interface UserSettings {
  userId: number;
  promptSide: 'korean' | 'english';
  typingMode: boolean;
  largeListText: boolean;
}

export interface UserProgress {
  userId: number;
  vocabItemId: number;
  ease: number;
  intervalMs: number;
  repetitions: number;
  dueAtMs: number;
  lapses: number;
  isEasy: boolean;
  updatedAt: number;
}

