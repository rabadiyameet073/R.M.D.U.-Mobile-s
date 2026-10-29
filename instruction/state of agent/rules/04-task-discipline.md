# Rule 04 — Task Discipline (inviolable)

Every user prompt that assigns platform work opens or resumes a tracked task first; every finished task is completely closed with verification details before proceeding to subsequent work.

---

## Protocol

1. **On Prompt Intake**:
   - Identify or create the active task in `tasks.json` under `tasks[]`.
   - Set status to `in_progress`, populate `started` date, and assign `owner: "Meet Rabadiya"`.
   - Ensure only one task is actively marked `in_progress` at any time.

2. **On Task Completion**:
   - Run and pass all Rule 02 verification gates.
   - Set `status: "done"`, populate `finished` date, attach the local commit hash in `log`, set `verified: true`, record `design_match`, and document `key_decisions[]`.
   - Recompute the `summary` counts (`total`, `done`, `in_progress`, `backlog`).
   - Refresh the `session` object: update `tip`, `unpushed[]`, `next_up`, and clear resolved `pending_verifications[]`.
   - Commit the code changes and `tasks.json` together in the same exact-path commit.

3. **No Silent Context**:
   - Never allow unresolved technical questions, edge cases, or pending human approvals to live solely in chat memory.
   - Record them explicitly in `session.pending_verifications[]` or within the task's `follow_ups[]`.

---

## Good / Bad

- ✅ User requests a new camera sensor filter → task opened in `tasks.json` → code implemented → gates pass → task marked done + committed together.
- ❌ Finishing code implementation and telling the user "I will update the task tracker in a later commit".
- ❌ Marking a task `done` while real-world browser testing or design confirmation is still pending with the user.

---

## Enforcement

Every work report must explicitly declare:
> **Tasks**: opened <Task ID> / closed <Task ID> (tracker updated in commit <hash>).  
Omitting task tracker updates breaks session resume capabilities for future agents.
