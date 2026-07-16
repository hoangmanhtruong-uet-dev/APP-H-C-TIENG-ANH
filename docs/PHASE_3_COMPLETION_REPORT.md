# PHASE 3 — COMPLETION REPORT

Trạng thái: **PHASE 3 COMPLETE** ngày 2026-07-16, với authenticated Playwright cases được skip công khai do chưa cấp dedicated credentials. Không tuyên bố production-ready và không triển khai Phase 4.

## 1. Executive summary

Đã triển khai IELTS learner onboarding thật: wizard 8 bước, lưu từng bước vào PostgreSQL, resume từ database, completion server/database-controlled, server route gating, dashboard dùng dữ liệu thật và profile cho phép sửa preferences. Migration đã apply lên project `xxpakqsbltoezicapyti`; local/remote history đồng bộ.

## 2. Phase 2 prerequisite verification

- Phase 2 migration, remote history, RLS, auth/profile flow và manual Gmail flow đã PASS trước khi code.
- Branch `main`, baseline HEAD `31a6d08`; các docs Phase 2 đang dirty được giữ nguyên.
- Không sửa migration Phase 2, không reset remote, không dùng service-role.

## 3. Initial audit

Audit xác nhận chưa có onboarding code/schema; `profiles` chỉ là account identity. Proxy chỉ coarse-auth, protected layout xác minh account server-side. Xung đột docs: roadmap cũ gộp onboarding completion với plan generation, trong khi Phase 3 cấm tạo plan; quyết định tách personalization foundation và giữ plan/Today ở phase sau.

## 4. Product decisions

- Chọn bảng domain riêng `learner_profiles`, không mở rộng `profiles`.
- Lazy server-side upsert khi lưu bước đầu; existing/new verified users dùng cùng flow.
- Canonical lowercase text + CHECK constraints, không PostgreSQL enum/JSONB/reference-table thừa.
- `priority_skills` dùng constrained `text[]` vì tập tối đa bốn giá trị và query Phase 3 theo owner.
- Không tạo fake roadmap, progress, prediction hay recommendation.

## 5. Onboarding flow

| Step | Data | Validation | Persistence |
| --- | --- | --- | --- |
| 1 | Welcome | Không có input | Local navigation only |
| 2 | IELTS test type | Academic/General Training | Upsert + step 3 |
| 3 | Current band/unknown | null hoặc 0-9, bước 0.5 | Upsert + step 4 |
| 4 | Target band + primary goal | Band/goal allowlist | Upsert + step 5 |
| 5 | Exam date/no date | null hoặc ISO date không quá khứ | Upsert + step 6 |
| 6 | Minutes/day + days/week | Duration allowlist; integer 1-7 | Upsert + step 7 |
| 7 | Priority skills | Unique subset, tối thiểu một | Upsert + step 8 |
| 8 | Review/complete | Full-row Zod + database validation | Hardened RPC + redirect |

## 6. Database migration

| Migration | Local | Remote | Verified |
| --- | --- | --- | --- |
| `20260716040212_phase_3_learner_onboarding.sql` | PASS | Applied | History match, dry-run up to date, lint clean, TAP PASS |

## 7. Database objects

| Object | Purpose |
| --- | --- |
| `public.learner_profiles` | One-to-one onboarding draft/preferences |
| `set_learner_profiles_updated_at` | Database-owned `updated_at` |
| `validate_learner_exam_date()` + trigger | Timezone-safe no-past-date invariant |
| `complete_learner_onboarding()` | Actor-owned, locked, validated, idempotent completion |
| Three RLS policies | SELECT/INSERT/UPDATE own row only |

## 8. Schema

| Column | Type | Nullable | Constraint |
| --- | --- | --- | --- |
| `user_id` | uuid PK/FK | no | `profiles(id)` cascade |
| `test_type` | text | draft yes | two-value allowlist |
| `current_band` | numeric(2,1) | yes | 0-9, half-band |
| `target_band` | numeric(2,1) | draft yes | 0-9, half-band; required complete |
| `target_exam_date` | date | yes | no past date on write |
| `daily_study_minutes` | smallint | draft yes | 15/30/45/60/90/120 |
| `study_days_per_week` | smallint | draft yes | 1-7 |
| `priority_skills` | text[] | no | allowed + unique; required complete |
| `primary_goal` | text | draft yes | seven-value allowlist |
| `onboarding_step` | smallint | no | 1-8 |
| `onboarding_completed_at` | timestamptz | yes | RPC-controlled |
| timestamps | timestamptz | no | DB defaults/trigger |

