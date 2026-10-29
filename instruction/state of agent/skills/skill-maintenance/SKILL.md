# Skill: Skill Maintenance (Self-Improvement & Evolution Loop)

Global authority for how the RMDU Mobiles agent instructions and skills evolve from hands-on development experience.

---

## The Improvement Protocol (Proposal → Approval → Versioned Edit)

1. **Discovery of Precedent**:
   - During any development or auditing session, when a reusable lesson emerges (e.g. an unexpected comparison table overflow on mobile, a new budget range edge case, a refined accessibility pattern), draft a skill patch proposal.
   - Format:
     - **Context & Scenario**: What screen or workflow caused the issue.
     - **Observed Behavior**: What failed or drifted.
     - **Target Skill**: Exact skill document to update.
     - **Proposed Patch Text**: Precise markdown text addition or rule clarification.
2. **Human Approval Required**:
   - **NEVER apply skill edits silently or autonomously mid-task.**
   - Present the proposal to the human engineer (**Meet Rabadiya**) for review.
3. **Execution on Approval**:
   - Upon explicit approval, apply the patch, record the change in the skill document's `## Changelog` with date and reason, and reference the update in `tasks.json`.
4. **Rejection Safeguard**:
   - If a proposal is rejected or modified, document the rationale to prevent future agents from re-proposing the same pattern.

---

## Good / Bad

- ✅ Proposing: "Update `responsive-system` with a sticky first-column invariant for the comparison table after observing spec label clipping on mobile."
- ❌ Silently rewriting a rule file during a bug fix without developer consent.
- ✅ Adding a versioned changelog entry when an approved skill patch lands.
- ❌ Deleting verification requirements because a test failed.
