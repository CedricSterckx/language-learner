import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api';
import { storage } from '../storage';
import { useAuth } from '@/contexts/AuthContext';
import type { MarkEasyRequest } from '@language-learner/shared';

export function useProgress(unitId: string) {
  const queryClient = useQueryClient();
  const { isGuestMode } = useAuth();

  const query = useQuery({
    queryKey: ['progress', unitId],
    queryFn: async () => {
      if (isGuestMode) {
        // Guest mode: use localStorage
        const easySet = storage.getEasySet(unitId);
        return {
          progress: {},
          easySet: [...easySet],
        };
      }
      // Authenticated: use API
      return await apiClient.getProgress(unitId);
    },
    enabled: Boolean(unitId),
  });

  const markEasyMutation = useMutation({
    mutationFn: async (data: MarkEasyRequest) => {
      if (isGuestMode) {
        // Guest mode: save to localStorage
        if (data.isEasy) {
          storage.addToEasySet(unitId, data.cardId);
        } else {
          storage.removeFromEasySet(unitId, data.cardId);
        }
        return;
      }
      // Authenticated: save to API
      await apiClient.markEasy(unitId, data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['progress', unitId] });
    },
  });

  return {
    progress: query.data?.progress || {},
    easySet: new Set(query.data?.easySet || []),
    isLoading: query.isLoading,
    markEasy: markEasyMutation.mutate,
  };
}

