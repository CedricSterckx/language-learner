import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api';

export function useVocabularyUnits() {
  return useQuery({
    queryKey: ['vocabulary', 'units'],
    queryFn: () => apiClient.getUnits(),
  });
}

export function useVocabularyUnit(unitId: string) {
  return useQuery({
    queryKey: ['vocabulary', 'unit', unitId],
    queryFn: () => apiClient.getUnit(unitId),
    enabled: Boolean(unitId),
  });
}

