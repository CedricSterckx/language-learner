import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api';
import type { MarkEasyRequest, UpdateProgressRequest } from '@language-learner/shared';

export function useProgress(unitId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['progress', unitId],
    queryFn: async () => {
      const data = await apiClient.getProgress(unitId);
      return data;
    },
    enabled: Boolean(unitId),
  });

  const markEasyMutation = useMutation({
    mutationFn: (data: MarkEasyRequest) => apiClient.markEasy(unitId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['progress', unitId] });
    },
  });

  const updateProgressMutation = useMutation({
    mutationFn: (data: UpdateProgressRequest) => apiClient.updateProgress(unitId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['progress', unitId] });
    },
  });

  return {
    progress: query.data?.progress || {},
    easySet: new Set(query.data?.easySet || []),
    isLoading: query.isLoading,
    markEasy: markEasyMutation.mutate,
    updateProgress: updateProgressMutation.mutate,
  };
}