## 9. RLS matrix

| Actor | Operation | Own row | Other row | Result |
| --- | --- | --- | --- | --- |
| authenticated | SELECT | allowed | hidden | PASS |
| authenticated | INSERT | allowed | denied | PASS |
| authenticated | UPDATE | allowed | unchanged/denied | PASS |
| authenticated | DELETE | denied | denied | PASS |
| anon | SELECT/INSERT/UPDATE/DELETE | denied | denied | PASS |

## 10. Route gating

| User state | Route | Result |
| --- | --- | --- |
| Anonymous | Any protected route including `/onboarding` | `/login?next=...` |
| Authenticated, incomplete | `/dashboard`, `/learn`, `/roadmap`, `/progress` | `/onboarding` |
| Authenticated, incomplete | `/profile`, `/settings` | Allowed for recovery/logout |
| Authenticated, complete | `/onboarding` | `/dashboard` |
| Authenticated, complete | Learning routes | Allowed |

## 11. Server Actions

| Action | Input | Authorization | Result |
| --- | --- | --- | --- |
| `saveOnboardingStepAction` | Step-scoped allowlist | Session actor; no client user id | Persist + next step |
| `completeOnboardingAction` | No completion flag/id | Session + full row; RPC `auth.uid()` | Complete + dashboard redirect |
| `updateLearnerPreferencesAction` | Explicit preferences map | Session + completed own row | Persist + revalidate |

## 12. Validation

UI controls, shared Zod schemas, database CHECK constraints and triggers enforce canonical values. Tests cover invalid type/goal, band 5.3, range, date past, unsupported minutes, days 0/8, invalid/duplicate skills, incomplete completion and duplicate row.

## 13. Resume behavior

`onboarding_step` and all submitted values persist after each successful step. Page reload/login reads database state; local component state is only transient UX and localStorage/query strings are not source of truth.

## 14. Completion behavior

Action authenticates actor, reads and Zod-validates the full row, then RPC locks the actor row, revalidates required fields/date and idempotently sets the first completion timestamp. Browser cannot write/clear the timestamp.

## 15. Dashboard integration

Dashboard renders real test type, target/current band, goal, exam date, schedule and priority skills. Today/roadmap remain honest empty states; no fake plan/progress.

## 16. Profile/settings integration

`/profile` renders persisted preferences after completion and allows explicit-field updates. It states that preference changes do not regenerate a roadmap. `/settings` remains accessible but no duplicate editor was added.

## 17. Routes

| Route | Access | Status |
| --- | --- | --- |
| `/onboarding` | Authenticated pending only | Implemented |
| `/dashboard` | Authenticated completed | Integrated |
| `/learn`, `/roadmap`, `/progress` | Authenticated completed | Guarded |
| `/profile` | Authenticated | Preference viewer/editor |
| `/settings` | Authenticated | Existing, unchanged business scope |

## 18. Files created

| File/group | Purpose |
| --- | --- |
| `supabase/migrations/20260716040212_phase_3_learner_onboarding.sql` | Phase 3 schema/security |
| `supabase/tests/database/phase_3_learner_onboarding.test.sql` | 44 pgTAP contract tests |
| `supabase/tests/remote/phase_3_learner_onboarding_remote.test.sql` | Transactional remote wrapper |
| `src/app/onboarding/*` | Protected onboarding route/layout |
| `src/components/onboarding/*` | Wizard + behavior tests |
| `src/features/onboarding/*` | Constants, Zod, actions, tests |
| `src/server/onboarding/learner-profile.ts` | Request-scoped reads/guards |
| `src/components/profile/learning-preferences-form.tsx` | Preference editor |
| `src/lib/auth/routes.test.ts` | Route classification regression |

## 19. Files modified

