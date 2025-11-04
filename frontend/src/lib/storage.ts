/**
 * Storage abstraction layer
 * Handles both localStorage (guest mode) and API (authenticated mode)
 */

import type { SessionStateV1, UserSettings } from '@language-learner/shared';

const STORAGE_PREFIX = 'flashcards:';

export const storage = {
  // Settings
  getSettings(): UserSettings | null {
    const data = localStorage.getItem(`${STORAGE_PREFIX}settings`);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  },

  setSettings(settings: UserSettings): void {
    localStorage.setItem(`${STORAGE_PREFIX}settings`, JSON.stringify(settings));
  },

  // Session state per unit
  getSession(unitId: string): SessionStateV1 | null {
    const data = localStorage.getItem(`${STORAGE_PREFIX}session:${unitId}`);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  },

  setSession(unitId: string, session: SessionStateV1): void {
    localStorage.setItem(`${STORAGE_PREFIX}session:${unitId}`, JSON.stringify(session));
  },

  deleteSession(unitId: string): void {
    localStorage.removeItem(`${STORAGE_PREFIX}session:${unitId}`);
  },

  // Easy set per unit
  getEasySet(unitId: string): Set<string> {
    const data = localStorage.getItem(`${STORAGE_PREFIX}${unitId}:easy`);
    if (!data) return new Set();
    try {
      return new Set(JSON.parse(data));
    } catch {
      return new Set();
    }
  },

  setEasySet(unitId: string, easySet: Set<string>): void {
    localStorage.setItem(`${STORAGE_PREFIX}${unitId}:easy`, JSON.stringify([...easySet]));
  },

  addToEasySet(unitId: string, cardId: string): void {
    const easySet = storage.getEasySet(unitId);
    easySet.add(cardId);
    storage.setEasySet(unitId, easySet);
  },

  removeFromEasySet(unitId: string, cardId: string): void {
    const easySet = storage.getEasySet(unitId);
    easySet.delete(cardId);
    storage.setEasySet(unitId, easySet);
  },

  // Get all localStorage data for migration
  getAllData(): Record<string, string> {
    const data: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX) && key !== `${STORAGE_PREFIX}migrated`) {
        const value = localStorage.getItem(key);
        if (value) data[key] = value;
      }
    }
    return data;
  },

  // Clear all flashcard data (keep theme)
  clearAll(): void {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) {
        keys.push(key);
      }
    }
    
    console.log(`🗑️ Clearing ${keys.length} localStorage keys:`, keys);
    
    keys.forEach(key => {
      localStorage.removeItem(key);
      console.log(`  ✓ Removed: ${key}`);
    });
    
    // Verify cleanup
    const remainingKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) {
        remainingKeys.push(key);
      }
    }
    
    if (remainingKeys.length > 0) {
      console.warn(`⚠️ Some keys were not removed:`, remainingKeys);
    } else {
      console.log('✅ All flashcard data cleared from localStorage');
    }
  },
};

