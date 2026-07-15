# IELTS Flow

Ứng dụng tự học IELTS bằng Next.js 16 và Supabase. Foundation hiện có app shell responsive, authentication email/password bằng Supabase SSR, route bảo vệ phía server, hồ sơ người dùng thật và migration/RLS được version control.

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

Migration Phase 2 nằm tại `supabase/migrations/20260716015215_phase_2_auth_profiles.sql`, đã apply lên project remote và được xác minh bằng TAP transaction rollback. Hướng dẫn migration, URL/email template và checklist Dashboard nằm trong [docs/SUPABASE_AUTH_SETUP.md](./docs/SUPABASE_AUTH_SETUP.md).

## Auth flow

1. `/register` gọi Server Action và Supabase `signUp`.
2. Trigger `auth.users` tự tạo `public.profiles`; client không được INSERT profile.
3. Email xác minh đi qua `/auth/confirm`, route này verify OTP rồi tạo session.
4. Next.js `proxy.ts` refresh/đồng bộ cookie và coarse redirect.
5. Protected layout gọi server helper dùng `auth.getUser()` trước khi đọc profile.
6. `/profile` chỉ update `display_name` của actor hiện tại; PostgreSQL RLS kiểm tra ownership.
7. Logout xóa session local rồi redirect `/login`.

Protected routes: `/dashboard`, `/learn`, `/roadmap`, `/progress`, `/profile`, `/settings`.

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

Không commit hai giá trị này. Khi không có chúng, Playwright vẫn kiểm tra public UI, validation, sáu protected redirects và responsive 375/768/1024/1440; các test provider/authenticated được skip có thông báo rõ.

## Phạm vi hiện tại

Đã triển khai:

- Register, email confirmation route, login, logout và safe redirect
- Supabase SSR browser/server clients và Next.js 16 Proxy
- Protected server layout, session/user/profile helpers
- `profiles`, trigger tạo profile, `updated_at`, least-privilege grants và RLS
- Profile read/update thật; shell hiển thị user thật
- Unit/component/E2E và 21 database pgTAP tests
- Health endpoints `/api/health/live` và `/api/health/ready`

Chưa triển khai: onboarding IELTS, practice, scoring, AI, content admin, roles, consent, forgot/reset password, avatar/storage và Phase 3.

## Cấu trúc chính

```text
src/app                 App Router pages, auth confirmation, health routes
src/components          Layout, auth/profile forms, shared UI
src/features            Auth/profile schemas, actions, error mapping
src/lib                 Env, auth routing, Supabase SSR helpers
src/server              Server-only current account helpers
src/types               Types generated from applied local schema
supabase/migrations     Versioned PostgreSQL migrations
supabase/tests          pgTAP local và TAP remote database/RLS tests
tests/e2e               Playwright auth, route guard, responsive tests
docs                    Product, architecture, schema, API, security docs
```
