/**
 * @deprecated This file loads vocabulary from static JSON files.
 * The app now loads vocabulary from the database via API.
 * Use the hooks from @/lib/hooks/useVocabulary instead.
 * 
 * This file is kept only for backwards compatibility and will be removed.
 */

import { apiClient } from './api';

export type VocabItem = { korean: string; english: string };

export type UnitMeta = { id: string; name: string; description?: string };

export type SearchItem = { korean: string; english: string; unitId: string };

/**
 * @deprecated Use useVocabularyUnits() hook instead
 */
export async function getUnitsMeta(): Promise<UnitMeta[]> {
  const { units } = await apiClient.getUnits();
  return units.map(unit => ({
    id: unit.id.toString(),
    name: unit.name,
    description: unit.description,
  }));
}

/**
 * @deprecated Use useVocabularyUnit(unitId) hook instead
 */
export async function loadUnit(unitId: string): Promise<VocabItem[]> {
  const { items } = await apiClient.getUnit(unitId);
  return items;
}

/**
 * Search vocabulary across all units
 * Note: This performs client-side search. For better performance,
 * consider adding a backend search endpoint.
 */
export async function searchVocabulary(query: string, limit = 50): Promise<SearchItem[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  
  // Get all units
  const { units } = await apiClient.getUnits();
  const matches: SearchItem[] = [];
  
  // Search through each unit
  for (const unit of units) {
    if (matches.length >= limit) break;
    
    const { items } = await apiClient.getUnit(unit.id.toString());
    
    for (const item of items) {
      const k = item.korean.toLowerCase();
      const e = item.english.toLowerCase();
      if (k.includes(q) || e.includes(q)) {
        matches.push({ ...item, unitId: unit.id.toString() });
        if (matches.length >= limit) break;
      }
    }
  }
  
  return matches;
}
