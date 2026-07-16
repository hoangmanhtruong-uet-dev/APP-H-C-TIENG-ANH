# IELTS Flow

Ứng dụng tự học IELTS bằng Next.js 16 và Supabase. Phase 2 Auth/Profile, Phase 3 IELTS Learner Onboarding và migration/data layer Phase 4 Learning Content & Study Progress đã được triển khai trên project remote. `/learn`, lesson reader, dashboard và `/progress` đọc dữ liệu PostgreSQL thật; completion được tính trong RPC từ các section bắt buộc.

## Stack

- Next.js App Router 16, React 19, TypeScript strict
- Tailwind CSS 4 với shadcn-compatible tokens
- Supabase Auth, PostgreSQL, `@supabase/ssr`, Supabase CLI
- Zod, React Markdown 10.1.0, Vitest, Testing Library, Playwright
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

## Supabase migration

Docker Desktop phải chạy trước khi dùng local stack:

```powershell
npx.cmd supabase start
npx.cmd supabase db reset
npx.cmd supabase test db
npx.cmd supabase db lint --level warning
```

Migration Phase 2 nằm tại `supabase/migrations/20260716015215_phase_2_auth_profiles.sql`, Phase 3 tại `supabase/migrations/20260716040212_phase_3_learner_onboarding.sql`, và Phase 4 tại `supabase/migrations/20260716100110_phase_4_learning_content_progress.sql`. Cả ba đã apply lên đúng project remote. Local database suite hiện có 5 file/196 assertion; riêng Phase 4 có 66 assertion. Remote Phase 4 chạy trực tiếp cùng file test chính và pass 66/66 trong transaction đã rollback. Schema/history/lint/types remote đều đã verify. Không dùng service role và không reset remote.

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
6. User chưa hoàn tất onboarding được server guard đưa từ `/dashboard`, `/learn`, `/roadmap`, `/progress` sang `/onboarding`.
7. Mỗi bước onboarding upsert allowlist field với actor từ session; completion RPC tự xác định `auth.uid()` và tự ghi timestamp.
8. `/profile` cho xem/sửa display name và learning preferences; PostgreSQL RLS kiểm tra ownership.
9. `/learn` chỉ đọc module/version đã publish phù hợp test type; draft không qua được RLS.
10. `open_lesson_section` và `complete_lesson_section` lấy actor từ `auth.uid()`, lưu resume và tự tính completion.
11. Logout xóa session local rồi redirect `/login`.

Protected routes: `/onboarding`, `/dashboard`, `/learn`, `/roadmap`, `/progress`, `/profile`, `/settings`.

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
- Unit/component/E2E, 196 database assertions local, 42 assertion Phase 3 remote và 66 assertion Phase 4 remote
- Health endpoints `/api/health/live` và `/api/health/ready`

Chưa triển khai: placement test, study roadmap/plan generator, daily tasks, exercise/practice engine, scoring, AI, content admin/CMS, roles, consent, forgot/reset password và avatar/storage. Phase 5 không được triển khai. **PHASE 4 COMPLETE** ngày 2026-07-16; 8 authenticated Playwright cases vẫn SKIPPED công khai do chưa có dedicated credentials/project-ref confirmation và không được ghi thành PASS.

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
