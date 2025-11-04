import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { useMigration } from '@/lib/hooks/useMigration';

export function MigrationPrompt() {
  const { migrate, isLoading, isSuccess, collectLocalStorageData } = useMigration();
  const [showPrompt, setShowPrompt] = useState(false);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    // Check if there's localStorage data to migrate
    const checkData = () => {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('flashcards:session:') || key.includes(':easy'))) {
          setHasData(true);
          setShowPrompt(true);
          return;
        }
      }
    };

    checkData();
  }, []);

  const handleMigrate = () => {
    const data = collectLocalStorageData();
    migrate(data);
  };

  const handleSkip = () => {
    setShowPrompt(false);
    // Store that user skipped migration
    localStorage.setItem('migration:skipped', 'true');
  };

  if (!showPrompt || !hasData || isSuccess) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 grid place-items-center p-4">
      <div className="bg-background border rounded-lg p-6 max-w-md w-full space-y-4">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Migrate Your Data?</h3>
          <p className="text-sm text-muted-foreground">
            We detected existing flashcard data in your browser. Would you like to migrate it to
            your account so it's synced across devices?
          </p>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleMigrate} disabled={isLoading} className="flex-1">
            {isLoading ? 'Migrating...' : 'Migrate Data'}
          </Button>
          <Button onClick={handleSkip} variant="outline" disabled={isLoading}>
            Skip
          </Button>
        </div>
      </div>
    </div>
  );
}

