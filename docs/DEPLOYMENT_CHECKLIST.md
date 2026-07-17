# Deployment checklist

## 1. Trước deploy

1. Chọn commit đã qua CI và đọc `KNOWN_ISSUES.md`.
2. Xác nhận backup/PITR và ghi lại recovery point trước migration.
3. Cấu hình env theo `PRODUCTION_READINESS_CHECKLIST.md` trong secret manager; không paste giá trị vào terminal history hoặc docs.
4. Kiểm tra Auth site URL/redirect allowlist, SMTP, email verification, password/rate-limit/CAPTCHA settings.
5. Kiểm tra `speaking-recordings` vẫn private, MIME/size limit đúng và không có public URL policy.

## 2. Database forward deploy

```powershell
npx.cmd supabase migration list --linked
npx.cmd supabase db push --linked --dry-run
npx.cmd supabase db push --linked
npx.cmd supabase migration list --linked
npx.cmd supabase db lint --linked --level warning
```

Không dùng `db reset --linked`, không sửa migration đã apply, không chạy seed production ngoài data migration đã review. Sau push, chạy `supabase/tests/remote/phase_10c_production_hardening_remote.test.sql` bằng database owner trong transaction rollback; credential chỉ nhập qua prompt/secret tạm và xóa ngay sau run.

## 3. App deploy

```powershell
npm ci
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
npm audit --audit-level=high
```

Build command: `npm run build`. Start command: `npm run start`. Runtime phải là Node version phù hợp `package.json`.

## 4. Scheduler retention

Cấu hình scheduler server-side gọi `POST https://<app>/api/internal/storage-cleanup` với `Authorization: Bearer <secret-manager-reference>`. Không gọi từ browser. Không ghi secret vào URL. Chạy mỗi ngày; alert khi non-2xx. Job dùng batch 100, DB lease và retry stale work; tuyệt đối không chạy thủ công trên production chỉ để “test” nếu chưa có backup/change approval.

## 5. Post-deploy smoke

- Public: `/`, `/login`, `/register`, `/privacy`, `/terms` trả HTML, không console error, có security headers.
- Aliases `/reading`, `/listening`, `/writing`, `/speaking` redirect tới canonical `/practice/<skill>` rồi auth guard hoạt động.
- Anonymous: `/dashboard`, `/learn`, `/mock-tests`, `/progress`, `/profile`, `/settings` redirect `/login?next=...`.
- Authenticated: dashboard/learn/practice/mock/progress/profile/settings render đúng owner; onboarding guard không loop.
- Verify draft/answer key/transcript/audio/essay không xuất hiện trước điều kiện publish/submit/owner tương ứng.
- `/api/health/live` và `/api/health/ready` trả 200. Cleanup thiếu/sai bearer trả 404 và `Cache-Control: no-store`.
- Kiểm tra viewport 375, 768, 1024, 1440; keyboard, focus, axe, recorder/audio/editor/timer và submit confirmation.

## 6. Rollback

Nếu app lỗi nhưng database khỏe, chuyển traffic về artifact trước. Migration Phase 10C là additive/forward-only; không drop column/index/function để rollback khẩn cấp. Nếu migration gây lỗi, tạo forward-fix migration mới, dry-run, review rồi push. Nếu có mất/corrupt dữ liệu, dừng write, giữ evidence, restore vào project cô lập trước; chỉ cut over sau integrity/RLS/smoke verification. Mục tiêu MVP: RPO 24 giờ, RTO 4 giờ.
