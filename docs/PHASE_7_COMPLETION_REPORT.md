# Phase 7 Listening Practice Engine — Completion Report

Date: 2026-07-17  
Status: **PHASE 7 COMPLETE**  
Scope: Listening practice only. Phase 8, Writing, Speaking, AI and mock test were not implemented.

## Outcome

The Phase 7 Listening vertical slice is implemented and applied to local and linked remote PostgreSQL through two new forward migrations. Existing Phase 1–6 migrations were not edited. Remote migration apply did not reset the database and did not delete users, learner profiles, attempts, answers or progress.

The direct remote database-owner verifier has now passed all 34 assertions. It ran through `ok 34` with failed 0, no `not ok`, no `ERROR`, and its transaction rolled back as designed. The database password was neither sent nor stored in chat. No Phase 7 Definition of Done blocker remains.

## Delivered

- Versioned Listening audio metadata with controlled public path, WAV MIME, declared duration, SHA-256 checksum, source and licence.
- Listening practice mapping with learner test type and database-owned time limit.
- Ordered Listening parts with validated audio ranges and question linkage.
- Private transcript table without learner SELECT grants.
- Published snapshot immutability and publication validation for audio, transcript, parts, questions and answer configuration.
- Test-type-aware RLS for published audio metadata, mappings and parts; draft and incompatible content remain invisible.
- Generic `learner_attempts.time_limit_seconds`, retaining the Phase 6 Reading field for backward compatibility.
- Shared start/save/submit engine with server-owned actor, timestamps, score and correctness.
- Dedicated owner-scoped Listening clock and post-submit result/transcript RPCs.
- Catalog, start screen, native HTML audio player, runner, autosave/resume, conflict state, late-submit message, atomic submit, result review, transcript and progress-history integration.
- One original 108-second project-generated WAV, 2 parts, 8 questions and 3 implemented types: `single_choice`, `multiple_choice`, `short_text`.
- One unpublished fixture without a shipped public audio binary for RLS leakage verification.

## Security invariants verified locally

- Actor comes from `auth.uid()`; the client cannot supply `user_id`.
- Score, correctness, `submitted_at`, deadline and late status are PostgreSQL-derived.
- Answer keys and transcripts cannot be selected directly by learners or anonymous users.
- Transcript/result RPC rejects access before submit and rejects non-owners.
- Autosave uses monotonic client revision; identical replay is safe and a conflicting stale payload raises `40001`.
- Submit locks the attempt, scores from the pinned private snapshot, is atomic/idempotent and freezes submitted answers.
- Academic-only content is denied to a General Training actor.
- Published content is immutable; draft content is hidden.
- Application code contains no service-role key and RLS remains enabled.

## Database evidence

- Local migration reset: PASS; all 9 migrations applied from an empty local database.
- Local full pgTAP: PASS, 11 files, **465 tests**, failed 0.
- Phase 7 local actor test: PASS, including Academic actor A, actor B, General Training actor and anonymous role.
- Local Phase 7 remote-style verifier: PASS, planned 34, ran 34, failed 0, transaction rollback.
- Local database lint: PASS, no schema errors.
- Remote dry-run: exactly the 2 Phase 7 migrations.
- Remote apply: PASS for `20260717100000` and `20260717101500`; no reset.
- Final migration parity: PASS, **9/9** local and remote.
- Remote database lint: PASS, no schema errors.
- Direct remote database-owner verifier: PASS, planned 34, ran through `ok 34`, failed 0, no `not ok`, no `ERROR`, transaction rollback.
- Generated TypeScript database types: refreshed from applied local schema.

Supabase CLI emitted an accepted pg-delta catalog-cache warning after the successful remote apply because a temporary CA file was absent. Fresh migration parity and remote lint both connected afterward and passed, confirming the migration history and schema are available.

## Application quality evidence

- `npm.cmd run format:check`: PASS.
- `npm.cmd run lint`: PASS, zero warnings.
- `npm.cmd run typecheck`: PASS.
- `npm.cmd test`: PASS, **27 files / 98 tests**.
- `npm.cmd run build`: PASS; Listening catalog, runner and result routes are in the production route manifest.
- Full Playwright: PASS, **50 passed / 14 declared conditional skips**.
- Listening authenticated flow: PASS with two local actors created through public signup, Mailpit confirmation and user-session RLS; no service role.
- Listening browser coverage: published/draft visibility, controlled audio path, autosave, refresh/resume, database clock, pre-submit transcript absence, submit/result/transcript, progress history and cross-user denial.
- Responsive matrix: PASS at 375, 768, 1024 and 1440 pixels with no horizontal overflow.
- Accessibility checks: semantic audio controls, fieldset/legend and labels, visible focus, keyboard question navigation, status/alert live regions, non-color answered/correctness state and heading hierarchy verified by component tests and Playwright.

## Original audio evidence

- Path: `public/audio/listening/community-library-visit.wav`
- Declared/parsed duration: 108 seconds.
- SHA-256: `c1ddac5f8cf92cb9e869f6ae4a93fcf04a08cce5d3df0a61b9caf0269097d0a5`.
- Provenance: original project-authored script and locally generated speech audio.
- Reproducible generator: `scripts/generate-listening-demo-audio.ps1`.
- No IELTS exam, commercial preparation material or copyrighted IELTS audio was copied.

## Remote verifier sign-off

`KI-079` is closed. The following verifier was run through a direct remote database-owner session with the password kept outside chat:

```text
supabase/tests/remote/phase_7_listening_practice_engine_remote.test.sql
```

Recorded evidence: ran through `ok 34`; failed 0; no `not ok`; no `ERROR`; final transaction rollback. The database password was neither sent nor stored in chat.

## Final decision

**PHASE 7 COMPLETE.** Implementation, local verification, remote migration parity 9/9, remote lint and the direct remote owner verifier 34/34 are green. Phase 8 was not started.
