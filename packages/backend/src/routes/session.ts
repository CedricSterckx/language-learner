import { getDatabase } from '../db/client';
import { requireAuth, jsonError, jsonResponse } from '../auth/middleware';
import type {
  SessionResponse,
  SaveSessionRequest,
  SessionStateV1,
} from '@language-learner/shared';

export async function handleGetSession(req: Request, unitId: string): Promise<Response> {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;

  const db = getDatabase();
  const result = db
    .query<{ session_state: string }, [number, number]>(
      'SELECT session_state FROM user_sessions WHERE user_id = ? AND unit_id = ?'
    )
    .get(authResult.user.userId, Number(unitId));

  const session = result ? (JSON.parse(result.session_state) as SessionStateV1) : null;

  const response: SessionResponse = { session };
  return jsonResponse(response);
}

export async function handleSaveSession(req: Request, unitId: string): Promise<Response> {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;

  const body: SaveSessionRequest = await req.json();
  const { session } = body;

  if (!session) {
    return jsonError('BadRequest', 'Missing session data', 400);
  }

  const db = getDatabase();
  db.query(
    `INSERT INTO user_sessions (user_id, unit_id, session_state, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id, unit_id) DO UPDATE SET
       session_state = excluded.session_state,
       updated_at = excluded.updated_at`
  ).run(authResult.user.userId, Number(unitId), JSON.stringify(session), Date.now());

  return jsonResponse({ success: true });
}

export async function handleDeleteSession(req: Request, unitId: string): Promise<Response> {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;

  const db = getDatabase();
  db.query('DELETE FROM user_sessions WHERE user_id = ? AND unit_id = ?').run(
    authResult.user.userId,
    Number(unitId)
  );

  return jsonResponse({ success: true });
}

