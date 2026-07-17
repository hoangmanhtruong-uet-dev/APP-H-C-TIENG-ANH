# IELTS Flow

> **Phase 10C COMPLETE** ở phạm vi repo/schema. Full local, browser và linked-remote evidence nằm tại `docs/FINAL_TEST_REPORT.md`; production traffic vẫn phải qua checklist vận hành.

Production requires canonical HTTPS `NEXT_PUBLIC_SITE_URL`, a real `NEXT_PUBLIC_SUPPORT_EMAIL`, and server-only cleanup credentials. `SUPABASE_SERVICE_ROLE_KEY` is confined to the `server-only` retention worker and must never be exposed to browser code. See `docs/PRODUCTION_READINESS_CHECKLIST.md` and `docs/DEPLOYMENT_CHECKLIST.md` before go-live.

Ứng dụng tự học IELTS bằng Next.js 16 và Supabase. Phase 1–10C đã COMPLETE. `/learn`, `/practice`, dashboard và `/progress` đọc dữ liệu PostgreSQL thật; không có analytics hoặc band trend giả.

## Stack

- Next.js App Router 16, React 19, TypeScript strict
- Tailwind CSS 4 với shadcn-compatible tokens
- Supabase Auth, PostgreSQL, `@supabase/ssr`, Supabase CLI
- Zod, React Markdown 10.1.0, official OpenAI SDK, Vitest, Testing Library, Playwright và axe-core
- ESLint, Prettier, npm lockfile

## Thiết lập local

```powershell
npm ci
Copy-Item .env.example .env.local
npm.cmd run dev
```

Điền hai public project values vào `.env.local`:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Không cần và không được thêm service-role/secret key cho luồng auth này. `.env.local` đã được Git ignore.

Optional Writing AI feedback fail-closed nếu chưa cấu hình. Khi bật, đặt `OPENAI_API_KEY`, `OPENAI_WRITING_MODEL` và `WRITING_FEEDBACK_SIGNING_SECRET` chỉ ở server; signing secret phải khớp secret Supabase Vault tên `writing_feedback_signing_secret`. Không biến nào được có prefix `NEXT_PUBLIC_`, và application không cần service-role key.

## Supabase migration

Docker Desktop phải chạy trước khi dùng local stack:

```powershell
npx.cmd supabase start
npx.cmd supabase db reset
npx.cmd supabase test db
npx.cmd supabase db lint --level warning
```

Schema Phase 5 nằm tại `20260716143000_phase_5_exercise_vocabulary_grammar.sql`; foundation content bắt buộc được deploy bằng data migration `20260716153000_phase_5_foundation_content.sql`. Năm migration local/remote đang đồng bộ. Local database suite pass 284 assertions; riêng Phase 5 pgTAP pass 64/64. Remote content khớp local theo deterministic fingerprint, lint và generated types đã verify; remote transactional TAP database-owner pass đủ 24/24 sau seed fix. Không dùng service role và không reset remote.

Bằng chứng chi tiết: [PHASE_5_COMPLETION_REPORT.md](./docs/PHASE_5_COMPLETION_REPORT.md).

Remote pgTAP Phase 4 phải chạy trực tiếp file test chính; không dùng wrapper `\ir` vì Supabase CLI test container không mount file include ngoài path được chỉ định:

```powershell
npx.cmd supabase test db --linked supabase/tests/database/phase_4_learning_content_progress.test.sql
```

Seed Phase 4 là nội dung foundation nguyên bản, nhỏ và idempotent:

```powershell
npx.cmd supabase db reset
npx.cmd supabase db push --linked --include-seed --dry-run
```

`supabase/seed.sql` được chạy tự động bởi `db reset`; khi push remote phải review dry-run trước. Không chạy seed production ngoài quy trình migration đã duyệt.

## Auth flow

