import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api';
import type { SessionStateV1 } from '@language-learner/shared';

export function useSession(unitId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['session', unitId],
    queryFn: async () => {
      const { session } = await apiClient.getSession(unitId);
      return session;
    },
    enabled: Boolean(unitId),
  });

  const saveMutation = useMutation({
    mutationFn: (session: SessionStateV1) =>
      apiClient.saveSession(unitId, { session }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session', unitId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiClient.deleteSession(unitId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session', unitId] });
    },
  });

  return {
    session: query.data,
    isLoading: query.isLoading,
    saveSession: saveMutation.mutate,
    deleteSession: deleteMutation.mutate,
  };
}

