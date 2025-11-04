import { verifyJWT, type JWTPayload } from './jwt';
import type { ErrorResponse } from '@language-learner/shared';

export interface AuthContext {
  user: JWTPayload;
}

export async function requireAuth(req: Request): Promise<AuthContext | Response> {
  // Get token from httpOnly cookie
  const cookies = parseCookies(req.headers.get('Cookie') || '');
  const token = cookies.auth_token;

  if (!token) {
    return jsonError('Unauthorized', 'No authentication token provided', 401);
  }

  const payload = await verifyJWT(token);
  if (!payload) {
    return jsonError('Unauthorized', 'Invalid or expired token', 401);
  }

  return { user: payload };
}

export function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;

  cookieHeader.split(';').forEach((cookie) => {
    const [name, ...rest] = cookie.split('=');
    cookies[name?.trim() || ''] = rest.join('=').trim();
  });

  return cookies;
}

export function jsonError(error: string, message: string, status: number): Response {
  const body: ErrorResponse = { error, message };
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function jsonResponse<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

