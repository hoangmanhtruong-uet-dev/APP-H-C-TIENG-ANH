# Phase 9 Speaking Practice — Completion Report

**Status:** PHASE 9 COMPLETE  
**Date:** 2026-07-17  
**Scope:** Speaking recording, private Storage, immutable attempt, optional STT and optional AI practice feedback only. Phase 10 and aggregate mock tests were not implemented.

## Outcome

The Phase 9 vertical slice is implemented through three new forward-only migrations. Existing Phase 1–8 migrations were not edited. All three migrations were applied to local and linked remote PostgreSQL without a remote reset and without deleting any real user, learner profile, attempt, submission, progress or audio object. A fresh final check on 2026-07-17 confirms migration parity 15/15 and clean local/remote database lint.

The direct remote database-owner verifier connected as `current_user postgres` and completed through `ok 24`: failed 0, no `not ok` and no `ERROR`. Its fixture transaction rolled back as designed. The database password was neither sent nor stored in chat. `KI-081` is closed and no Phase 9 Definition of Done blocker remains.

Routes under `/practice/speaking` implement catalog, start/resume, browser recording, database-issued private upload paths, server media verification, immutable submit, owner review and `/progress` history. A real Chromium MediaRecorder WebM flow passed through private Storage with two learner actors. The server verifies EBML/container signature, MIME, bytes, WebM cluster timestamps and SHA-256 before PostgreSQL accepts HMAC-signed metadata.

Optional STT/AI stays server-only and consented. Missing configuration returns an unavailable state and creates no transcript or feedback. Provider failure creates no synthetic output. Transcript-only feedback leaves pronunciation unscored and the interface explicitly says feedback is practice guidance, not an official IELTS score.

## Database and Storage

New migrations:

- `20260717160000_phase_9_speaking_practice_engine.sql`
- `20260717160500_phase_9_speaking_foundation_content.sql`
- `20260717161000_phase_9_speaking_optional_ai.sql`

The `speaking-recordings` bucket is private, limited to 15 MB and allows only WebM, MP4/M4A and MPEG audio. Browser upload uses the learner JWT and an exact PostgreSQL-issued path. The application does not use a service-role key. Every public Phase 9 table has RLS enabled and authenticated table grants are SELECT-only; mutation RPCs derive the actor from `auth.uid()`.

Submitted attempts/responses, validated transcript and feedback are immutable. The client cannot set owner, verified media metadata, transcript, feedback, estimate, status or submitted timestamp. The small seed has one original 4-prompt published set and one draft fixture hidden by RLS.

## Verification evidence

| Gate | Result |
| --- | --- |
| Final local migration apply | PASS, Phase 1–9 chain applied from scratch |
| Phase 9 local actor pgTAP | PASS, 33/33 |
| Full local database suite | PASS, 380/380 |
| Local database lint | PASS, no warning/error |
| Remote forward migration apply | PASS, exactly 3 Phase 9 migrations |
| Final migration parity | PASS, local/remote 15/15 |
| Remote database lint | PASS, no warning/error |
| Generated database types | PASS, regenerated from final local schema |
| Format / ESLint / TypeScript | PASS |
| Unit/component tests | PASS, 111/111 |
| Production build | PASS, all 3 Speaking routes in manifest |
| Dedicated Speaking Playwright | PASS, 2/2 |
| Full Playwright suite | PASS, 54 passed and 18 explicitly skipped by credential/project guards |
| Responsive matrix | PASS, 375/768/1024/1440 without horizontal overflow |
| Keyboard and axe audit | PASS, visible focus and zero axe violations in `#main-content` |
| Remote linked verifier catalog checks | PASS through checks 1–10; the linked role limitation was superseded by the direct owner run |
| Direct remote database-owner verifier | PASS, `current_user postgres`, `ok 1` through `ok 24`, failed 0, no `not ok`, no `ERROR`, rollback |
| Final blocker/KI review | PASS, `KI-081` CLOSED |

## Remote owner verification closure

The linked CLI verifier role could not access the `vault`, `storage` or `auth` schemas, so the earlier linked-role attempt stopped after the first 10 catalog/grant/RPC checks. That environment limitation was closed by running the verifier through a direct database-owner connection. The authoritative run used `current_user postgres`, completed all 24 checks with zero failures and rolled back its fixtures.

No password was displayed, sent or persisted in chat, and the rollback-only verifier did not retain fixture data. Fresh post-verifier checks again confirmed all 15 migrations match between local and remote and both database lint runs are clean.

## Final decision

**PHASE 9 COMPLETE.** Implementation, local actor/Storage tests, remote migration apply, fresh 15/15 parity, fresh local/remote lint, generated types, full quality gates, E2E, responsive/accessibility checks and the direct remote database-owner verifier 24/24 are green. `KI-081` is closed and no Phase 9 blocker remains. Phase 10 and full mock tests remain untouched.