1. `/register` gọi Server Action và Supabase `signUp`.
2. Trigger `auth.users` tự tạo `public.profiles`; client không được INSERT profile.
3. Email xác minh đi qua `/auth/confirm`, route này verify OTP rồi tạo session.
4. Next.js `proxy.ts` refresh/đồng bộ cookie và coarse redirect.
5. Protected layout gọi server helper dùng `auth.getUser()` trước khi đọc profile.
6. User chưa hoàn tất onboarding được server guard đưa từ `/dashboard`, `/learn`, `/practice`, `/roadmap`, `/progress` sang `/onboarding`.
7. Mỗi bước onboarding upsert allowlist field với actor từ session; completion RPC tự xác định `auth.uid()` và tự ghi timestamp.
8. `/profile` cho xem/sửa display name và learning preferences; PostgreSQL RLS kiểm tra ownership.
9. `/learn` chỉ đọc module/version đã publish phù hợp test type; draft không qua được RLS.
10. `open_lesson_section` và `complete_lesson_section` lấy actor từ `auth.uid()`, lưu resume và tự tính completion.
11. `start_exercise_attempt`, `save_exercise_answer` và `submit_exercise_attempt` lấy actor từ session; answer key nằm trong `private`, submit lock và score đúng version trong database.
12. Logout xóa session local rồi redirect `/login`.

Protected routes: `/onboarding`, `/dashboard`, `/learn`, `/practice`, `/roadmap`, `/progress`, `/profile`, `/settings`.

## Kiểm thử

```powershell
npm.cmd run format:check
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test
npm.cmd run build
npm.cmd audit
npm.cmd run test:e2e
```

Để bật E2E dùng tài khoản Supabase thật, cung cấp credential chỉ trong shell/CI secret:

```powershell
$env:E2E_AUTH_EMAIL='...'
$env:E2E_AUTH_PASSWORD='...'
npm.cmd run test:e2e
```

Dedicated onboarding account dùng hai biến tùy chọn sau; account phải được tạo/xác minh ngoài test và không dùng chung với dữ liệu thật:

```powershell
$env:E2E_ONBOARDING_EMAIL='...'
$env:E2E_ONBOARDING_PASSWORD='...'
$env:E2E_EXPECTED_SUPABASE_PROJECT_REF='local-or-project-ref'
npm.cmd run test:e2e
```

Dedicated learning-progress account dùng riêng và chỉ chạy khi project ref khớp môi trường đang phục vụ app:

```powershell
$env:E2E_LEARNING_EMAIL='...'
$env:E2E_LEARNING_PASSWORD='...'
$env:E2E_EXPECTED_SUPABASE_PROJECT_REF='local-or-project-ref'
npm.cmd run build
npm.cmd run test:e2e
```

Phase 5 local authenticated E2E có thể provision hai account bằng public signup, Mailpit confirmation và user-session RLS, không dùng service role. Các biến tương ứng là `E2E_PRACTICE_USER_A_*`, `E2E_PRACTICE_USER_B_*` và expected project ref.

Không commit các giá trị này. Runner dùng production build trên cổng 3100 riêng và từ chối tái sử dụng process không được xác nhận. Khi thiếu credentials, Playwright vẫn kiểm tra public UI, validation, protected redirects lồng nhau và responsive 375/768/1024/1440; các test authenticated được skip có thông báo rõ.

Manual end-to-end verification ngày 2026-07-16 đã pass với Gmail SMTP và tài khoản email thật: register, nhận email, confirmation link, login, profile auto-create/update, logout và protected-route denial sau logout.

## Phạm vi hiện tại

Đã triển khai:

- Register, email confirmation route, login, logout và safe redirect
- Supabase SSR browser/server clients và Next.js 16 Proxy
- Protected server layout, session/user/profile helpers
- `profiles`, trigger tạo profile, `updated_at`, least-privilege grants và RLS
- Profile read/update thật; shell hiển thị user thật
- Wizard `/onboarding` 8 bước, save-per-step, resume, review và completion server/database-controlled
- `learner_profiles`, constraints, timezone-safe exam date trigger, least-privilege grants và ownership RLS
- Onboarding guard tách khỏi auth guard; dashboard/profile dùng learning preferences thật
- Catalog module, module lessons, lesson reader Markdown an toàn, section navigation, resume và completion thật
- `learning_modules`, `lessons`, immutable `lesson_versions`, `lesson_sections` và hai bảng progress owner-scoped
- Dashboard next/continue lesson và `/progress` dùng aggregate thật, không dùng stats giả
- Hai module foundation, bốn lesson publish và một draft lesson để kiểm chứng isolation
- Exercise engine versioned với 4 question types, RPC-only draft save, idempotent submit và deterministic database scoring
- `/learn/vocabulary`, `/learn/grammar`, detail pages, `/practice/[exerciseSlug]`, persisted result và attempt history
- 8 vocabulary entries, 3 grammar topics, 2 published exercise sets và 1 draft isolation fixture, toàn bộ nội dung seed nguyên bản
- Unit/component/E2E, 284 database assertions local, 64 Phase 5 pgTAP assertions và authenticated two-user Playwright local
- Health endpoints `/api/health/live` và `/api/health/ready`

