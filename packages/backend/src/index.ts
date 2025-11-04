import { config, validateConfig } from './config';
import { runMigrations } from './db/client';
import { handleGoogleAuth, handleGetMe, handleLogout } from './routes/auth';
import { handleGetUnits, handleGetUnit } from './routes/vocabulary';
import { handleGetSession, handleSaveSession, handleDeleteSession } from './routes/session';
import { handleGetSettings, handleUpdateSettings } from './routes/settings';
import { handleGetProgress, handleMarkEasy, handleUpdateProgress } from './routes/progress';
import { handleMigrateLocalStorage } from './routes/migrate';
import { jsonError } from './auth/middleware';
import { apiRateLimit } from './utils/rate-limit';

// Validate config and run migrations on startup
validateConfig();
runMigrations();

const server = Bun.serve({
  port: config.port,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    // CORS handling
    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: getCorsHeaders(),
      });
    }

    // Rate limiting for API routes (excluding auth for now, it has its own)
    if (path.startsWith('/api/') && !path.startsWith('/api/auth/')) {
      const ip = req.headers.get('x-forwarded-for') || 'unknown';
      if (!apiRateLimit(ip)) {
        return jsonError('RateLimitExceeded', 'Too many requests', 429);
      }
    }

    try {
      let response: Response;

      // Auth routes
      if (path === '/api/auth/google' && method === 'POST') {
        response = await handleGoogleAuth(req);
      } else if (path === '/api/auth/me' && method === 'GET') {
        response = await handleGetMe(req);
      } else if (path === '/api/auth/logout' && method === 'POST') {
        response = await handleLogout(req);
      }
      // Vocabulary routes
      else if (path === '/api/vocabulary/units' && method === 'GET') {
        response = await handleGetUnits(req);
      } else if (path.match(/^\/api\/vocabulary\/(\d+)$/) && method === 'GET') {
        const unitId = path.split('/').pop()!;
        response = await handleGetUnit(req, unitId);
      }
      // Session routes
      else if (path.match(/^\/api\/session\/(\d+)$/) && method === 'GET') {
        const unitId = path.split('/').pop()!;
        response = await handleGetSession(req, unitId);
      } else if (path.match(/^\/api\/session\/(\d+)$/) && method === 'PUT') {
        const unitId = path.split('/').pop()!;
        response = await handleSaveSession(req, unitId);
      } else if (path.match(/^\/api\/session\/(\d+)$/) && method === 'DELETE') {
        const unitId = path.split('/').pop()!;
        response = await handleDeleteSession(req, unitId);
      }
      // Settings routes
      else if (path === '/api/settings' && method === 'GET') {
        response = await handleGetSettings(req);
      } else if (path === '/api/settings' && method === 'PUT') {
        response = await handleUpdateSettings(req);
      }
      // Progress routes
      else if (path.match(/^\/api\/progress\/(\d+)$/) && method === 'GET') {
        const unitId = path.split('/').pop()!;
        response = await handleGetProgress(req, unitId);
      } else if (path.match(/^\/api\/progress\/(\d+)\/mark-easy$/) && method === 'PUT') {
        const unitId = path.match(/^\/api\/progress\/(\d+)\/mark-easy$/)![1];
        response = await handleMarkEasy(req, unitId);
      } else if (path.match(/^\/api\/progress\/(\d+)\/update$/) && method === 'PUT') {
        const unitId = path.match(/^\/api\/progress\/(\d+)\/update$/)![1];
        response = await handleUpdateProgress(req, unitId);
      }
      // Migration route
      else if (path === '/api/migrate/from-localstorage' && method === 'POST') {
        response = await handleMigrateLocalStorage(req);
      }
      // Health check
      else if (path === '/health' && method === 'GET') {
        response = new Response(JSON.stringify({ status: 'ok' }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
      // Not found
      else {
        response = jsonError('NotFound', 'Endpoint not found', 404);
      }

      // Add CORS headers to all responses
      const headers = new Headers(response.headers);
      for (const [key, value] of Object.entries(getCorsHeaders())) {
        headers.set(key, value);
      }

      return new Response(response.body, {
        status: response.status,
        headers,
      });
    } catch (error) {
      console.error('Server error:', error);
      return jsonError('InternalServerError', 'An unexpected error occurred', 500);
    }
  },
});

function getCorsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': config.corsOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };
}

console.log(`🚀 Server running at http://localhost:${server.port}`);
console.log(`📁 Database: ${config.databasePath}`);
console.log(`🔐 CORS origin: ${config.corsOrigin}`);

