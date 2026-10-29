# Rule 05 — Branch Hygiene: Single Shared Branch (inviolable)

One single shared branch is utilized for all RMDU Mobiles platform development: **`main`**.

No per-feature, per-screen, or experimental offshoot branches are created unless explicitly commanded by the developer. This guarantees a clean, linear, and completely traceable git history across human and agent sessions.

---

## Protocol

1. **Branch Exclusivity**:
   - All website platform work commits directly to `main`.
2. **Pre-Flight Sync**:
   - Before modifying code, verify local `HEAD` matches `tasks.json#session.tip`.
   - If divergent, reconcile state cleanly before initiating new work.
3. **Zero Force-Pushes**:
   - **NEVER** run `git push --force` or `--force-with-lease`. Force-pushing overwrites collaborative work and strands commits.
4. **Conflict Resolution Discipline**:
   - Never leave or commit merge conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`).
   - If conflicts arise, resolve them deliberately, re-run all verification gates, and commit the resolution using exact paths per Rule 01.
5. **Human Release Authority**:
   - Remote pushes are performed exclusively by the human engineer (Rule 03).

---

## Good / Bad

- ✅ Syncing with `session.tip`, implementing the side-by-side comparison feature, verifying gates, committing exact paths, and notifying the human.
- ❌ Creating arbitrary sub-branches like `feat/new-header-experiment` that fragment repository state.
- ❌ Force-pushing to "clean up" commit history.

---

## Enforcement

Every work report must confirm:
> **Branch**: `main` | `HEAD == session.tip` verified | zero force-push.
