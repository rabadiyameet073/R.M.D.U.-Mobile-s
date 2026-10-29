# Tracker Guide (`tasks.json`)

Read this before modifying `tasks.json`. It is the single live task and session record; `session` enables any agent, developer, or IDE session to resume development exactly where work stopped.

---

## Fields

- `project`: Platform identifier (`rmdu-mobiles-platform`).
- `tracker_version`: Numeric schema version.
- `source_of_truth{code, tokens, skill-index, reference}`: Explicit pointers to code, design tokens, skill documents, and architecture blueprints.
- `summary{total, done, in_progress, backlog}`: Aggregate counts. **Must always strictly equal the actual `tasks` array counts.** Recompute on every update.
- `tasks[]`:
  - `id`: Stable unique identifier (e.g., `RMDU-CORE-001`, `RMDU-COMPARE-002`, `RMDU-FILTER-003`).
  - `title`: Concise, imperative task title.
  - `status`: `backlog` | `in_progress` | `done`.
  - `owner`: Always assigned to `Meet Rabadiya`.
  - `parent`: Optional; child tasks point to their parent task ID.
  - `started` / `finished`: ISO date strings or `null`.
  - `log`: Commit hash(es) implementing the task.
  - `design_match`: `yes` | `partial` | `null` (with verification notes).
  - `key_decisions[]`: Explicit architectural or UI decisions made.
  - `verified`: Boolean (`true` only when all gates pass).
  - `pushed`: **`true` / `false` only** — see push accounting below.
  - `follow_ups[]`: Explicit open questions or future iterations.
- `session{branch, tip, unpushed[], next_up, pending_verifications[], last_updated, updated_by}`: Live resume state, refreshed with every commit.
- `workflow{how_to_close_a_task, validation}`: Machine-enforced protocol.

---

## Status Flow

```
backlog  ──►  in_progress  ──►  done
```

A task may only transition to `done` when:
1. All verification gates pass (Vite production build passes, tests clean, zero console warnings).
2. The implementation commit is recorded in `log`.
3. `verified: true` is confirmed.
4. `finished` date is recorded.
5. **Never mark `done` on future intent or unverified code.** Keep exactly one task `in_progress` while active work is underway.

---

## Push Accounting (Human-Only Pushes)

- **Agents NEVER push to remote repositories (Rule 03).**
- Every completed task is committed locally with `pushed: false`.
- When the human developer executes `git push` and reports "pushed till <commit>", the agent:
  1. Sets `pushed: true` on every task whose `log` commit is an ancestor of or equal to that commit.
  2. Clears the pushed hashes from `session.unpushed[]`.
  3. Commits the tracker update locally with exact paths.

---

## Update Protocol

Update `tasks.json` in the **SAME commit** as the code block it records. Validate after every edit:
- JSON parses cleanly without syntax errors.
- All task IDs are globally unique.
- Referenced parent IDs exist.
- `summary` counts strictly equal the sum of tasks in each status.
- `done` tasks always have `log`, `verified: true`, and `finished` populated.

---

## Worked Example: Closing an RMDU Mobiles Task

Closing "Side-by-Side Difference Highlighter in Comparison Drawer":
1. Implement component code in `frontend/src/components/smartphones/ComparisonDrawer.jsx`.
2. Run Rule 02 gates: `npm run build` in `frontend/` succeeds, token purity confirmed, zero unstyled elements.
3. Update `tasks.json`:
   ```json
   {
     "id": "RMDU-COMPARE-002",
     "title": "Interactive Side-by-Side Difference Highlighter in Comparison Drawer",
     "status": "done",
     "owner": "Meet Rabadiya",
     "started": "2026-10-20",
     "finished": "2026-10-20",
     "log": "main:c83f901",
     "design_match": "yes",
     "verified": true,
     "pushed": false,
     "key_decisions": [
       "Created sticky header locking pinned device renders during long spec table scroll",
       "Added 'Highlight Differences' toggle dimming identical specs with opacity-30",
       "Implemented keyboard Escape listener to cleanly close drawer with focus return"
     ]
   }
   ```
4. Recompute `summary` counts and update `session.tip` + `session.unpushed`.
5. Stage exact files: `git add frontend/src/components/smartphones/ComparisonDrawer.jsx instruction/state\ of\ agent/tasks.json`.
6. Commit locally: `git commit -m "feat(compare): implement side-by-side difference highlighter"`.
7. Report to the user: "Rule compliance verified; task RMDU-COMPARE-002 closed; ready for your push."
