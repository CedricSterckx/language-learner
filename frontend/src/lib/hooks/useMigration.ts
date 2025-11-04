import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../api';
import type { MigrateLocalStorageRequest, SessionStateV1 } from '@language-learner/shared';

export function useMigration() {
  const mutation = useMutation({
    mutationFn: (data: MigrateLocalStorageRequest) =>
      apiClient.migrateFromLocalStorage(data),
  });

  const collectLocalStorageData = (): MigrateLocalStorageRequest => {
    const sessions: Record<string, SessionStateV1> = {};
    const easySets: Record<string, string[]> = {};

    // Collect session data
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      // Session keys: flashcards:session:voc_1
      if (key.startsWith('flashcards:session:')) {
        const unitName = key.replace('flashcards:session:', '');
        const data = localStorage.getItem(key);
        if (data) {
          try {
            sessions[unitName] = JSON.parse(data);
          } catch {
            // ignore invalid data
          }
        }
      }

      // Easy set keys: flashcards:voc_1:easy
      if (key.includes(':easy')) {
        const match = key.match(/flashcards:([^:]+):easy/);
        if (match) {
          const unitName = match[1];
          const data = localStorage.getItem(key);
          if (data) {
            try {
              easySets[unitName] = JSON.parse(data);
            } catch {
              // ignore invalid data
            }
          }
        }
      }
    }

    // Collect settings
    const settingsData = localStorage.getItem('flashcards:settings');
    const settings = settingsData
      ? JSON.parse(settingsData)
      : { promptSide: 'korean', typingMode: false, largeListText: false };

    return { sessions, settings, easySets };
  };

  return {
    migrate: mutation.mutate,
    isLoading: mutation.isPending,
    isSuccess: mutation.isSuccess,
    error: mutation.error,
    collectLocalStorageData,
  };
}

