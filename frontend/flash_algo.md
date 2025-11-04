## Flashcard Scheduling Logic and Features

**Last updated: 2025-11-04 - Removed time-based SRS, using session-based queue only**

### Session-Based Queue System (Current)

The application uses a **session-based queue system** instead of time-based spaced repetition:

**How It Works:**
1. When starting a flashcard session, all cards (except those marked as "Easy") are added to a shuffled queue
2. When grading a card:
   - **Again**: Card is re-inserted 2 positions ahead in the queue (see it again very soon)
   - **Hard**: Card is re-inserted 5 positions ahead in the queue (see it again soon)
   - **Good**: Card is moved to the end of the queue (see it later in session)
   - **Easy**: Card is permanently marked as mastered and removed from future sessions
3. Cards marked as "Easy" won't appear in future sessions until you unmark them
4. No time-based intervals - cards appear based on queue position only
5. Progress tracking only stores which cards are marked as "Easy/Mastered"

**Database Storage:**
- `user_progress.is_easy` - Boolean flag for mastered cards
- `user_progress.updated_at` - Last update timestamp
- No SRS fields (ease, interval, repetitions, due date, lapses)

---

### Backend Migration (November 2025)

The application uses a backend API server for data persistence instead of localStorage:

**Architecture:**
- **Backend:** Bun + TypeScript with SQLite database
- **Frontend:** React with TanStack Query for data fetching
- **Auth:** Google OAuth 2.0 with httpOnly cookies
- **Storage:** All session state, settings, and progress stored in database per user

**Key Features:**
- Multi-user support with Google authentication
- Data synced across devices automatically
- Session state persisted to database (debounced writes)
- Settings stored per user in database
- Progress (easy marks) stored per user per vocabulary item
- Auto-migration from localStorage on first login
- httpOnly cookies for secure authentication

**API Endpoints:**
- `/api/auth/*` - Authentication (Google OAuth, logout)
- `/api/vocabulary/*` - Vocabulary units and items
- `/api/session/:unitId` - Session state (get/save/delete)
- `/api/settings` - User settings (prompt side, typing mode, etc.)
- `/api/progress/:unitId` - Progress tracking (easy marks only)
- `/api/migrate/from-localstorage` - One-time migration endpoint

**Database Tables:**
- `users` - User accounts (google_id, email, name, avatar_url)
- `vocabulary_units` - Vocabulary units (name, level, order_index)
- `vocabulary_items` - Words/phrases (unit_id, korean, english)
- `user_sessions` - Session state JSON per unit per user
- `user_settings` - User preferences (prompt_side, typing_mode, large_list_text)
- `user_progress` - Easy/mastered marks per vocab item per user (is_easy, updated_at)

**Shared Types:**
All types shared between frontend and backend via `@language-learner/shared` workspace package.

---

### Review Drill (English → 한국어)

- Entry point: On the unit vocabulary list page, click "Review vocabulary list".
- The app shuffles the unit's words and presents them one by one.
- Prompt shows the English word; user must type the Korean translation to advance.
- Correct input advances immediately to the next word; incorrect input shows gentle error feedback and allows retry.
- Progress in this drill does not affect easy marks; it is a quick, linear practice round.
- Header shows progress (current index / total) and includes an Exit button to return to the list.

Visual feedback:
- Idle: standard card.
- Correct: green accent briefly before advancing.
- Incorrect: red accent with "Try again".

---

### Typing Mode Feature

A typing mode allows users to type their answers directly instead of just revealing them.

**How it works:**
1. Typing mode is toggled via a switch in the header (disabled by default)
2. When enabled, an input field appears instead of "Show answer" button
3. User types their answer
4. Press Enter or click "Check Answer" to submit
5. Feedback is displayed:
   - Green background with "✓ Correct!" for correct answers
   - Red background with "✗ Incorrect" for incorrect answers
6. After showing answer and feedback, user can still use the standard grading buttons (Again, Hard, Good, Easy)

**Answer Checking:**
- Answers are compared after normalizing to lowercase and trimming whitespace
- Works with both prompt side settings (korean → english or english → korean)
- The correct answer is determined based on the current prompt side setting

**State Management:**
- Typing mode preference is saved in user settings (database)
- Typed answer and feedback are reset when moving to next card
- Can be toggled on/off at any time during study session

---

### Settings and Persistence

- **Prompt Side:** Choose between Korean → English or English → Korean
- **Typing Mode:** Enable/disable typing input for answers
- **Large List Text:** Increase text size on vocabulary list view
- All settings are stored in the database per user
- Settings sync automatically across devices

---

### Card Selection and Queue Behavior

**Starting a Session:**
1. All cards except those marked as "Easy" are loaded
2. Cards are shuffled randomly
3. Queue is displayed with current position (e.g., "3/40")

**During Session:**
- Cards are shown one at a time
- User grades the card (Again, Hard, Good, Easy)
- Queue updates based on grade:
  - **Again/Hard**: Card re-appears soon (inserted back in queue)
  - **Good**: Card re-appears later (moved to end of queue)
  - **Easy**: Card is mastered and removed permanently
- Session continues until queue is empty

**Notes:**
- No time-based scheduling - everything happens within the session
- Cards don't have "due dates" - they're either in the queue or marked easy
- Simple, predictable behavior focused on immediate learning
