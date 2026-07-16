# PHASE 4 — COMPLETION REPORT

Trạng thái: **PHASE 4 COMPLETE** ngày 2026-07-16. Implementation, migration local/remote, seed, local database verification, remote Phase 4 pgTAP 66/66, application quality gates và anonymous E2E đã hoàn tất. Tám authenticated Playwright cases vẫn SKIPPED công khai do chưa có dedicated credentials/project-ref confirmation; không case nào được ghi sai thành PASS.

## 1. Executive summary

Phase 4 đã đưa content/progress từ placeholder sang PostgreSQL thật: catalog module, published lesson versions, safe Markdown sections, resume, section completion, deterministic next lesson, dashboard và progress aggregates. Database không cho learner ghi content hoặc ghi trực tiếp calculated progress. Remote verifier dùng trực tiếp file test chính, pass 66/66 và rollback fixture. Không triển khai Phase 5.

## 2. Phase 1–3 prerequisite verification

- Branch `main`; initial HEAD và `origin/main`: `b5df439 feat: implement IELTS learner onboarding foundation`.
- Initial worktree sạch; Phase 3 đã commit.
- Phase 2/3 migration local và remote đồng bộ trước khi bắt đầu.
- Auth/onboarding guards, unit tests, database tests và typecheck đều pass tại checkpoint.
- Supabase project ref trong `.env.local` khớp linked project `xxpakqsbltoezicapyti`.

## 3. Initial audit

`/learn`, `/progress` và dashboard trước Phase 4 chỉ là foundation/placeholder, chưa có content/progress schema hoặc seed. Existing E2E có anonymous/auth/onboarding coverage nhưng từng có rủi ro tái dùng dev process sai environment. CI đã chạy lint/typecheck/unit/build/E2E và được giữ nguyên nguyên tắc không push migration remote.

## 4. Product decisions

- Chọn progress option B: section evidence + lesson aggregate, vì resume và completion integrity cần bằng chứng thật.
- Lesson identity tách khỏi immutable lesson version để progress giữ snapshot ổn định.
- Draft/in-review không learner-readable; archived không ở catalog nhưng learner đã bắt đầu được đọc snapshot cũ.
- Optional section không chặn completion.
- Không public preview, admin/CMS, exercise engine, scoring, AI hoặc fake stats.
- Mâu thuẫn roadmap: `TASKS.md` cũ gọi roadmap Phase 4 là Reading/Listening practice. Slice này là execution Phase 4 lesson foundation; roadmap practice không được mark complete.
- Mâu thuẫn schema: docs cũ đề xuất generic `content_items/content_versions`; yêu cầu Phase 4 cần lesson relational model tối thiểu. Chọn module → lesson → version → section để không kéo question bank/admin vào scope.

## 5. Content architecture

`learning_modules` chứa catalog, `lessons` chứa stable slug/order, `lesson_versions` chứa snapshot publish, và `lesson_sections` chứa ordered Markdown. Published version/section được trigger bảo vệ khỏi update/delete. Learner đọc bằng Supabase session + RLS full parent chain.

## 6. Progress architecture

`learner_lesson_progress` lưu current snapshot/section/calculated percent. `learner_section_progress` lưu viewed/completed evidence. Client chỉ gửi lesson/section identifiers; RPC lấy actor từ session và tự tính status/percent/timestamps.

## 7. Database migration

| Migration | Local | Remote | Verified |
| --- | --- | --- | --- |
| `20260716100110_phase_4_learning_content_progress.sql` | APPLIED | APPLIED | History/schema/lint/types + remote pgTAP 66/66 PASS |

Migration được review trước apply, dry-run remote với `--include-seed` hiển thị đúng một migration và seed. Không sửa migration Phase 2/3, không reset/xóa remote data.

## 8. Database objects

