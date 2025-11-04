import { getDatabase } from '../db/client';
import { requireAuth, jsonError, jsonResponse } from '../auth/middleware';
import type { SettingsResponse, UpdateSettingsRequest, UserSettings } from '@language-learner/shared';

export async function handleGetSettings(req: Request): Promise<Response> {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;

  const db = getDatabase();
  const result = db
    .query<
      { user_id: number; prompt_side: string; typing_mode: number; large_list_text: number },
      number
    >('SELECT * FROM user_settings WHERE user_id = ?')
    .get(authResult.user.userId);

  if (!result) {
    // Create default settings if not exists
    db.query(
      'INSERT INTO user_settings (user_id, prompt_side, typing_mode, large_list_text) VALUES (?, ?, ?, ?)'
    ).run(authResult.user.userId, 'korean', 0, 0);

    const settings: UserSettings = {
      userId: authResult.user.userId,
      promptSide: 'korean',
      typingMode: false,
      largeListText: false,
    };

    const response: SettingsResponse = { settings };
    return jsonResponse(response);
  }

  const settings: UserSettings = {
    userId: result.user_id,
    promptSide: result.prompt_side as 'korean' | 'english',
    typingMode: Boolean(result.typing_mode),
    largeListText: Boolean(result.large_list_text),
  };

  const response: SettingsResponse = { settings };
  return jsonResponse(response);
}

export async function handleUpdateSettings(req: Request): Promise<Response> {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;

  const body: UpdateSettingsRequest = await req.json();
  const { promptSide, typingMode, largeListText } = body;

  const db = getDatabase();

  // Build dynamic update query
  const updates: string[] = [];
  const values: (string | number)[] = [];

  if (promptSide !== undefined) {
    updates.push('prompt_side = ?');
    values.push(promptSide);
  }
  if (typingMode !== undefined) {
    updates.push('typing_mode = ?');
    values.push(typingMode ? 1 : 0);
  }
  if (largeListText !== undefined) {
    updates.push('large_list_text = ?');
    values.push(largeListText ? 1 : 0);
  }

  if (updates.length === 0) {
    return jsonError('BadRequest', 'No settings to update', 400);
  }

  values.push(authResult.user.userId);

  db.query(`UPDATE user_settings SET ${updates.join(', ')} WHERE user_id = ?`).run(...values);

  return jsonResponse({ success: true });
}

