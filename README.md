# IELTS Flow

Ứng dụng tự học IELTS bằng Next.js 16 và Supabase. Phase 2 Auth/Profile và Phase 3 IELTS Learner Onboarding & Personalization Foundation đã được triển khai trên project remote. Onboarding lưu draft từng bước, resume từ PostgreSQL, hoàn tất qua RPC được bảo vệ và đưa dữ liệu thật vào dashboard/profile.

## Stack

- Next.js App Router 16, React 19, TypeScript strict
- Tailwind CSS 4 với shadcn-compatible tokens
- Supabase Auth, PostgreSQL, `@supabase/ssr`, Supabase CLI
- Zod, Vitest, Testing Library, Playwright
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

Migration Phase 2 nằm tại `supabase/migrations/20260716015215_phase_2_auth_profiles.sql`; migration Phase 3 nằm tại `supabase/migrations/20260716040212_phase_3_learner_onboarding.sql`. Cả hai đã apply lên project remote. Phase 3 có 42 assertion trực tiếp trên remote chạy trong transaction rồi rollback; không dùng service role và không reset remote. Hướng dẫn Auth/SMTP nằm trong [docs/SUPABASE_AUTH_SETUP.md](./docs/SUPABASE_AUTH_SETUP.md).

## Auth flow

1. `/register` gọi Server Action và Supabase `signUp`.
2. Trigger `auth.users` tự tạo `public.profiles`; client không được INSERT profile.
3. Email xác minh đi qua `/auth/confirm`, route này verify OTP rồi tạo session.
4. Next.js `proxy.ts` refresh/đồng bộ cookie và coarse redirect.
5. Protected layout gọi server helper dùng `auth.getUser()` trước khi đọc profile.
6. User chưa hoàn tất onboarding được server guard đưa từ `/dashboard`, `/learn`, `/roadmap`, `/progress` sang `/onboarding`.
7. Mỗi bước onboarding upsert allowlist field với actor từ session; completion RPC tự xác định `auth.uid()` và tự ghi timestamp.
8. `/profile` cho xem/sửa display name và learning preferences; PostgreSQL RLS kiểm tra ownership.
9. Logout xóa session local rồi redirect `/login`.

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
npm.cmd run test:e2e
```

Không commit các giá trị này. Khi không có chúng, Playwright vẫn kiểm tra public UI, validation, bảy protected redirects và responsive 375/768/1024/1440; test provider/authenticated/onboarding được skip có thông báo rõ.

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
- Unit/component/E2E, 130 database assertions local và 42 assertion Phase 3 trực tiếp trên remote
- Health endpoints `/api/health/live` và `/api/health/ready`

Chưa triển khai: placement test, study roadmap/plan generator, daily tasks, practice, scoring, AI, content admin, roles, consent, forgot/reset password và avatar/storage. Không có Phase 4 nào được triển khai trong thay đổi này.

## Cấu trúc chính

```text
src/app                 App Router pages, auth confirmation, health routes
src/components          Layout, auth/profile forms, shared UI
src/features            Auth/profile/onboarding schemas, actions, error mapping
src/lib                 Env, auth routing, Supabase SSR helpers
src/server              Server-only current account và onboarding guard helpers
src/types               Types generated from applied local schema
supabase/migrations     Versioned PostgreSQL migrations
supabase/tests          pgTAP local và TAP remote database/RLS tests
tests/e2e               Playwright auth, route guard, responsive tests
docs                    Product, architecture, schema, API, security docs
```
