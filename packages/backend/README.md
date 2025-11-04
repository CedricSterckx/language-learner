# Language Learner - Backend

Backend API server for the Language Learner application, built with Bun and TypeScript.

## Features

- **Google OAuth 2.0 Authentication** with httpOnly cookies
- **SQLite Database** for data persistence
- **Rate Limiting** on all API endpoints
- **RESTful API** for vocabulary, sessions, settings, and progress
- **Auto-migration** from localStorage to database

## Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required environment variables:
- `GOOGLE_CLIENT_ID` - From Google Cloud Console
- `GOOGLE_CLIENT_SECRET` - From Google Cloud Console
- `JWT_SECRET` - Random secret for JWT signing

### 3. Seed Vocabulary Data

Import vocabulary from JSON files into database:

```bash
pnpm run seed
```

### 4. Start Server

Development mode (with hot reload):
```bash
pnpm run dev
```

Production mode:
```bash
pnpm start
```

Server will start on `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/auth/google` - Login with Google OAuth
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### Vocabulary
- `GET /api/vocabulary/units` - List all units
- `GET /api/vocabulary/:unitId` - Get unit vocabulary

### Session
- `GET /api/session/:unitId` - Get session state
- `PUT /api/session/:unitId` - Save session state
- `DELETE /api/session/:unitId` - Delete session

### Settings
- `GET /api/settings` - Get user settings
- `PUT /api/settings` - Update settings

### Progress
- `GET /api/progress/:unitId` - Get progress data
- `PUT /api/progress/:unitId/mark-easy` - Mark card as easy
- `PUT /api/progress/:unitId/update` - Update SRS progress

### Migration
- `POST /api/migrate/from-localstorage` - Migrate localStorage data

## Database Schema

- `users` - User accounts
- `vocabulary_units` - Vocabulary units (A1, A2, etc.)
- `vocabulary_items` - Individual words/phrases
- `user_sessions` - Session state per unit
- `user_settings` - User preferences
- `user_progress` - Spaced repetition progress

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Go to Credentials → Create Credentials → OAuth 2.0 Client ID
5. Add authorized redirect URIs:
   - `http://localhost:5173/auth/callback` (development)
   - `https://yourdomain.com/auth/callback` (production)
6. Copy Client ID and Client Secret to `.env`

## Development

The backend uses:
- **Bun** - Fast JavaScript runtime
- **TypeScript** - Type safety
- **SQLite** - Embedded database
- **Bun's built-in HTTP server** - No Express needed!

All shared types are in `@language-learner/shared` package.

