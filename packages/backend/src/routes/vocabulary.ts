import { getDatabase } from '../db/client';
import { requireAuth, jsonError, jsonResponse } from '../auth/middleware';
import type {
  VocabularyUnitsResponse,
  VocabularyUnitResponse,
  VocabularyUnit,
  VocabItem,
} from '@language-learner/shared';

export async function handleGetUnits(req: Request): Promise<Response> {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;

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
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;

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

  // Get vocabulary items
  const items = db
    .query<VocabItem, string>(
      'SELECT korean, english FROM vocabulary_items WHERE unit_id = ? ORDER BY order_index ASC'
    )
    .all(unitId);

  const response: VocabularyUnitResponse = { unit, items };
  return jsonResponse(response);
}

