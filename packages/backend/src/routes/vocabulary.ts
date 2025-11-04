import { getDatabase } from '../db/client';
import { jsonError, jsonResponse } from '../auth/middleware';
import type {
  VocabularyUnitsResponse,
  VocabularyUnitResponse,
  VocabularyUnit,
  VocabItem,
} from '@language-learner/shared';

export async function handleGetUnits(req: Request): Promise<Response> {
  // Vocabulary is public - no auth required
  const db = getDatabase();
  const units = db
    .query<VocabularyUnit, []>(
      'SELECT id, name, description, level, order_index as orderIndex FROM vocabulary_units ORDER BY order_index ASC'
    )
    .all();

  const response: VocabularyUnitsResponse = { units };
  return jsonResponse(response);
}

export async function handleGetUnit(req: Request, unitId: string): Promise<Response> {
  // Vocabulary is public - no auth required
  const db = getDatabase();

  // Get unit
  const unit = db
    .query<VocabularyUnit, string>(
      'SELECT id, name, description, level, order_index as orderIndex FROM vocabulary_units WHERE id = ?'
    )
    .get(unitId);

  if (!unit) {
    return jsonError('NotFound', 'Unit not found', 404);
  }

  // Get vocabulary items with their database IDs
  const items = db
    .query<VocabItem & { id: number; }, string>(
      'SELECT id, korean, english FROM vocabulary_items WHERE unit_id = ? ORDER BY order_index ASC'
    )
    .all(unitId);

  const response: VocabularyUnitResponse = { unit, items };
  return jsonResponse(response);
}

