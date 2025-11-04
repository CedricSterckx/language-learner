import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api';
import { storage } from '../storage';
import { useAuth } from '@/contexts/AuthContext';
import type { UpdateSettingsRequest, UserSettings } from '@language-learner/shared';

const DEFAULT_SETTINGS: UserSettings = {
  userId: 0,
  promptSide: 'korean',
  typingMode: false,
  largeListText: false,
};

export function useSettings() {
  const queryClient = useQueryClient();
  const { isGuestMode } = useAuth();

  const query = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      if (isGuestMode) {
        // Guest mode: use localStorage
        return storage.getSettings() || DEFAULT_SETTINGS;
      }
      // Authenticated: use API
      const { settings } = await apiClient.getSettings();
      return settings;
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: UpdateSettingsRequest) => {
      if (isGuestMode) {
        // Guest mode: save to localStorage
        const current = storage.getSettings() || DEFAULT_SETTINGS;
        const updated = { ...current, ...data };
        storage.setSettings(updated);
        return;
      }
      // Authenticated: save to API
      await apiClient.updateSettings(data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });

  return {
    settings: query.data || DEFAULT_SETTINGS,
    isLoading: query.isLoading,
    updateSettings: mutation.mutate,
  };
}
