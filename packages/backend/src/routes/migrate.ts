import { getDatabase } from '../db/client';
import { requireAuth, jsonError, jsonResponse } from '../auth/middleware';
import { logger } from '../utils/logger';
import type {
  MigrateLocalStorageRequest,
  MigrateLocalStorageResponse,
} from '@language-learner/shared';

export async function handleMigrateLocalStorage(req: Request): Promise<Response> {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;

  try {
    const body: MigrateLocalStorageRequest = await req.json();
    const { sessions, settings, easySets } = body;

    const db = getDatabase();
    let migratedSessions = 0;
    let migratedEasyCards = 0;

    // Migrate settings
    if (settings) {
      db.query(
        `INSERT INTO user_settings (user_id, prompt_side, typing_mode, large_list_text)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET
           prompt_side = excluded.prompt_side,
           typing_mode = excluded.typing_mode,
           large_list_text = excluded.large_list_text`
      ).run(
        authResult.user.userId,
        settings.promptSide || 'korean',
        settings.typingMode ? 1 : 0,
        settings.largeListText ? 1 : 0
      );
    }

    // Migrate sessions
    if (sessions && typeof sessions === 'object') {
      for (const [unitName, session] of Object.entries(sessions)) {
        if (!session) continue;

        // Find unit by name (e.g., "voc_1")
        const unit = db
          .query<{ id: number }, string>(
            'SELECT id FROM vocabulary_units WHERE name = ? OR id = ?'
          )
          .get(unitName, unitName);

        if (!unit) {
          console.warn(`Unit not found: ${unitName}`);
          continue;
        }

        db.query(
          `INSERT INTO user_sessions (user_id, unit_id, session_state, updated_at)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(user_id, unit_id) DO UPDATE SET
             session_state = excluded.session_state,
             updated_at = excluded.updated_at`
        ).run(authResult.user.userId, unit.id, JSON.stringify(session), Date.now());

        migratedSessions++;
      }
    }

    // Migrate easy sets
    if (easySets && typeof easySets === 'object') {
      for (const [unitName, cardIds] of Object.entries(easySets)) {
        if (!Array.isArray(cardIds) || cardIds.length === 0) continue;

        // Find unit
        const unit = db
          .query<{ id: number }, string>(
            'SELECT id FROM vocabulary_units WHERE name = ? OR id = ?'
          )
          .get(unitName, unitName);

        if (!unit) continue;

        // For each cardId, find vocab item and mark as easy
        for (const cardId of cardIds) {
          const [korean, english] = cardId.split('|');
          if (!korean || !english) continue;

          const item = db
            .query<{ id: number }, [number, string, string]>(
              'SELECT id FROM vocabulary_items WHERE unit_id = ? AND korean = ? AND english = ?'
            )
            .get(unit.id, korean, english);

          if (!item) continue;

          db.query(
            `INSERT INTO user_progress (user_id, vocab_item_id, is_easy, updated_at)
             VALUES (?, ?, 1, ?)
             ON CONFLICT(user_id, vocab_item_id) DO UPDATE SET
               is_easy = 1,
               updated_at = excluded.updated_at`
          ).run(authResult.user.userId, item.id, Date.now());

          migratedEasyCards++;
        }
      }
    }

    const response: MigrateLocalStorageResponse = {
      success: true,
      migratedSessions,
      migratedEasyCards,
    };

    return jsonResponse(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('❌ Migration error:', error);
    if (errorStack) console.error('Stack:', errorStack);
    
    logger.error('Migration failed', {
      error: errorMessage,
      stack: errorStack,
      userId: authResult.user.userId,
    });
    
    return jsonError('InternalServerError', `Migration failed: ${errorMessage}`, 500);
  }
}

