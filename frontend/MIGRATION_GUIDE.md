# Migration Guide: localStorage to API

## Summary

The frontend has been migrated from localStorage-based storage to API-based storage with automatic synchronization across devices.

## What Changed

### **Before (localStorage)**
- Session state: `flashcards:session:{unit}`
- Settings: `flashcards:settings`
- Easy marks: `flashcards:{unit}:easy`
- ❌ No sync across devices
- ❌ Data lost on browser clear

### **After (API)**
- All data stored in backend database
- ✅ Automatic sync across devices
- ✅ Multi-user support with authentication
- ✅ Data persists forever (or until user deletes)
- ✅ Automatic localStorage cleanup

## What's Kept in localStorage

**Only theme preference:**
- `theme` - Dark/light mode preference (managed by next-themes)

## How It Works

### **API Hooks**
```typescript
// Settings (promptSide, typingMode, largeListText)
const { settings, updateSettings } = useSettings();

// Session state (current card, queue, etc.)
const { session, saveSession, deleteSession } = useSession(unitId);

// Progress (easy marks, SRS data)
const { easySet, markEasy, updateProgress } = useProgress(unitId);
```

### **Automatic Cleanup**
Old localStorage data is automatically removed on app load:
- Runs 1 second after app starts
- Removes all `flashcards:*` keys
- Keeps theme preference
- Logs cleanup actions to console

### **Migration Flow**
1. User logs in with Google for first time
2. `MigrationPrompt` detects old localStorage data
3. User clicks "Migrate Data"
4. Data sent to `/api/migrate/from-localstorage`
5. Backend stores data in database
6. Automatic cleanup removes old localStorage

## For Developers

### **Updated Files**
- ✅ `routes/flashcards.tsx` - Uses API hooks instead of localStorage
- ✅ `lib/hooks/*` - TanStack Query hooks for API
- ✅ `lib/cleanup-storage.ts` - Auto-cleanup utility
- ✅ `lib/persistence.ts` - Marked as deprecated
- ✅ `App.tsx` - Imports cleanup utility

### **Removed Functions**
- ❌ `loadSettings()` / `saveSettings()`
- ❌ `loadEasySet()` / `saveEasySet()`
- ❌ Manual localStorage persistence logic

### **Testing**
1. Open app → Check console for cleanup logs
2. Use flashcards → Data saves to API automatically
3. Open in different browser → Same progress (after login)
4. Check localStorage → Only `theme` key remains

## Backwards Compatibility

The old `LocalStorageProvider` class is kept but deprecated. It's only used during migration if a user has old data.

## Rollback (If Needed)

To temporarily rollback to localStorage:

1. Comment out cleanup import in `App.tsx`:
   ```typescript
   // import './lib/cleanup-storage';
   ```

2. Revert flashcards.tsx to use `getStorageProvider()` instead of API hooks

**Note:** Not recommended - API storage is the production solution.

