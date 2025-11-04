export const config = {
  port: Number(process.env.PORT) || 3000,
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  databasePath: process.env.DATABASE_PATH || './data/app.db',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  cookieDomain: process.env.COOKIE_DOMAIN,
  isProduction: process.env.NODE_ENV === 'production',
};

// Validate required config
export function validateConfig() {
  if (!config.googleClientId) {
    console.warn('⚠️  GOOGLE_CLIENT_ID is not set');
  }
  if (!config.googleClientSecret) {
    console.warn('⚠️  GOOGLE_CLIENT_SECRET is not set');
  }
  if (!config.isProduction && config.jwtSecret === 'dev-secret-change-in-production') {
    console.warn('⚠️  Using default JWT_SECRET in development');
  }
}

