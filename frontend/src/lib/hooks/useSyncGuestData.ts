/**
 * Hook to sync guest localStorage data to backend when user logs in
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { storage } from '../storage';
import { apiClient } from '../api';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';

export function useSyncGuestData() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [hasSynced, setHasSynced] = useState(false);
  const [needsSync, setNeedsSync] = useState(false);

  // Check if there's guest data to sync
  useEffect(() => {
    if (isAuthenticated && !hasSynced) {
      // Check if already synced previously
      const alreadySynced = localStorage.getItem('guest-data-synced') === 'true';
      if (alreadySynced) {
        setHasSynced(true);
        setNeedsSync(false);
        return;
      }
      
      const guestData = storage.getAllData();
      const hasData = Object.keys(guestData).length > 0;
      setNeedsSync(hasData);
    }
  }, [isAuthenticated, hasSynced]);

  const syncMutation = useMutation({
    mutationFn: async () => {
      const guestData = storage.getAllData();
      
      if (Object.keys(guestData).length === 0) {
        return { success: true, message: 'No data to sync' };
      }

      // Parse and organize the data
      const sessions: Record<string, any> = {};
      const easySets: Record<string, string[]> = {};
      let settings: any = null;

      for (const [key, value] of Object.entries(guestData)) {
        if (key.startsWith('flashcards:session:')) {
          const unitId = key.replace('flashcards:session:', '');
          try {
            sessions[unitId] = JSON.parse(value);
          } catch (e) {
            console.error('Failed to parse session:', key, e);
          }
        } else if (key.endsWith(':easy')) {
          const unitId = key.replace('flashcards:', '').replace(':easy', '');
          try {
            easySets[unitId] = JSON.parse(value);
          } catch (e) {
            console.error('Failed to parse easy set:', key, e);
          }
        } else if (key === 'flashcards:settings') {
          try {
            settings = JSON.parse(value);
          } catch (e) {
            console.error('Failed to parse settings:', key, e);
          }
        }
      }

      // Sync to backend
      await apiClient.migrateFromLocalStorage({
        sessions,
        settings: settings || { promptSide: 'korean', typingMode: false, largeListText: false },
        easySets,
      });

      console.log('📤 Data synced to backend, now clearing localStorage...');
      
      // Clear guest data after successful sync
      storage.clearAll();
      
      // Double-check: remove any remaining flashcard keys
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('flashcards:')) {
          keysToRemove.push(key);
        }
      }
      
      if (keysToRemove.length > 0) {
        console.log(`🔄 Removing ${keysToRemove.length} additional keys...`);
        keysToRemove.forEach(key => localStorage.removeItem(key));
      }
      
      console.log('✅ Guest data synced and cleared from localStorage');
      
      return { success: true, message: 'Guest data synced successfully' };
    },
    onSuccess: () => {
      setHasSynced(true);
      setNeedsSync(false);
      
      // Mark as synced in localStorage to prevent future prompts
      localStorage.setItem('guest-data-synced', 'true');
      
      // Invalidate all queries to refetch from backend
      void queryClient.invalidateQueries();
      
      console.log('✅ Sync completed, localStorage cleared');
    },
    onError: (error) => {
      console.error('❌ Failed to sync guest data:', error);
    },
  });

  return {
    needsSync,
    isSyncing: syncMutation.isPending,
    syncGuestData: syncMutation.mutate,
    syncError: syncMutation.error,
  };
}

