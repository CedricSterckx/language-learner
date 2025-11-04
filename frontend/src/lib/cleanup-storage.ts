/**
 * Cleanup utility to remove old localStorage data
 * Keeps only theme-related data, everything else goes through API now
 */

export function cleanupOldLocalStorage() {
  const keysToRemove: string[] = [];
  
  // Find all keys that should be removed
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    
    // Keep theme-related keys (next-themes uses 'theme' key)
    if (key === 'theme') continue;
    
    // Remove all flashcard-related localStorage
    if (key.startsWith('flashcards:')) {
      keysToRemove.push(key);
    }
  }
  
  // Remove the keys
  keysToRemove.forEach(key => {
    try {
      localStorage.removeItem(key);
      console.log(`[Cleanup] Removed old localStorage key: ${key}`);
    } catch (error) {
      console.error(`[Cleanup] Failed to remove key ${key}:`, error);
    }
  });
  
  if (keysToRemove.length > 0) {
    console.log(`[Cleanup] Cleaned up ${keysToRemove.length} old localStorage entries`);
  }
}

// Run cleanup on import (runs once when app loads)
if (typeof window !== 'undefined') {
  // Run after a short delay to not block initial render
  setTimeout(() => {
    cleanupOldLocalStorage();
  }, 1000);
}

