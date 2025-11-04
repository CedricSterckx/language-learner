import { getDatabase } from '../db/client';
import { requireAuth, jsonError, jsonResponse } from '../auth/middleware';
import type {
  ProgressResponse,
  MarkEasyRequest,
  UpdateProgressRequest,
  UserProgress,
} from '@language-learner/shared';

export async function handleGetProgress(req: Request, unitId: string): Promise<Response> {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;

  const db = getDatabase();

  // Get all progress for this unit
  const rows = db
    .query<
      {
        vocab_item_id: number;
        is_easy: number;
        updated_at: number;
        korean: string;
        english: string;
      },
      [number, number]
    >(
      `SELECT up.*, vi.korean, vi.english
       FROM user_progress up
       JOIN vocabulary_items vi ON vi.id = up.vocab_item_id
       WHERE up.user_id = ? AND vi.unit_id = ?`
    )
    .all(authResult.user.userId, Number(unitId));

  const progress: Record<string, UserProgress> = {};
  const easySet: string[] = [];

  for (const row of rows) {
    const cardId = `${row.korean}|${row.english}`;
    progress[row.vocab_item_id.toString()] = {
      userId: authResult.user.userId,
      vocabItemId: row.vocab_item_id,
      isEasy: Boolean(row.is_easy),
      updatedAt: row.updated_at,
    };

    if (row.is_easy) {
      easySet.push(cardId);
    }
  }

  const response: ProgressResponse = { progress, easySet };
  return jsonResponse(response);
}

export async function handleMarkEasy(req: Request, unitId: string): Promise<Response> {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;

  const body: MarkEasyRequest = await req.json();
  const { cardId, isEasy } = body;

  if (!cardId) {
    return jsonError('BadRequest', 'Missing cardId', 400);
  }

  // Parse cardId to get korean and english
  const [korean, english] = cardId.split('|');
  if (!korean || !english) {
    return jsonError('BadRequest', 'Invalid cardId format', 400);
  }

  const db = getDatabase();

  // Find vocab item id
  const item = db
    .query<{ id: number }, [number, string, string]>(
      'SELECT vi.id FROM vocabulary_items vi WHERE vi.unit_id = ? AND vi.korean = ? AND vi.english = ?'
    )
    .get(Number(unitId), korean, english);

  if (!item) {
    return jsonError('NotFound', 'Vocabulary item not found', 404);
  }

      // Insert or update progress
      db.query(
        `INSERT INTO user_progress (user_id, vocab_item_id, is_easy, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(user_id, vocab_item_id) DO UPDATE SET
           is_easy = excluded.is_easy,
           updated_at = excluded.updated_at`
      ).run(authResult.user.userId, item.id, isEasy ? 1 : 0, Date.now());

  return jsonResponse({ success: true });
}

export async function handleUpdateProgress(req: Request, unitId: string): Promise<Response> {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;

  const body: UpdateProgressRequest = await req.json();
  const { cardId, isEasy } = body;

  if (!cardId || isEasy === undefined) {
    return jsonError('BadRequest', 'Missing cardId or isEasy', 400);
  }

  // Parse cardId to get korean and english
  const [korean, english] = cardId.split('|');
  if (!korean || !english) {
    return jsonError('BadRequest', 'Invalid cardId format', 400);
  }

  const db = getDatabase();

  // Find vocab item id
  const item = db
    .query<{ id: number }, [number, string, string]>(
      'SELECT vi.id FROM vocabulary_items vi WHERE vi.unit_id = ? AND vi.korean = ? AND vi.english = ?'
    )
    .get(Number(unitId), korean, english);

  if (!item) {
    return jsonError('NotFound', 'Vocabulary item not found', 404);
  }

  const updatedAt = Date.now();

  // Upsert progress (insert if not exists, update if exists)
  db.query(
    `INSERT INTO user_progress (user_id, vocab_item_id, is_easy, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id, vocab_item_id) DO UPDATE SET
       is_easy = excluded.is_easy,
       updated_at = excluded.updated_at`
  ).run(authResult.user.userId, item.id, isEasy ? 1 : 0, updatedAt);

  return jsonResponse({ success: true });
}

