import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api';
import { useAuth } from '@/contexts/AuthContext';
import type { VocabularyUnit, VocabItem } from '@language-learner/shared';

// Guest mode: Load from local JSON files
async function loadLocalVocabulary(): Promise<{ units: VocabularyUnit[] }> {
  // Check which files actually exist by trying to load them
  const units: VocabularyUnit[] = [];
  
  for (let i = 1; i <= 40; i++) {
    try {
      // Try to import the file to check if it exists
      await import(`../../assets/vocabulary/A1/voc_${i}.json`);
      units.push({
        id: `${i}` as any,
        name: `voc_${i}`,
        description: `Unit ${i}`,
        level: 'A1',
        orderIndex: i,
      });
    } catch (error) {
      // File doesn't exist, skip it
      break; // Assume sequential numbering, stop at first missing file
    }
  }
  
  return { units };
}

async function loadLocalUnit(unitId: string): Promise<{ unit: VocabularyUnit; items: VocabItem[] }> {
  const unitNum = parseInt(unitId, 10);
  const unit: VocabularyUnit = {
    id: unitId as any,
    name: `voc_${unitNum}`,
    description: `Unit ${unitNum}`,
    level: 'A1',
    orderIndex: unitNum,
  };

  try {
    // Dynamically import the JSON file
    const module = await import(`../../assets/vocabulary/A1/voc_${unitNum}.json`);
    const items: VocabItem[] = module.default.map((item: any, index: number) => ({
      korean: item.korean,
      english: item.english,
      id: index + 1, // Generate IDs for guest mode
    }));

    return { unit, items };
  } catch (error) {
    console.error(`Failed to load vocabulary unit ${unitId}:`, error);
    throw new Error(`Unit ${unitId} not found`);
  }
}

export function useVocabularyUnits() {
  const { isGuestMode } = useAuth();

  return useQuery({
    queryKey: ['vocabulary', 'units'],
    queryFn: async () => {
      if (isGuestMode) {
        return loadLocalVocabulary();
      }
      return apiClient.getUnits();
    },
  });
}

export function useVocabularyUnit(unitId: string) {
  const { isGuestMode } = useAuth();

  return useQuery({
    queryKey: ['vocabulary', 'unit', unitId],
    queryFn: async () => {
      if (isGuestMode) {
        return loadLocalUnit(unitId);
      }
      return apiClient.getUnit(unitId);
    },
    enabled: Boolean(unitId),
  });
}
