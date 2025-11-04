import { useAuth } from '@/contexts/AuthContext';
import { GoogleLoginButton } from './GoogleLoginButton';
import { Button } from './ui/button';
import { X } from 'lucide-react';
import { useState } from 'react';

export function GuestModeWarning() {
  const { isGuestMode } = useAuth();
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem('guest-warning-dismissed') === 'true';
  });

  if (!isGuestMode || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('guest-warning-dismissed', 'true');
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white shadow-lg">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex-1 flex items-center gap-4">
          <p className="text-sm font-medium">
            ⚠️ <strong>Guest Mode:</strong> Your progress is only saved on this device. 
            Sign in to save your progress to the cloud and access it from any device.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-48">
            <GoogleLoginButton />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="text-white hover:bg-red-700"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

