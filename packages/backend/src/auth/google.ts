import { config } from '../config';
import { logger } from '../utils/logger';
import type { GoogleProfile } from '@language-learner/shared';

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
  id_token: string;
}

export async function exchangeCodeForToken(code: string, redirectUri: string): Promise<string> {
  const params = new URLSearchParams({
    code,
    client_id: config.googleClientId,
    client_secret: config.googleClientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    
    console.error('❌ Failed to exchange Google code for token');
    console.error('Status:', response.status, response.statusText);
    console.error('Error:', error);
    
    logger.error('Failed to exchange Google code for token', { 
      status: response.status,
      statusText: response.statusText,
      error,
    });
    
    throw new Error(`Failed to exchange code: ${error}`);
  }

  const data: GoogleTokenResponse = await response.json();
  return data.access_token;
}

export async function getGoogleProfile(accessToken: string): Promise<GoogleProfile> {
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const error = await response.text();
    
    console.error('❌ Failed to fetch Google profile');
    console.error('Status:', response.status, response.statusText);
    console.error('Error:', error);
    
    logger.error('Failed to fetch Google profile', { 
      status: response.status,
      statusText: response.statusText,
      error,
    });
    
    throw new Error(`Failed to get user profile: ${error}`);
  }

  const profile = await response.json();
  return {
    sub: profile.sub,
    email: profile.email,
    name: profile.name,
    picture: profile.picture,
  };
}

