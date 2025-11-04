# Language Learner - Setup Guide

Complete setup guide for the Language Learner application with backend API.

## Architecture Overview

- **Frontend:** React + TypeScript + TanStack Router + TanStack Query
- **Backend:** Bun + TypeScript + SQLite
- **Shared:** Common types in monorepo workspace package
- **Auth:** Google OAuth 2.0 with httpOnly cookies
- **Deployment:** Docker containers (separate frontend & backend services)

## Prerequisites

- [Bun](https://bun.sh) (v1.0+) - JavaScript runtime
- [Node.js](https://nodejs.org) (v20+) - For frontend build
- [pnpm](https://pnpm.io) (v8+) - Package manager
- [Docker](https://docker.com) (optional, for deployment)
- Google Cloud account (for OAuth)

## Initial Setup

### 1. Install Dependencies

```bash
# Install pnpm if not already installed
npm install -g pnpm

# Install all workspace dependencies
pnpm install
```

### 2. Setup Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Google+ API**
4. Navigate to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Add authorized redirect URIs:
   - Development: `http://localhost:5173/auth/callback`
   - Production: `https://yourdomain.com/auth/callback`
7. Copy **Client ID** and **Client Secret**

### 3. Configure Backend

```bash
cd packages/backend

# Copy environment example
cp .env.example .env

# Edit .env with your values
nano .env
```

Required environment variables:
```env
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
JWT_SECRET=generate-random-secret-here
DATABASE_PATH=./data/app.db
CORS_ORIGIN=http://localhost:5173
```

Generate JWT secret:
```bash
openssl rand -base64 32
```

### 4. Seed Vocabulary Database

Import vocabulary from JSON files into SQLite:

```bash
cd packages/backend
pnpm run seed
```

This will:
- Create database tables
- Import all vocabulary units from `frontend/src/assets/vocabulary/A1/*.json`
- Set up indexes

### 5. Configure Frontend

```bash
cd frontend

# Copy environment example (if it exists, or create manually)
# Create .env.local file
cat > .env.local << 'EOF'
VITE_API_URL=http://localhost:3000
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
EOF
```

## Development

### Start Backend

```bash
cd packages/backend
pnpm run dev
```

Backend runs on `http://localhost:3000`

### Start Frontend

```bash
cd frontend
pnpm run dev
```

Frontend runs on `http://localhost:5173`

### Testing the Flow

1. Open `http://localhost:5173`
2. Click "Sign in with Google"
3. Authorize with Google
4. You'll be redirected back and logged in
5. If you have existing localStorage data, you'll see a migration prompt
6. Start using flashcards - all data is now synced to the backend!

## Production Deployment

### Option 1: Docker Compose

```bash
# Create root .env file
cat > .env << 'EOF'
GOOGLE_CLIENT_ID=your-production-client-id
GOOGLE_CLIENT_SECRET=your-production-secret
JWT_SECRET=your-production-jwt-secret
CORS_ORIGIN=https://yourdomain.com
VITE_API_URL=https://api.yourdomain.com
COOKIE_DOMAIN=.yourdomain.com
EOF

# Build and start services
docker-compose up -d

# Check logs
docker-compose logs -f
```

Services:
- Frontend: `http://localhost` (port 80)
- Backend: `http://localhost:3000`

### Option 2: Manual Deployment

**Backend:**
```bash
cd packages/backend
bun run start
```

**Frontend:**
```bash
cd frontend
pnpm run build
# Serve dist/ folder with nginx or any static server
```

## Database Management

### View Database

```bash
cd packages/backend
sqlite3 data/app.db
```

Useful queries:
```sql
-- List all users
SELECT * FROM users;

-- Count vocabulary items per unit
SELECT u.name, COUNT(vi.id) as word_count
FROM vocabulary_units u
LEFT JOIN vocabulary_items vi ON vi.unit_id = u.id
GROUP BY u.id;

-- View user progress
SELECT * FROM user_progress WHERE user_id = 1;
```

### Backup Database

```bash
cd packages/backend
cp data/app.db data/app.db.backup
```

### Reset Database

```bash
cd packages/backend
rm data/app.db
pnpm run seed
```

## API Endpoints

### Authentication
- `POST /api/auth/google` - Exchange Google code for JWT
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Clear auth cookie

### Vocabulary
- `GET /api/vocabulary/units` - List all units
- `GET /api/vocabulary/:unitId` - Get unit with items

### Session Management
- `GET /api/session/:unitId` - Get session state
- `PUT /api/session/:unitId` - Save session state
- `DELETE /api/session/:unitId` - Clear session

### User Settings
- `GET /api/settings` - Get user settings
- `PUT /api/settings` - Update settings

### Progress Tracking
- `GET /api/progress/:unitId` - Get progress data
- `PUT /api/progress/:unitId/mark-easy` - Mark card as easy
- `PUT /api/progress/:unitId/update` - Update SRS progress

### Migration
- `POST /api/migrate/from-localstorage` - Migrate old data

## Troubleshooting

### Backend won't start
- Check if port 3000 is available
- Verify GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set
- Check database path has write permissions

### Frontend can't connect to backend
- Verify VITE_API_URL matches backend URL
- Check CORS_ORIGIN in backend .env
- Ensure backend is running

### Google OAuth fails
- Verify redirect URI matches exactly (trailing slash matters!)
- Check OAuth credentials are for correct project
- Ensure Google+ API is enabled

### Database errors
- Delete and recreate: `rm data/app.db && pnpm run seed`
- Check file permissions on data/ directory

### Migration doesn't work
- Check browser console for errors
- Verify user is authenticated
- Try manually clearing localStorage and starting fresh

## Monorepo Structure

```
language-learner/
├── frontend/                 # React frontend
│   ├── src/
│   │   ├── components/      # UI components
│   │   ├── contexts/        # React contexts (Auth)
│   │   ├── lib/            
│   │   │   ├── api.ts       # API client
│   │   │   └── hooks/       # TanStack Query hooks
│   │   └── routes/          # TanStack Router routes
│   └── Dockerfile
│
├── packages/
│   ├── backend/             # Bun backend
│   │   └── src/
│   │       ├── auth/        # JWT, Google OAuth
│   │       ├── db/          # SQLite client & schema
│   │       ├── routes/      # API endpoints
│   │       ├── services/    # Seed script
│   │       └── utils/       # Rate limiting
│   │
│   └── shared/              # Shared TypeScript types
│       └── src/types/
│
├── docker-compose.yml       # Docker orchestration
├── pnpm-workspace.yaml      # pnpm monorepo config
└── SETUP.md                 # This file
```

## Next Steps

- Add more vocabulary units
- Implement proper SRS scheduling in backend
- Add vocabulary editing for admins
- Add progress analytics/charts
- Add mobile app (React Native)
- Add offline support (PWA)

## Support

For issues or questions, check:
- `frontend/flash_algo.md` - Flashcard algorithm details
- `packages/backend/README.md` - Backend-specific docs
- GitHub Issues (if applicable)