| File/group | Change |
| --- | --- |
| `src/types/database.ts` | Remote-generated table/RPC types |
| Dashboard/learn/roadmap/progress/profile pages | Guard/data integration |
| `src/lib/auth/routes.ts` | Protect `/onboarding` |
| `tests/e2e/foundation.spec.ts` | Onboarding redirect/full conditional flow/resume/edit |
| `.env.example` | Empty dedicated onboarding E2E variables |
| README and required docs | Current implementation/contracts/security/issues |
| `.prettierignore` | Ignore Supabase CLI temp catalog |

## 20. Dependencies

| Package | Change | Reason |
| --- | --- | --- |
| None | No change | React, Zod, Supabase and existing UI primitives were sufficient |

## 21. Database verification

- Migration: PASS local/remote; history synchronized.
- Table/constraints/FK/updated_at/RLS/policies/grants: PASS.
- Existing/new user strategy: PASS through lazy upsert and FK fixtures.
- Duplicate prevention: PASS by PK.
- Types: generated/introspected from linked remote; table/FK/RPC present.

## 22. RLS verification

- Own SELECT/UPDATE: PASS remote.
- Other SELECT/UPDATE: hidden/no change remote.
- Anonymous SELECT/INSERT: direct denial PASS remote.
- Anonymous UPDATE/DELETE: no remote grant verified; direct operation assertions PASS local.
- Authenticated DELETE/direct completion update: denied PASS remote.

## 23. Verification commands

- `npm.cmd run format:check`: PASS.
- `npm.cmd run lint`: PASS, 0 warnings.
- `npm.cmd run typecheck`: PASS.
- `npm.cmd run test`: PASS, 38/38.
- `npm.cmd run build`: PASS, `/onboarding` dynamic route emitted.
- `npm.cmd audit`: PASS, 0 vulnerabilities.
- `npm.cmd run test:e2e`: PASS, 40 passed/6 conditional skips.
- `npx.cmd supabase test db`: PASS, 130 assertions across four files.
- Database lint local/remote: PASS, no schema errors.
- Remote Phase 3 verifier: PASS, 42 assertions/rollback.
- Remote dry-run: PASS, database up to date.

## 24. Responsive

Chromium visual route kiểm tra 375/768/1024/1440: no horizontal overflow, zero console errors, step/progress state đúng. Public/auth E2E cũng PASS ở bốn widths. Visual route tạm đã xóa trước final verification.

## 25. Accessibility

Semantic forms, fieldsets/legends, labels, progressbar values, heading focus, `aria-describedby`, live regions, pending labels, keyboard-native controls, 44px touch targets, focus-visible and reduced-motion baseline đã review. Component tests cover navigation, error focus, resume and review.

## 26. Security review

PASS: no service role, no client user id/completion flag, no mass assignment, no raw SQL errors, no RLS disable/`USING (true)`, no shared private cache, no secret tracked. Column grants exclude completion/timestamps; RPC/trigger functions harden `search_path` and privileges.

## 27. Remaining issues

- Authenticated onboarding Playwright needs a dedicated verified account.
- General Training preference exists before corresponding content.
- Supabase CLI `pg-delta` emitted a post-push cache warning; history/lint/schema/direct tests independently PASS.
- Up to two test signup attempts may have reached remote because a visual test initially reused a remote-bound Next process/build; no deletion was attempted per scope (`KI-071`).

## 28. Tests skipped

Six Playwright entries: provider invalid-login, real auth/profile/logout, and real onboarding flow each skip in desktop/mobile conditions when credentials/project do not apply. Skip is explicit; no pass was fabricated.

## 29. Technical debt

- Add isolated test environment and repeatable verified onboarding account lifecycle.
- Consider optimistic concurrency/revision field only when multi-device edit evidence requires it.
- Placement/plan domain should not reuse completion timestamp as plan existence.

## 30. Scope intentionally not implemented

Placement test, roadmap/plan generation, Today tasks, practice/scoring, AI, content/CMS, roles/RBAC, consent, OAuth/MFA, storage, queue/worker, payment, gamification and analytics remain out of scope.

## 31. Phase 4 recommendation

Trước Phase 4, provision an isolated E2E project/account, resolve `KI-071`, then design placement/roadmap contracts from `learner_profiles`. Không triển khai Phase 4 trong change này.