Chưa triển khai: analytics nâng cao, Writing Task 1, placement test, study roadmap/plan generator, daily tasks, SRS phức tạp, error notebook `/progress/mistakes`, content admin/CMS, roles nâng cao, forgot/reset password và avatar. Phase 10C hardening đã hoàn tất; production vận hành theo `docs/PRODUCTION_READINESS_CHECKLIST.md`.

## Cấu trúc chính

```text
src/app                 App Router pages, auth confirmation, health routes
src/components          Layout, auth/profile/learning UI và shared states
src/features            Auth/profile/onboarding/learning schemas, actions, domain helpers
src/lib                 Env, auth routing, Supabase SSR helpers
src/server              Server-only account, onboarding guard và learning data access
src/types               Types generated from applied local schema
supabase/migrations     Versioned PostgreSQL migrations
supabase/tests          pgTAP local và TAP remote database/RLS tests
tests/e2e               Playwright auth, nested route guard, learning và responsive tests
docs                    Product, architecture, schema, API, security docs
```

## Phase 6 Reading practice

- Routes: `/practice/reading`, `/practice/reading/[exerciseSlug]`, `/practice/reading/[exerciseSlug]/result/[attemptId]`.
- One original Academic passage, ten questions and four implemented types; desktop split view and mobile passage/question tabs.
- PostgreSQL owns the published snapshot, draft revision, timer, atomic submit, deterministic score and post-submit review.
- Phase 6 migrations are applied remote with local/remote history 7/7 and lint clean. Local full pgTAP passes 384 assertions; Phase 6 passes 66/66 and owner verifier passes 34/34 against local.
- The direct remote database-owner verifier connected successfully and reported planned 34, ran 34, failed 0, no `not ok`, no `ERROR`, PASS; its transaction rolled back as designed and the password was neither sent nor stored in chat.
- Phase 6 remains **COMPLETE**. Phase 7 Listening is documented in the current section below.

## Phase 7 Listening practice

- Routes: `/practice/listening`, `/practice/listening/[exerciseSlug]`, `/practice/listening/[exerciseSlug]/result/[attemptId]`.
- One original Academic practice set with a reproducible 108-second WAV, 2 parts, 8 questions and 3 types: single choice, multiple choice and short text.
- PostgreSQL owns published content/audio metadata, attempt timer, answer revisions, atomic/idempotent submit, score/correctness and review availability. Transcript is private until the owner submits.
- New migrations `20260717100000_phase_7_listening_practice_engine.sql` and `20260717101500_phase_7_listening_foundation_content.sql` are applied local and remote without modifying Phase 1–6 or resetting remote data.
- Fresh evidence: local full pgTAP 465/465, local/remote lint clean, parity 9/9, 98 unit/component tests, production build and Playwright 50 pass/14 declared skips. Listening browser checks cover two real actors, 375/768/1024/1440, keyboard, audio, resume, submit and transcript isolation.
- Direct remote database-owner verifier ran through `ok 34`, failed 0, with no `not ok` and no `ERROR`; its transaction rolled back and the database password was neither sent nor stored in chat.
- Historical Phase 7 sign-off: **PHASE 7 COMPLETE** with no blocker; Phase 8 had not been implemented at that sign-off.

## Phase 8 Writing practice