| Object | Purpose |
| --- | --- |
| `learning_modules` | Catalog module và test-type classification |
| `lessons` | Stable lesson identity/order |
| `lesson_versions` | Immutable published/archive snapshot |
| `lesson_sections` | Ordered safe-Markdown content |
| `learner_lesson_progress` | Own resume/completion aggregate |
| `learner_section_progress` | Section-level evidence |
| `private.*_is_accessible` | Hardened RLS parent-chain helpers |
| `open_lesson_section` | Atomic start/resume/current section |
| `complete_lesson_section` | Atomic evidence + calculated completion |
| Protection/publication triggers | Immutability, required content, timestamps |

## 9. Content schema

| Table | Column | Type | Constraint |
| --- | --- | --- | --- |
| `learning_modules` | `id` | uuid | PK, generated |
| `learning_modules` | `slug` | text | unique, lower kebab, max 100 |
| `learning_modules` | `title`, `description` | text | nonblank, bounded |
| `learning_modules` | `skill` | text | canonical allowlist |
| `learning_modules` | `test_type` | text | academic/general_training/both |
| `learning_modules` | `difficulty` | text | beginner/intermediate/advanced |
| `learning_modules` | `display_order` | integer | 1–10000 |
| `learning_modules` | `status` | text | draft/in_review/published/archived |
| `learning_modules` | `estimated_minutes` | smallint | 1–600 |
| `learning_modules` | `published_at` | timestamptz | required for published/archived |
| `lessons` | `id` | uuid | PK |
| `lessons` | `module_id` | uuid | FK module, delete restrict |
| `lessons` | `slug` | text | unique per module, lower kebab |
| `lessons` | `display_order` | integer | unique per module, 1–10000 |
| `lesson_versions` | `id` | uuid | PK |
| `lesson_versions` | `lesson_id` | uuid | FK lesson, delete restrict |
| `lesson_versions` | `version` | integer | unique per lesson, 1–10000 |
| `lesson_versions` | `title`, `summary` | text | nonblank, bounded |
| `lesson_versions` | `difficulty` | text | canonical allowlist |
| `lesson_versions` | `estimated_minutes` | smallint | 1–240 |
| `lesson_versions` | `status` | text | lifecycle CHECK; one published/lesson |
| `lesson_versions` | `published_at`, `archived_at` | timestamptz | lifecycle consistency |
| `lesson_sections` | `id` | uuid | PK |
| `lesson_sections` | `lesson_version_id` | uuid | FK version, delete restrict |
| `lesson_sections` | `section_type` | text | text/example/checklist/tip/warning/summary |
| `lesson_sections` | `title` | text | nullable, nonblank when set |
| `lesson_sections` | `body_markdown` | text | nonblank, max 20,000 |
| `lesson_sections` | `display_order` | integer | unique per version |
| `lesson_sections` | `is_required` | boolean | default true |
| all content | `created_at`, `updated_at` | timestamptz | nonnull; updated trigger |

## 10. Progress schema

| Table | Column | Type | Constraint |
| --- | --- | --- | --- |
| `learner_lesson_progress` | `user_id`, `lesson_id` | uuid | composite PK; profile/lesson FK |
| `learner_lesson_progress` | `lesson_version_id` | uuid | composite FK ensures version belongs to lesson |
| `learner_lesson_progress` | `status` | text | in_progress/completed |
| `learner_lesson_progress` | `current_section_id` | uuid | composite FK ensures section belongs to version |
| `learner_lesson_progress` | `progress_percent` | numeric(5,2) | 0–100 + status invariant |
| `learner_lesson_progress` | `started_at`, `last_accessed_at`, `completed_at` | timestamptz | chronological/completion CHECK |
| `learner_section_progress` | `user_id`, `section_id` | uuid | composite PK |
| `learner_section_progress` | `lesson_id`, `lesson_version_id` | uuid | composite relationship FKs |
| `learner_section_progress` | `last_viewed_at`, `completed_at` | timestamptz | completion chronology |
| all progress | `created_at`, `updated_at` | timestamptz | nonnull; updated trigger |

## 11. Publication model

