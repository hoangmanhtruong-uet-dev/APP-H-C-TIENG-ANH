# PHASE 5 — COMPLETION REPORT

**Status:** `PHASE 5 COMPLETE`  
**Date:** 2026-07-16  
**Scope:** Exercise Engine, Vocabulary & Grammar Foundation  
**Phase 6:** Not started

## 1. Executive status

Phase 5 implementation, local verification, remote schema/data migrations, parity/lint/types, application flows and browser ownership checks are complete. The missing remote foundation content found by the first database-owner verifier was corrected through a new data migration. The final database-owner verifier connected successfully and reported planned 24, ran 24, failed 0, PASS. Phase 5 therefore meets its Definition of Done.

## 2. Scope delivered

- Shared exercise engine for `single_choice`, `multiple_choice`, `true_false` and exact-match `short_text`.
- Draft save/resume, optimistic revision, idempotent submit, deterministic database scoring, result review and attempt history.
- Database-backed Vocabulary and Grammar catalog/detail pages with small original seed content.
- No Reading/Listening engine, AI scoring, Writing/Speaking, mock test, SRS, mistakes aggregation or admin CMS.

## 3. Repository and migration discipline

- Phase 4 migrations were not edited.
- Phase 5 schema is isolated in `20260716143000_phase_5_exercise_vocabulary_grammar.sql`.
- Required foundation content is isolated in the new data migration `20260716153000_phase_5_foundation_content.sql`; the applied schema migration was not modified.
- No local or remote reset/delete was performed against the linked project.
- Remote history is synchronized at 5/5 migrations, including `20260716153000_phase_5_foundation_content.sql`.

## 4. Exercise schema

Implemented `exercise_sets`, `exercise_set_versions`, `exercise_questions` and `exercise_options` with canonical lifecycle/type constraints, stable slugs, ordering, FKs and publication validation.

## 5. Published content versioning

Attempts pin an immutable `exercise_set_version_id`. Published questions/options/keys cannot be changed or deleted; content correction requires a new version so historical scoring remains reproducible.

## 6. Hidden answer boundary

Correct answer metadata is stored in `private.exercise_answer_keys`, `private.exercise_correct_options` and `private.exercise_correct_text_answers`. Learner roles receive no direct access; public question/option reads do not expose answer flags.

## 7. Attempt schema

Implemented `learner_attempts`, `learner_answers` and `learner_answer_options`. Ownership, question/version membership, option/question membership, status/timestamp invariants and answer-mode constraints are enforced in PostgreSQL.

## 8. Actor and ownership integrity

RPCs derive the actor from `auth.uid()`. Client payloads do not provide `user_id` or `owner_id`. Attempts/answers are owner-only through RLS and cross-user result access was denied in Playwright.

## 9. Save and resume integrity

Draft answers persist in PostgreSQL. Save validates question type and membership, rejects invalid/duplicate options and uses expected revision to reject stale writes. Submitted attempts are immutable.

## 10. Deterministic scoring

`submit_exercise_attempt` locks the attempt and reads private keys for the pinned published version. Choice/true-false use exact key membership, multiple-choice is all-or-nothing and short text uses trim/collapsed whitespace/case-folded exact match.

## 11. Idempotent submit

Replaying submit returns the already submitted server result without rescoring from client state. Score, possible points, completion and timestamps are database-derived.

## 12. Result disclosure

`get_exercise_attempt_result` requires owner and submitted status. Answer/review data is unavailable before submit; explanations are returned only through the post-submit result contract.

## 13. Vocabulary foundation

Implemented stable entries and immutable versions with term, part of speech, Vietnamese definition, original example, topic/tags, difficulty and lifecycle. Seed contains 8 original entries, not a bulk copyrighted dictionary import. This foundation is shared by Academic and General Training learners.

## 14. Grammar foundation

Implemented stable topics and immutable versions with title, Markdown explanation, examples, common mistakes, difficulty and related exercise set. Seed contains 3 original topics; raw HTML remains disabled. This foundation is shared by Academic and General Training learners.

## 15. Seed strategy

Seed uses stable UUIDs/slugs and contains 2 published exercise sets, 1 draft set, 8 questions covering all four implemented types, 8 vocabulary entries and 3 grammar topics. Protected child inserts use `WHERE NOT EXISTS`, because `ON CONFLICT DO NOTHING` still fired the before-insert immutability trigger after publication. The final seed rerun produced zero writes and retained the same fingerprint. No auth user, progress, credential or fake scoring result is seeded.

## 16. RLS and grants

RLS is enabled on all public Phase 5 tables. `anon` cannot read private attempts or draft content. `authenticated` can read only accessible published content and owned attempt data; direct table mutation is revoked. Security-definer RPCs use an empty `search_path`, schema-qualified objects and restricted execute grants.

## 17. Server contracts

Server Actions validate Zod payloads and call the database under the session JWT. The application does not use a browser or server service-role key. Raw PostgreSQL errors are not rendered to learners.

## 18. Routes delivered

