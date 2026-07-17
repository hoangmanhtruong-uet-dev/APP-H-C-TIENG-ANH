# Production readiness checklist

Checklist này là release gate cho IELTS Flow MVP. Không điền secret value vào file, ticket, log hoặc ảnh chụp màn hình.

## Release artifact

- [ ] Working tree/commit phát hành đã được review; CI của đúng commit xanh.
- [ ] Node đáp ứng `engines.node`, cài bằng `npm ci`, build bằng `npm run build`, start bằng `npm run start`.
- [x] `npm audit --audit-level=high`, format, lint, typecheck, unit, build, pgTAP và Playwright đều đạt gate trong `FINAL_TEST_REPORT.md`.
- [ ] `NEXT_PUBLIC_SITE_URL` là HTTPS canonical URL; DNS/TLS hoạt động trước khi mở traffic.
- [ ] `NEXT_PUBLIC_SUPPORT_EMAIL` là mailbox thật, có người trực và được truyền ngay từ build production.

## Environment

Public, được phép có trong browser bundle:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPPORT_EMAIL`

Server-only, lưu trong secret manager của nền tảng deploy:

- `SUPABASE_SERVICE_ROLE_KEY` và `STORAGE_CLEANUP_SECRET` (bắt buộc production cho retention cleanup).
- `SPEAKING_PIPELINE_SIGNING_SECRET` (bắt buộc production cho upload verification; đồng bộ Supabase Vault).
- `OPENAI_API_KEY`, `OPENAI_WRITING_MODEL`, `WRITING_FEEDBACK_SIGNING_SECRET` (tùy chọn; bỏ toàn bộ để Writing AI fail closed).
- `OPENAI_SPEAKING_TRANSCRIPTION_MODEL`, `OPENAI_SPEAKING_FEEDBACK_MODEL` (tùy chọn; bỏ model và API key để Speaking AI fail closed, vẫn giữ signing secret cho upload).

Signing/cleanup secret dài tối thiểu 32 ký tự. Không dùng `NEXT_PUBLIC_` cho bất kỳ secret nào. Không truyền service-role cho client, Playwright hoặc analytics.

## Supabase

- [ ] Production project ref khớp môi trường deploy; không dùng project dev.
- [ ] URL redirect/site URL của Auth chỉ chứa HTTPS domain được phê duyệt; email confirmation và SMTP được test.
- [ ] Password policy, rate limit, email verification và CAPTCHA được cấu hình phù hợp mức public exposure.
- [x] Migration history local/remote parity 20/20; đã dry-run rồi forward push. Không reset remote.
- [x] Database lint sạch; remote Phase 10C verifier pass 12/12 trong transaction rollback.
- [x] Bucket `speaking-recordings` private, giới hạn 15 MiB và MIME allowlist; Storage policies/path ownership được verifier xác nhận.
- [x] RLS bật trên mọi public learner/content table; `anon` không đọc draft/answer key/audio/transcript/essay; actor A không đọc actor B.
- [ ] Vault có signing secret tương ứng khi bật AI; app secret và Vault secret được rotate cùng lần.

## Retention, privacy and cost

- [ ] Scheduler server gửi `POST /api/internal/storage-cleanup` với bearer `STORAGE_CLEANUP_SECRET`, tối thiểu mỗi ngày một lần.
- [ ] Scheduler chỉ gọi HTTPS, không log Authorization header hoặc response body chứa định danh.
- [ ] Audio có deadline 30 ngày; cleanup claim bằng lease DB, xóa private object rồi mới finalize metadata; stale lease retry sau 15 phút.
- [ ] Terms/privacy version hiện hành được hiển thị và registration bắt buộc explicit acceptance.
- [ ] Quy trình DSR xác minh danh tính, export/xóa và lưu audit ticket đã được phân công cho support mailbox.
- [ ] Speaking quota: tối đa 20 transcript/7 ngày, 5 transcript/phút; 5 feedback/7 ngày, 2 feedback/phút, ngoài retry-per-attempt hiện có.
- [ ] Budget/rate alerts của AI provider được bật. Raw provider response, token, signed URL và secret không được log.

## Availability and recovery

- [ ] `/api/health/live` trả 200; `/api/health/ready` trả 200 và thực sự kiểm tra env + Supabase Auth dependency.
- [ ] Uptime monitor dùng readiness; alert không ghi response chứa dữ liệu người dùng.
- [ ] Supabase backups/PITR theo plan đã được xác nhận. Mục tiêu MVP: RPO tối đa 24 giờ, RTO tối đa 4 giờ.
- [ ] Restore rehearsal gần nhất dùng project cô lập, kiểm tra migration history, RLS và smoke tests trước khi ghi nhận pass.
- [ ] App rollback dùng artifact/commit trước; schema rollback không chạy destructive down migration. Sự cố schema được xử lý bằng forward-fix migration mới.

## Go/no-go

Chỉ go-live khi mọi mục bắt buộc đã check, không còn P0/P1 release gate mở, backup đã xác nhận và remote verifier pass. Nếu thiếu backup/Auth/scheduler/monitoring evidence, verdict triển khai là `NO-GO` dù Phase 10C repo/schema đã `COMPLETE`; không được diễn giải phase completion thành quyền mở production traffic.
