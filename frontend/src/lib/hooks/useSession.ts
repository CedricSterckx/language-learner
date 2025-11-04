import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api';
import { storage } from '../storage';
import { useAuth } from '@/contexts/AuthContext';
import type { SessionStateV1 } from '@language-learner/shared';

export function useSession(unitId: string) {
  const queryClient = useQueryClient();
  const { isGuestMode } = useAuth();

  const query = useQuery({
    queryKey: ['session', unitId],
    queryFn: async () => {
      if (isGuestMode) {
        // Guest mode: use localStorage
        return storage.getSession(unitId);
      }
      // Authenticated: use API
      const { session } = await apiClient.getSession(unitId);
      return session;
    },
    enabled: Boolean(unitId),
  });

  const saveMutation = useMutation({
    mutationFn: async (session: SessionStateV1) => {
      if (isGuestMode) {
        // Guest mode: save to localStorage
        storage.setSession(unitId, session);
        return;
      }
      // Authenticated: save to API
      await apiClient.saveSession(unitId, { session });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['session', unitId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (isGuestMode) {
        // Guest mode: delete from localStorage
        storage.deleteSession(unitId);
        return;
      }
      // Authenticated: delete via API
      await apiClient.deleteSession(unitId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['session', unitId] });
    },
  });

  return {
    session: query.data,
    isLoading: query.isLoading,
    saveSession: saveMutation.mutate,
    deleteSession: deleteMutation.mutate,
  };
}