- `/learn/vocabulary` and `/learn/vocabulary/[slug]`
- `/learn/grammar` and `/learn/grammar/[slug]`
- `/practice/[exerciseSlug]`
- `/practice/[exerciseSlug]/result/[attemptId]`
- Attempt history integrated into `/progress`

`/progress/mistakes` is intentionally deferred because full error-notebook aggregation is outside Phase 5.

## 19. UX behavior

The runner preserves database question order, shows current progress, saves per question, resumes after refresh, requires confirmation before final submit and exposes pending/error states. Result view reports database score and per-question review.

## 20. Local database verification

- Phase 5 main pgTAP: **64/64 PASS**.
- Phase 5 remote verifier executed against local DB: **24/24 PASS**.
- Full local database suite: **7 files, 284 tests, 0 failed**.
- Local database lint: no schema errors.

## 21. Remote database verification

- Schema migration `20260716143000` and foundation data migration `20260716153000` pushed successfully without remote reset/delete.
- Local/remote migration history: **5/5 synchronized**.
- Remote database lint: no schema errors.
- Remote-generated database types completed and are committed in `src/types/database.ts`.
- Remote content now matches local: 3 sets, 2 published + 1 draft versions, 8 questions, 18 options, 8 published vocabulary versions and 3 published grammar versions.
- Local/remote content fingerprint: `c3c7af314caa350a74994e28378a550f`.
- Database-owner verifier: **planned 24, ran 24, failed 0, PASS**; its transaction rolled back test fixtures.
- Known non-fatal pg-delta certificate cache warning remains tracked as `KI-068`.

## 22. Remote pgTAP root cause and closure

The database-owner verifier connected without auth/permission errors but initially found every Phase 5 content count at zero. Assertions 6–9 and 13 failed, then `start_exercise_attempt('academic-vocabulary-foundations', 'phase5-remote-a-1')` raised `exercise not found`; 15 of 24 tests ran. Read-only diagnostics confirmed local content was complete while remote content was empty. The RPC correctly treats the first argument as a stable exercise-set slug and the second as an idempotency key; no RPC migration was needed.

- Assertion 6 expected 2 published exercise versions; remote had 0.
- Assertion 7 expected 1 draft exercise version; remote had 0.
- Assertion 8 expected 8 published vocabulary versions; remote had 0.
- Assertion 9 expected 3 published grammar versions; remote had 0.
- Assertion 13 expected the completed learner to see 2 published sets; remote had 0 base rows, so this was missing content rather than an RLS denial.

The deployment gap was fixed with data migration `20260716153000`. The original seed was also made truly idempotent around protected child tables. Remote diagnostics match local exactly, and the final owner verifier reported planned 24, ran 24, failed 0, PASS. `KI-075` is closed. No grant was widened and RLS was not disabled.

## 23. Generated types

Types were regenerated from the linked remote schema after the migration. The remote PostgREST metadata version is retained; application typecheck passes against the generated definitions.

## 24. Unit and component tests

Fresh final run: **21 test files, 82 tests, 0 failed**. Coverage includes validation schemas, question navigation, submit confirmation, answer payloads, result rendering and protected route classification.

## 25. Application quality gates

- `npm run format:check`: PASS.
- `npm run lint`: PASS with zero warnings.
- `npm run typecheck`: PASS.
- `npm test`: PASS, 82/82.
- `npm run build`: PASS with all Phase 5 routes compiled.
- `npm audit --audit-level=high`: PASS, 0 vulnerabilities.

## 26. Browser and ownership verification

Authenticated Playwright using two local public-signup learners passed: published content visible, draft route unavailable, start/save/refresh/resume, all four question types, deterministic 5/5 submit, persisted `/progress` history and denial of User B access to User A result.

The final credential-free rerun exited successfully with **44 passed and 12 skipped**. Skips were reported explicitly for authenticated cases because dedicated credentials were not retained in the final shell; they are not presented as new passes. Phase 5 authenticated evidence comes from the earlier passing two-user local run. The desktop project owns persisted mutation; duplicate mobile-project mutation cases are intentionally skipped.

## 27. Responsive and accessibility verification

The browser matrix passed at 375, 768, 1024 and 1440 px for Vocabulary, Grammar, Practice and Progress pages. Checks cover horizontal overflow, visible headings and keyboard-focusable links. Full production assistive-technology certification remains a release-level activity, not claimed here.

## 28. Secrets and Git hygiene

`.env.local`, CLI login material, database password and temporary credentials are not Git tracked. `.env.example` contains names and empty placeholders only. The E2E provisioning path uses the public anon client and email confirmation, never a service-role key.

## 29. Documentation updated

Updated `README.md`, `ARCHITECTURE.md`, `DATABASE_SCHEMA.md`, `API_SPEC.md`, `TASKS.md`, `SECURITY_CHECKLIST.md` and `KNOWN_ISSUES.md`. `KI-075` is closed with the final database-owner verifier evidence.

## 30. Definition of Done and phase boundary

All Phase 5 functional, database, security, ownership, migration, content, application and verification requirements are evidenced. Therefore the final status is:

**PHASE 5 COMPLETE**

The database password was entered hidden for the owner verifier and was neither stored nor sent in chat. Phase 6 has not been started and is outside this completion action.
