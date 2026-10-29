# Rule 03 — Never Push (inviolable, no exceptions)

AI agents and automated assistants **NEVER** push commits to any remote repository branch under any circumstances — neither code, nor documentation, nor tracker updates.

Pushing to remote is the exclusive responsibility of the human engineer (**Meet Rabadiya**) after comprehensive in-browser testing, accessibility audit, and workflow verification.

There is **no docs-only exception, no urgency exception, and no CI trigger exception**.

---

## Allowed Local Git Actions

- `git status`
- `git diff`
- `git log`
- `git commit` (strictly using exact paths per Rule 01, after Rule 02 gates pass)
- `git checkout` / `git switch` (within the authorized branch scope)

---

## Good / Bad

- ✅ Creating a clean local commit: `git commit -m "feat(filter): implement dynamic budget range slider"` and reporting "Task closed locally; ready for your push."
- ❌ Running `git push origin main` because "it's just a documentation update".
- ❌ Running `git push` assuming the user forgot to run it.

---

## Enforcement

Every work report must conclude with:
> **Push Status**: none (local commits: <commit hashes ready for human push>).  
Any attempt or action by an automated agent to push to remote constitutes an immediate critical violation.