| Status | Catalog | Direct access | Progress behavior |
| --- | --- | --- | --- |
| draft | No | Denied by RLS | Cannot start |
| in_review | No | Denied by RLS | Cannot start |
| published | Yes, if test type matches | Allowed after onboarding | Start/resume/complete |
| archived | No | Only owned prior snapshot | Existing progress remains resumable |

## 12. Content RLS matrix

| Actor | Operation | Published | Draft | Result |
| --- | --- | --- | --- | --- |
| anon | SELECT | No privilege | No privilege | DENIED |
| authenticated complete-onboarding | SELECT | Allowed when test type/parent chain match | No row | ALLOWED/FILTERED |
| authenticated | INSERT/UPDATE/DELETE | No privilege | No privilege | DENIED |
| authenticated incomplete-onboarding | SELECT | No row | No row | DENIED/FILTERED |

## 13. Progress RLS matrix

| Actor | Operation | Own row | Other row | Result |
| --- | --- | --- | --- | --- |
| anon | SELECT/mutate | No | No | DENIED |
| authenticated | SELECT | Yes | No row | OWNER-ONLY |
| authenticated | direct INSERT/UPDATE/DELETE | No privilege | No privilege | DENIED |
| authenticated | RPC mutation | Actor from `auth.uid()` | Cannot target actor | OWNER-ONLY |

## 14. Completion integrity

`complete_lesson_section` validates actor, onboarding, module/lesson/version/section relationship and accessibility. It upserts section evidence, counts required sections from the snapshot, calculates percent, and alone sets completed state/timestamp. CHECK/composite FK stop invalid percentages and mismatched current sections. Repeated completion is idempotent.

## 15. Resume behavior

Reader selection order: valid `?section=displayOrder` → persisted current section → first incomplete section → first section. Open action persists location without accepting user ID. Refresh/reopen restores the stored snapshot and section.

## 16. Next lesson selection

Pure deterministic helper orders by module then lesson. Most recently accessed in-progress lesson wins for continue; otherwise first not-started lesson. Completed lessons are excluded. No AI recommendation or fake priority.

## 17. Seed content

| Module | Lessons | Status | Purpose |
| --- | --- | --- | --- |
| Nền tảng IELTS | 2 | Published, both test types | Core exam/band concepts and full learning flow |
| Nền tảng Reading | 2 published + 1 draft | Academic | Reading foundations and draft isolation |

Seed has 13 original sections (12 published, 1 draft), stable UUID/slug, no official IELTS passages, no user/progress fixture, and rerun inserts 0 duplicates.

## 18. Routes

| Route | Access | Data source | Status |
| --- | --- | --- | --- |
| `/learn` | Auth + onboarding complete | Published catalog + own progress | IMPLEMENTED |
| `/learn/[moduleSlug]` | Same + RLS/slug | Module/lessons + own progress | IMPLEMENTED |
| `/learn/[moduleSlug]/[lessonSlug]` | Same + snapshot access | Version/sections/progress/RPC | IMPLEMENTED |
| `/dashboard` | Auth + onboarding complete | Learner profile + learning overview | UPDATED |
| `/progress` | Auth + onboarding complete | Real module/lesson aggregates | UPDATED |

## 19. Dashboard integration

Dashboard shows continue/next lesson, real available/completed/overall counts and a clear non-AI explanation. No mock task, streak, XP or fabricated completion.

## 20. Progress-page integration

`/progress` shows available/completed/in-progress totals, averaged section-derived percent, per-module progress and up to five recent lessons from `last_accessed_at`. Empty states explicitly avoid demo stats.

## 21. Server Actions / RPC

| Action | Authorization | Validation | Result |
| --- | --- | --- | --- |
| `openLessonSectionAction` | completed-onboarding session | Zod UUID/slug + RPC relationship/RLS helper | typed success/error + requestId |
| `completeLessonSectionAction` | completed-onboarding session | allowlisted form fields + RPC calculated completion | typed success/error + requestId |
| `open_lesson_section` | authenticated execute only; `auth.uid()` | accessible published/owned snapshot and section | lesson progress row |
| `complete_lesson_section` | authenticated execute only; `auth.uid()` | section chain + required counts | calculated lesson progress row |

