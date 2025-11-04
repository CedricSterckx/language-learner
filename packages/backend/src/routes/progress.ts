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
        ease: number;
        interval_ms: number;
        repetitions: number;
        due_at_ms: number;
        lapses: number;
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
      ease: row.ease,
      intervalMs: row.interval_ms,
      repetitions: row.repetitions,
      dueAtMs: row.due_at_ms,
      lapses: row.lapses,
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
    `INSERT INTO user_progress (user_id, vocab_item_id, is_easy, updated_at, ease, interval_ms, repetitions, due_at_ms, lapses)
     VALUES (?, ?, ?, ?, 2.5, 0, 0, 0, 0)
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
  const { cardId, progress } = body;

  if (!cardId || !progress) {
    return jsonError('BadRequest', 'Missing cardId or progress', 400);
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

  // Build update query
  const updates: string[] = [];
  const values: (string | number)[] = [];

  if (progress.ease !== undefined) {
    updates.push('ease = ?');
    values.push(progress.ease);
  }
  if (progress.intervalMs !== undefined) {
    updates.push('interval_ms = ?');
    values.push(progress.intervalMs);
  }
  if (progress.repetitions !== undefined) {
    updates.push('repetitions = ?');
    values.push(progress.repetitions);
  }
  if (progress.dueAtMs !== undefined) {
    updates.push('due_at_ms = ?');
    values.push(progress.dueAtMs);
  }
  if (progress.lapses !== undefined) {
    updates.push('lapses = ?');
    values.push(progress.lapses);
  }
  if (progress.isEasy !== undefined) {
    updates.push('is_easy = ?');
    values.push(progress.isEasy ? 1 : 0);
  }

  updates.push('updated_at = ?');
  values.push(Date.now());

  values.push(authResult.user.userId, item.id);

  // Upsert progress
  db.query(
    `INSERT INTO user_progress (user_id, vocab_item_id, ease, interval_ms, repetitions, due_at_ms, lapses, is_easy, updated_at)
     VALUES (?, ?, 2.5, 0, 0, 0, 0, 0, ?)
     ON CONFLICT(user_id, vocab_item_id) DO UPDATE SET ${updates.join(', ')}`
  ).run(authResult.user.userId, item.id, Date.now(), ...values.slice(0, -2));

  return jsonResponse({ success: true });
}

