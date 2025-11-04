import { getDatabase } from '../db/client';
import { signJWT } from '../auth/jwt';
import { exchangeCodeForToken, getGoogleProfile } from '../auth/google';
import { requireAuth, jsonError, jsonResponse } from '../auth/middleware';
import { config } from '../config';
import { authRateLimit } from '../utils/rate-limit';
import type { GoogleAuthRequest, AuthResponse, User } from '@language-learner/shared';

export async function handleGoogleAuth(req: Request): Promise<Response> {
  try {
    // Rate limiting by IP
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!authRateLimit(ip)) {
      return jsonError('RateLimitExceeded', 'Too many requests, try again later', 429);
    }

    const body: GoogleAuthRequest = await req.json();
    const { code, redirectUri } = body;

    if (!code || !redirectUri) {
      return jsonError('BadRequest', 'Missing code or redirectUri', 400);
    }

    // Exchange code for access token
    const accessToken = await exchangeCodeForToken(code, redirectUri);

    // Get user profile from Google
    const profile = await getGoogleProfile(accessToken);

    // Find or create user in database
    const db = getDatabase();
    let user = db
      .query<User, string>('SELECT * FROM users WHERE google_id = ?')
      .get(profile.sub);

    if (!user) {
      // Create new user
      const result = db
        .query(
          'INSERT INTO users (google_id, email, name, avatar_url, created_at) VALUES (?, ?, ?, ?, ?)'
        )
        .run(profile.sub, profile.email, profile.name, profile.picture || null, Date.now());

      user = {
        id: result.lastInsertRowid as number,
        googleId: profile.sub,
        email: profile.email,
        name: profile.name,
        avatarUrl: profile.picture,
        createdAt: Date.now(),
      };

      // Create default settings for new user
      db.query(
        'INSERT INTO user_settings (user_id, prompt_side, typing_mode, large_list_text) VALUES (?, ?, ?, ?)'
      ).run(user.id, 'korean', 0, 0);
    }

    // Generate JWT
    const token = await signJWT({
      userId: user.id,
      email: user.email,
    });

    // Set httpOnly cookie
    const cookieOptions = [
      `auth_token=${token}`,
      'HttpOnly',
      'SameSite=Lax',
      'Path=/',
      `Max-Age=${60 * 60 * 24 * 30}`, // 30 days
      config.isProduction ? 'Secure' : '',
      config.cookieDomain ? `Domain=${config.cookieDomain}` : '',
    ]
      .filter(Boolean)
      .join('; ');

    const response: AuthResponse = { user };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookieOptions,
      },
    });
  } catch (error) {
    console.error('Auth error:', error);
    return jsonError('AuthenticationFailed', 'Failed to authenticate with Google', 500);
  }
}

export async function handleGetMe(req: Request): Promise<Response> {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;

  const db = getDatabase();
  const user = db
    .query<User, number>('SELECT * FROM users WHERE id = ?')
    .get(authResult.user.userId);

  if (!user) {
    return jsonError('NotFound', 'User not found', 404);
  }

  const response: AuthResponse = { user };
  return jsonResponse(response);
}

export async function handleLogout(_req: Request): Promise<Response> {
  // Clear auth cookie
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': 'auth_token=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0',
    },
  });
}