## 22. Files created

| File | Purpose |
| --- | --- |
| `supabase/migrations/20260716100110_phase_4_learning_content_progress.sql` | Phase 4 schema/security/RPC |
| `supabase/seed.sql` | Idempotent foundation content |
| `supabase/tests/database/phase_4_learning_content_progress.test.sql` | 66 local pgTAP assertions |
| `src/server/learning/content.ts` | Server-only typed reads/aggregates |
| `src/features/learning/{constants,schemas,model,action-state,actions}.ts` | Domain validation/helpers/actions |
| `src/features/learning/*.test.ts` | Unit/error/validation tests |
| `src/components/learning/*.tsx` | Catalog/list/reader/progress/safe Markdown |
| `src/components/learning/*.test.tsx` | Component behavior/accessibility tests |
| `src/app/(dashboard)/learn/[moduleSlug]/page.tsx` | Module route |
| `src/app/(dashboard)/learn/[moduleSlug]/[lessonSlug]/page.tsx` | Reader route |
| `tests/e2e/learning.spec.ts` | Conditional dedicated learning flow |
| `docs/PHASE_4_COMPLETION_REPORT.md` | This evidence report |

## 23. Files modified

| File | Change |
| --- | --- |
| `.env.example` | Dedicated learning credentials and expected project ref names |
| `package.json`, `package-lock.json` | Pin React Markdown 10.1.0 |
| `supabase/config.toml` | Enable versioned seed |
| `src/types/database.ts` | Regenerated linked schema types |
| `/learn/page.tsx` | Replace placeholder with DB catalog |
| `/dashboard/page.tsx`, `/progress/page.tsx` | Real learning overview/aggregates |
| `src/components/layout/app-shell.tsx` | Learning navigation label |
| `scripts/run-e2e.mjs`, `playwright.config.ts` | Dedicated production port + project-ref safety |
| `tests/e2e/foundation.spec.ts` | Nested learning route guards/environment gate |
| `README.md` and six Phase docs | Phase 4 source-of-truth updates |

## 24. Dependencies

| Package | Change | Reason |
| --- | --- | --- |
| `react-markdown` | Added exact `10.1.0` | Maintained Markdown-to-React renderer; `skipHtml`, no raw HTML plugin |

Alternative considered: handwritten Markdown parser (security/maintenance risk) and plain text (insufficient list/emphasis UX). `rehype-raw`, CMS/editor and sanitizer packages were not added. Audit reports 0 vulnerabilities.

## 25. Database verification

- Migration: local APPLIED; remote APPLIED; history synchronized.
- Tables: six Phase 4 tables verified local và remote.
- Constraints: pgTAP local/remote PASS including lifecycle, slug, relationship, percent and completion.
- Foreign keys: composite lesson/version/section ownership chain PASS local/remote.
- Functions: helpers/RPC/protection/publication functions exist và behavior PASS local/remote.
- RLS: enabled on all six tables; A/B/anon tests PASS local/remote.
- Policies: four content-chain and two own-progress policies verified local/remote.
- Grants: table SELECT-only and RPC authenticated-only verified local/remote.
- Seed: applied local/remote; rerun idempotent locally.
- Types: regenerated from linked remote schema.

## 26. Content verification

- Published: PASS local và remote pgTAP.
- Draft: PASS local/remote RLS tests; authenticated browser case SKIPPED.
- Archived: PASS local/remote database behavior; browser case SKIPPED.
- Safe rendering: PASS component tests for raw HTML drop, javascript URL block and external rel.
- Invalid slug: PASS Zod/unit and route returns not-found behavior by data layer.

## 27. Progress verification

