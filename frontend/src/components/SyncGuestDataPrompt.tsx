import { useSyncGuestData } from '@/lib/hooks/useSyncGuestData';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';

export function SyncGuestDataPrompt() {
  const { needsSync, isSyncing, syncGuestData, syncError } = useSyncGuestData();

  if (!needsSync) return null;

  return (
    <Dialog open={needsSync}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Sync Guest Data</DialogTitle>
          <DialogDescription>
            We detected data from your guest session. Would you like to sync it to your account?
            This will transfer all your progress, settings, and session state to the cloud.
          </DialogDescription>
        </DialogHeader>
        {syncError && (
          <div className="text-sm text-red-600 p-2 bg-red-50 rounded">
            Failed to sync: {syncError instanceof Error ? syncError.message : 'Unknown error'}
          </div>
        )}
        <DialogFooter>
          <Button onClick={() => syncGuestData()} disabled={isSyncing}>
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => {
              // Clear guest data without syncing
              if (confirm('Are you sure? Your guest progress will be lost.')) {
                localStorage.removeItem('guest-warning-dismissed');
                window.location.reload();
              }
            }} 
            disabled={isSyncing}
          >
            Start Fresh
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

