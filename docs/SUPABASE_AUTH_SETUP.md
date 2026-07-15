# SUPABASE AUTH SETUP - Phase 2

Tài liệu này chỉ dùng public URL/anon key ở ứng dụng. Không nhập access token, database password, connection string có password hoặc service-role/secret key vào source, docs, screenshot hay chat.

## 1. Local database

Yêu cầu Docker Desktop đang chạy:

```powershell
npx.cmd supabase start
npx.cmd supabase db reset
npx.cmd supabase migration list --local
npx.cmd supabase test db
npx.cmd supabase db lint --level warning
```

`db reset` phải apply migration `20260716015215_phase_2_auth_profiles.sql`; pgTAP phải pass 21 test trước khi push remote.

## 2. Đăng nhập và link project

Thực hiện tương tác trực tiếp trong terminal, không gửi credential qua chat:

```powershell
npx.cmd supabase login
npx.cmd supabase link --project-ref <PROJECT_REF>
npx.cmd supabase migration list --linked
```

`PROJECT_REF` là phần subdomain trong `NEXT_PUBLIC_SUPABASE_URL`. Kiểm tra project name/ref trước khi push.

## 3. Review và apply remote migration

```powershell
npx.cmd supabase db push --dry-run
npx.cmd supabase db push
npx.cmd supabase migration list --linked
npx.cmd supabase db lint --linked --level warning
```

Sau khi apply, verify trong Database Dashboard/SQL Editor:

- `public.profiles` tồn tại, PK/FK `id -> auth.users(id) ON DELETE CASCADE`.
- Trigger `auth.on_auth_user_created` gọi `public.handle_new_auth_user()`.
- Trigger `public.set_profiles_updated_at` tồn tại.
- RLS được bật.
- Chỉ có SELECT-own và UPDATE-own policy cho `authenticated`.
- `anon` không có SELECT/UPDATE; `authenticated` chỉ có SELECT và UPDATE `display_name`.
- Tạo một user thử phải tự sinh đúng một profile.

Generate lại types từ schema đã link sau khi remote verify:

```powershell
npx.cmd supabase gen types typescript --linked --schema public
```

So sánh output với `src/types/database.ts` trước khi thay file.

## 4. Authentication provider

Trong Supabase Dashboard > Authentication > Providers > Email:

- Email/password: enabled.
- Confirm email: enabled.
- Không tắt confirmation vĩnh viễn chỉ để test.
- Không bật anonymous sign-in cho Phase 2.

## 5. URL configuration

Local:

- Site URL: `http://localhost:3000`
- Redirect URL: `http://localhost:3000/auth/confirm`

Production khi có domain:

- Site URL: `https://<production-domain>`
- Redirect URL: `https://<production-domain>/auth/confirm`

Chỉ allow origin/redirect đang dùng thật.

## 6. Confirmation email template

Template signup confirmation phải dẫn token hash về Route Handler SSR:

```text
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
```

Không log hoặc copy confirmation URL/token vào issue, screenshot hay fixture. Route trả generic error cho token sai/hết hạn và dùng `Cache-Control: no-store`.

## 7. SMTP và rate limits

- Local Mailpit chỉ dùng để kiểm tra email local.
- Custom SMTP không bắt buộc trong Phase 2; ghi lại trạng thái provider trước production.
- Giữ rate limit mặc định cho tới khi có số liệu; không nới chỉ để E2E pass.

## 8. Manual verification checklist

Remote evidence ngày 2026-07-16:

- Project `ielts-learning` (`xxpakqsbltoezicapyti`) healthy và đã link.
- Local/remote migration history cùng version `20260716015215`.
- Dry-run sau apply trả `Remote database is up to date`.
- Remote database lint trả `No schema errors found`.
- Remote TAP verifier exit 0 với 21/21 assertions; fixtures kết thúc bằng `ROLLBACK`.
- Experimental pg-delta từng cảnh báo không cache được catalog sau push; migration history, lint và direct remote verifier độc lập đều pass.

- [x] CLI đã login và link đúng project.
- [x] Migration remote đã apply và history khớp local (`20260716015215`).
- [x] Remote database lint không có schema error.
- [ ] Email/password và confirm email đang bật.
- [ ] Site URL và redirect URL đúng environment.
- [ ] Confirmation template dùng `token_hash` và `/auth/confirm`.
- [ ] Đăng ký bằng inbox thật nhận được email.
- [ ] Link xác minh tạo session và vào `/dashboard`.
- [ ] Login/logout và session refresh hoạt động.
- [x] TAP remote chứng minh User A không đọc/cập nhật profile B và anon bị từ chối; toàn bộ fixture rollback.
- [ ] `E2E_AUTH_EMAIL`/`E2E_AUTH_PASSWORD` được cấp qua secret và authenticated E2E pass.
- [x] `.env.local`, CLI state/token, pooler metadata, test output và credential không bị Git track; secret-pattern scan pass.