- Start: PASS local RPC tests.
- Resume: PASS local RPC/unit/component tests; authenticated browser persistence SKIPPED.
- Section completion: PASS local RPC/component tests.
- Lesson completion: PASS local required-section tests.
- Idempotency: PASS local duplicate completion tests.
- Dashboard: build/unit data logic PASS; authenticated browser mutation update SKIPPED.
- Progress page: build/data logic PASS; authenticated browser mutation update SKIPPED.
- Ownership: PASS local và remote A/B/anon pgTAP.

## 28. Verification commands

- format: `npm.cmd run format:check` — PASS.
- lint: `npm.cmd run lint` — PASS.
- typecheck: `npm.cmd run typecheck` — PASS.
- tests: `npm.cmd run test` — PASS, 17 files/73 tests.
- build: `npm.cmd run build` — PASS.
- audit: `npm.cmd audit` — PASS, 0 vulnerabilities.
- E2E: `npm.cmd run test:e2e` — PASS with 44 passed/8 declared skips.
- database tests: `npx.cmd supabase test db` — PASS, 5 files/196 assertions; Phase 4 file chính có 66 assertions.
- database lint: local PASS; linked remote PASS.
- remote verifier: `npx.cmd supabase test db --linked supabase/tests/database/phase_4_learning_content_progress.test.sql` — PASS, 66/66, transaction rollback.

## 29. Responsive

Public/auth/route-guard Playwright passes at 375/768/1024/1440 with no horizontal overflow. Lesson UI uses horizontal section nav below desktop, sticky 15rem nav on desktop, bounded 68ch content and 44px controls. Authenticated visual/browser verification của lesson reader vẫn SKIPPED do thiếu dedicated account; limitation này được chấp nhận và không ghi thành PASS.

## 30. Accessibility

Implemented semantic article, breadcrumb/nav landmarks, heading hierarchy, native links/buttons, `aria-current="step"`, labeled progressbar, text + icon completion state, live pending/error status, focus-visible, reduced-motion spinner and safe external links. Component tests cover semantic progress/nav/actions. Full authenticated browser keyboard/visual review remains SKIPPED và được ghi nhận, không suy diễn thành PASS.

## 31. Security review

No service role, RLS disable, `USING (true)`, `GRANT ALL`, raw HTML, `dangerouslySetInnerHTML`, arbitrary user ID, client-calculated completion or shared user cache. Anti-pattern/secret scans pass. Remote RLS/grants/ownership verifier pass 66/66; database password không gửi hoặc lưu.

## 32. Tests skipped

- 8 authenticated Playwright cases: desktop cases thiếu dedicated credentials/project-ref confirmation; mobile variants intentionally chỉ chạy authenticated mutation ở desktop. Tất cả được reporter đánh dấu SKIPPED, không có hidden skip.

## 33. Remaining issues

- `KI-072`: dedicated authenticated learning account/project ref chưa provision; accepted automation limitation.
- `KI-068`: non-blocking Supabase experimental pg-delta CA cache warning after successful push.
- `KI-074`: seed intentionally proves architecture, not curriculum coverage.

## 34. Technical debt

- Publication is migration/seed-only; no reviewed admin workflow yet.
- Published content has no cross-request cache until a safe publication revalidation event exists.
- Data layer fetches a small catalog in parallel and assembles in memory; paginate/query-shape only when measured content volume requires it.
- E2E completion mutates a reusable test account idempotently but needs isolated credentials.

## 35. Scope intentionally not implemented

No roadmap generator, practice/question engine, scoring, AI tutor/evaluation, audio, speaking recorder, writing submission, placement test, SRS/flashcards, CMS/admin/RBAC, payments, XP/streak/badges, notifications, Redis/queue/worker/microservices or Phase 5.

## 36. Phase 5 recommendation

Không tự triển khai Phase 5. Trước release automation đầy đủ, nên provision isolated `E2E_LEARNING_*` account với expected project ref và chạy lại 8 authenticated cases; đây là follow-up đã ghi nhận, không thay đổi trạng thái COMPLETE của Phase 4.