- Routes: `/practice/writing`, `/practice/writing/[taskSlug]`, `/practice/writing/[taskSlug]/submission/[submissionId]`.
- One original Academic Writing Task 2 plus one hidden draft fixture; no copyrighted IELTS task material.
- PostgreSQL owns task snapshots, draft revision/word count, timer, atomic/idempotent submit, immutable essay and owner-only review/history.
- Optional AI feedback runs server-only through the official OpenAI Responses API with Structured Outputs, moderation, timeout, quota, HMAC/Vault finalization and exact-essay evidence validation. It is clearly practice guidance, never an official IELTS score.
- No AI/provider configuration is a supported safe fallback. No fake feedback or raw provider response is stored; no service-role key is used by the application.
- Three Phase 8 migrations are applied local and remote without reset or data deletion. Final parity is 12/12 and local/remote database lint is clean.
- Fresh local evidence: full pgTAP 544/544, Phase 8 actor test 39/39, owner-style verifier `ok 1`–`ok 40`, 104 unit/component tests, full practice E2E 8/8, Writing responsive/keyboard/axe checks 2/2.
- Direct remote database-owner verifier ran through `ok 40`, failed 0, with no `not ok` and no `ERROR`; its transaction rolled back and the database password was neither sent nor stored in chat. `KI-080` is closed.
- Current status: **PHASE 8 COMPLETE**. No Phase 8 blocker remains. Phase 9 was not implemented.

## Phase 9 Speaking practice

- Phase 9 đã COMPLETE với private recording, server media verification, immutable submit, optional STT/AI fail-closed và owner-only review.
- Ba migration Phase 9 đã apply local/remote; parity lịch sử tại thời điểm đóng Phase 9 là 15/15 và owner verifier 24/24 pass.

## Phase 10A IELTS Mock Test Engine

- Routes: `/mock-tests`, `/mock-tests/[mockTestSlug]`, session và summary owner-only.
- Một mock Academic published và một draft fixture; mỗi version gồm đúng bốn section theo thứ tự Reading, Listening, Writing, Speaking và liên kết trực tiếp tới content version Phase 6–9.
- PostgreSQL giữ version pin, current section, timer, idempotency, trạng thái session/section và raw result. Browser không gửi actor, score, status hoặc submitted timestamp.
- Reading/Listening summary dùng điểm thô thật từ attempt đã scored; Writing/Speaking chỉ lưu owner submission/attempt reference. Không có overall band, predicted band hoặc total score giả.
- Hai migration forward-only `20260717190000` và `20260717191500` đã apply local/remote, không reset remote và không xóa dữ liệu thật. Parity hiện là 17/17; local/remote lint sạch.
- Full local pgTAP pass 663/663; full Playwright production run pass 56 với 20 skip có guard rõ; responsive 375/768/1024/1440 và axe pass.
- Direct remote database-owner identity pass với `current_user postgres`; verifier rollback-only pass 20/20, failed 0, không `not ok` hoặc `ERROR`. `KI-082` closed.
- Historical Phase 10A scope: Phase 10B/10C, analytics nâng cao và production hardening chưa nằm trong slice đó; Phase 10B/10C đã được hoàn tất ở các slice sau.
- Current status: **PHASE 10A COMPLETE**.

## Phase 10B learner analytics

- Dashboard và `/progress` đọc bốn RPC owner-scoped từ PostgreSQL cho lesson, practice, Writing, Speaking và Mock Test.
- Objective accuracy chỉ dùng score/max đã persist và sample count; Writing/Speaking chỉ hiển thị submission/feedback status.
- Weak areas cần ít nhất hai bài objective đã chấm và không được gọi là band prediction.
- Content operations tối thiểu nằm tại [CONTENT_OPERATIONS.md](./docs/CONTENT_OPERATIONS.md); không có admin CMS hoặc production deployment.
- Migration local/remote parity 18/18, local/remote lint sạch và direct remote database-owner verifier rollback-only pass 17/17.
- Historical Phase 10B sign-off: **PHASE 10B COMPLETE**; Phase 10C chưa nằm trong slice đó. Trạng thái repo hiện tại được ghi ở đầu README và completion report Phase 10C.
