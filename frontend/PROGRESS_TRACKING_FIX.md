# Progress Tracking - Session-Based Queue System

## Current System (Updated November 2025)

The application uses a **session-based queue system** instead of time-based spaced repetition. Progress tracking is simplified to only track which cards are marked as "Easy" (mastered).

---

## How It Works

### **1. Card Queue System**

When starting a flashcard session:
```typescript
function startCards() {
  // Filter out cards marked as easy (permanently mastered)
  const cardsToStudy = cards.filter((c) => !easySet.has(c.id));
  
  // Shuffle remaining cards
  const shuffled = shuffleArray(cardsToStudy.map((c) => c.id));
  
  // Start session with shuffled queue
  setSessionQueue(shuffled);
  setCurrentId(shuffled[0]);
}
```

### **2. Card Grading**

When a card is graded, the queue is updated:

```typescript
function handleGradeQueue(quality: Quality) {
  const q = sessionQueue.slice();
  
  switch (quality) {
    case 'again':
      // Re-add card 2 positions ahead (see again very soon)
      q.splice(currentIndex + 2, 0, currentId);
      if (easySet.has(currentId)) markEasy({ cardId: currentId, isEasy: false });
      break;
      
    case 'hard':
      // Re-add card 5 positions ahead (see again soon)
      q.splice(currentIndex + 5, 0, currentId);
      if (easySet.has(currentId)) markEasy({ cardId: currentId, isEasy: false });
      break;
      
    case 'good':
      // Re-add to end of queue (see later in session)
      q.push(currentId);
      if (easySet.has(currentId)) markEasy({ cardId: currentId, isEasy: false });
      break;
      
    case 'easy':
      // Mark as mastered and remove from queue permanently
      markEasy({ cardId: currentId, isEasy: true });
      break;
  }
  
  setSessionQueue(q);
  setCurrentId(q[nextIndex]);
}
```

### **3. Progress Storage**

Only the "Easy" status is stored in the database:

```sql
CREATE TABLE user_progress (
  user_id INTEGER NOT NULL,
  vocab_item_id INTEGER NOT NULL,
  is_easy INTEGER NOT NULL DEFAULT 0, -- 0 for false, 1 for true
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, vocab_item_id)
);
```

**TypeScript Types:**
```typescript
interface UserProgress {
  userId: number;
  vocabItemId: number;
  isEasy: boolean;
  updatedAt: number;
}
```

### **4. API Calls**

**Mark Card as Easy:**
```typescript
PUT /api/progress/:unitId/mark-easy
{
  cardId: "korean|english",
  isEasy: true
}
```

**Get Progress:**
```typescript
GET /api/progress/:unitId

Response:
{
  progress: {
    "123": { userId: 1, vocabItemId: 123, isEasy: true, updatedAt: 1234567890 }
  },
  easySet: ["한국어|korean", "안녕하세요|hello"]
}
```

---

## What Was Removed

### **Time-Based SRS Fields (Removed):**
- ❌ `ease` - Difficulty multiplier (1.3-3.0)
- ❌ `intervalMs` - Time until next review
- ❌ `repetitions` - Successful reviews in a row
- ❌ `dueAtMs` - When card becomes due
- ❌ `lapses` - Number of failures

### **SRS Algorithm Module (Removed):**
- ❌ `lib/srs.ts` - SM-2 style spaced repetition calculations
- ❌ `scheduleCard()` function
- ❌ Complex interval calculations

---

## Benefits of Session-Based System

### **✅ Simplicity**
- No complex time calculations
- Easy to understand and predict
- Cards either in queue or marked easy

### **✅ Immediate Feedback**
- See struggling cards again soon (not hours/days later)
- Get multiple practice attempts in one session
- Don't need to wait for "due dates"

### **✅ Reduced Database Load**
- Only store one boolean per card (isEasy)
- No constant updates to intervals/ease/repetitions
- Simpler API calls

### **✅ Better for Active Learning**
- Focus on current session practice
- Re-encounter difficult cards immediately
- Complete mastery before marking "Easy"

---

## Testing Progress Tracking

### **1. Start a Session**
```
1. Go to a vocabulary unit
2. Click "Start Cards"
3. All non-easy cards appear in shuffled queue
```

### **2. Grade Cards**
```
- Click "Again" → Card reappears 2 positions ahead
- Click "Hard" → Card reappears 5 positions ahead  
- Click "Good" → Card goes to end of queue
- Click "Easy" → Card is removed permanently
```

### **3. Check Database**
```bash
cd packages/backend
sqlite3 data/app.db
```

```sql
-- View progress for user
SELECT vp.*, vi.korean, vi.english 
FROM user_progress vp
JOIN vocabulary_items vi ON vi.id = vp.vocab_item_id
WHERE vp.user_id = 1;
```

Should see only:
- `is_easy` values (0 or 1)
- `updated_at` timestamps
- **No** ease, interval, repetitions, due_at, lapses

### **4. Verify Persistence**
```
1. Mark some cards as "Easy"
2. Exit session
3. Start new session
4. Easy cards should NOT appear in queue
```

---

## Summary

✅ **Session-based queue** (no time intervals)  
✅ **Simple progress tracking** (easy flag only)  
✅ **Immediate re-learning** (wrong cards come back soon)  
✅ **Database simplified** (one boolean + timestamp)  
✅ **Predictable behavior** (no complex algorithms)  

Cards are either **in the queue** or **marked as easy**. No more, no less! 🎯
