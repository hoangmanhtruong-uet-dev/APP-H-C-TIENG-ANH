# Phase 8 Writing Practice Engine — Completion Report

**Status:** PHASE 8 COMPLETE  
**Date:** 2026-07-17  
**Scope:** Academic Writing Task 2 and optional AI feedback foundation only. Phase 9, Speaking, recording, STT and mock tests were not implemented.

## Outcome

The Phase 8 vertical slice is implemented and applied to local and linked remote PostgreSQL through three new forward migrations. Existing Phase 1–7 migrations were not edited. Remote apply did not reset the database and did not delete users, learner profiles, attempts, submissions or progress.

The direct remote database-owner verifier has now passed all 40 assertions. It ran through `ok 40` with failed 0, no `not ok`, no `ERROR`, and its transaction rolled back as designed. The database password was neither sent nor stored in chat. Final migration parity remains 12/12, and fresh local/remote database lint is clean.

Catalog, start/resume, PostgreSQL autosave with conflict handling, server-derived timer, atomic/idempotent submit, immutable submitted essay, owner review and `/progress` history are implemented. Learners cannot read draft/unpublished or incompatible Writing tasks.

Optional AI feedback is server-only and fail-closed. It uses the official OpenAI Responses API with Structured Outputs, moderation and timeout when configured. Final feedback requires an HMAC signature whose secret is also held in Supabase Vault; PostgreSQL validates schema, half-band values and exact essay evidence. No service-role key is used by the application, raw provider responses are not stored, and the UI never calls the estimate an official IELTS score.

## Database and RLS

New migrations:

- `20260717130000_phase_8_writing_practice_engine.sql`
- `20260717131500_phase_8_writing_foundation_content.sql`
- `20260717132000_phase_8_writing_pinned_task_access.sql`

New tables are `writing_tasks`, `writing_task_versions`, `writing_submissions`, `writing_feedback_runs` and `writing_feedback`. All public Phase 8 tables have RLS enabled. Authenticated users have SELECT-only table grants; mutations use owner-scoped hardened RPCs deriving the actor from `auth.uid()`.

The database derives revision, word count, deadline, submitted timestamp, checksum, late state, feedback status and validated band fields. Submitted essays and validated feedback are immutable. AI request quota is 5 per rolling 7 days, burst is 2 per minute, and each submission has at most 2 attempts.

## Content and application

- One original published Academic Task 2: `community-green-spaces`.
- One unpublished fixture: `flexible-library-hours`, hidden from learners.
- Routes: catalog, editor and submitted review under `/practice/writing`.
- Editor: 800 ms autosave, manual save, optimistic revision conflict state, local unsaved-change warning and database-confirmed word count.
- Review: immutable essay, pinned prompt, optional versioned AI consent, safe unavailable/error state and structured feedback display.
- Writing submissions appear in `/progress` without a fake deterministic score.

## Verification evidence

| Gate | Result |
| --- | --- |
| Phase 8 local actor pgTAP | PASS, 39/39 |
| Local owner-style verifier | PASS, `ok 1` through `ok 40`, rollback |
| Full local database suite | PASS, 544/544 |
| Local database lint | PASS, no schema errors |
| Remote migration apply | PASS, exactly 3 Phase 8 migrations, forward-only |
| Final migration parity | PASS, local/remote 12/12 |
| Remote database lint | PASS, no schema errors |
| Format/lint/typecheck | PASS |
| Unit/component tests | PASS, 104/104 |
| Production build | PASS, all 3 Writing routes in manifest |
| Full practice Playwright | PASS, 8/8 with two real local actors |
| Writing browser checks | PASS, 2/2; owner isolation, 375/768/1024/1440, keyboard |
| Axe accessibility audit | PASS, zero violations in `#main-content` after nested landmark fix |
| Direct remote database-owner verifier | PASS, `ok 1` through `ok 40`, failed 0, no `not ok`, no `ERROR`, rollback |

The initial all-project Playwright run also reported 44 pass and 24 declared skips because dedicated authenticated credentials were absent from that shell. The required full practice suite was then run against local Supabase using two dedicated confirmed actors and passed 8/8. No remote user was created, changed or deleted for E2E.

## Remote owner verification closure

`KI-080` is closed. `supabase/tests/remote/phase_8_writing_practice_engine_remote.test.sql` ran through a direct remote database-owner session to `ok 40`, failed 0, with no `not ok` and no `ERROR`. The fixture transaction rolled back, and the database password remained hidden and was not sent or stored in chat.

The earlier linked-role attempt remains useful negative evidence: it stopped before the TAP plan because the non-owner role cannot access Vault and changed no data. The successful database-owner run is the authoritative completion evidence.

## Final decision

**PHASE 8 COMPLETE.** Implementation, local verification, remote migration apply, final parity 12/12, fresh local/remote lint and the direct remote database-owner verifier 40/40 are green. No Phase 8 blocker remains. Phase 9 was not implemented.
