import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';

export const Route = createFileRoute('/auth/callback')({
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();
  const { loginWithGoogle } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const errorParam = params.get('error');

    if (errorParam) {
      setError('Authentication cancelled or failed');
      setTimeout(() => navigate({ to: '/' }), 2000);
      return;
    }

    if (!code) {
      setError('No authorization code received');
      setTimeout(() => navigate({ to: '/' }), 2000);
      return;
    }

    // Exchange code for token
    loginWithGoogle(code)
      .then(() => {
        navigate({ to: '/' });
      })
      .catch((err) => {
        console.error('Login error:', err);
        setError('Failed to authenticate');
        setTimeout(() => navigate({ to: '/' }), 2000);
      });
  }, [loginWithGoogle, navigate]);

  if (error) {
    return (
      <div className="min-h-dvh grid place-items-center p-4">
        <div className="text-center space-y-3">
          <div className="text-destructive">{error}</div>
          <div className="text-sm text-muted-foreground">Redirecting...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh grid place-items-center p-4">
      <div className="text-center space-y-3">
        <div className="text-lg">Authenticating...</div>
        <div className="text-sm text-muted-foreground">Please wait</div>
      </div>
    </div>
  );
}

