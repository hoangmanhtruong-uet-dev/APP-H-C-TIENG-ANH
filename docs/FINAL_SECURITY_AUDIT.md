# Phase 10C final security audit

Ngày audit: 2026-07-18. Phạm vi: auth/onboarding guards, server actions/routes, RPC/grants/RLS, private Storage, cross-user/draft/answer-key/audio/transcript/essay access, env/AI/logging/upload và deployment headers.

## Kết luận theo control

| Control | Kết quả | Bằng chứng chính |
| --- | --- | --- |
| Auth/onboarding | PASS | Server layout dùng verified user; `/mock-tests` được thêm vào protected routes và anonymous redirect matrix. |
| RPC/grants | PASS local + remote | Security-definer RPC dùng fixed empty `search_path`; mutation lấy actor từ `auth.uid()`; cleanup claim chỉ `service_role`; anonymous RLS helper grant đã bị thu hồi bằng forward migration. |
| RLS/cross-user | PASS local + remote | Actor pgTAP kiểm tra owner isolation toàn bộ practice engines; Phase 10C không nới table grants/policies; rollback verifier pass 12/12. |
| Draft/answer key | PASS local | Published-version policies giữ draft kín; answer key ở private schema và chỉ database scoring path đọc. |
| Essay/transcript/audio | PASS local | Submitted essay/transcript/feedback owner-only; bucket Speaking private; exact issued path + server media verification; retention metadata client không update/delete. |
| Service-role | PASS code audit | Chỉ import trong `server-only` admin helper và internal cleanup route; không có biến `NEXT_PUBLIC` tương ứng hoặc browser import. |
| Secret/log/error | PASS code audit | Env pairing/min length; API trả lỗi generic/request id; cleanup sai auth giả 404; không log token/key/password/signed URL/raw provider response. |
| AI safety/cost | PASS local | Explicit consent, optional fail-closed provider, HMAC/Vault finalize, retry + weekly/burst quotas serialized bằng advisory lock. |
| Upload/retention | PASS local | MIME/size/duration/checksum verified; 30-day deadline; DB cleanup lease, stale retry, object deletion trước asset finalize. |
| Browser headers | PASS implementation | CSP, HSTS production, nosniff, DENY/frame-ancestors, referrer, COOP và permissions policy; E2E assertion được thêm. |

## Hardening đã thực hiện

- Forward migration mới; không sửa migration cũ, không reset remote và không xóa production data.
- Cleanup route dùng server-only service-role và constant-time bearer comparison. Upload intent được atomically chuyển `expired` trước xóa để loại race với verifier; asset được claim `cleanup_pending` bằng `FOR UPDATE SKIP LOCKED`, có lease retry 15 phút.
- `retention_until` audio bắt buộc, mặc định 30 ngày; trạng thái/timestamp được ràng buộc bằng check constraints và indexed cleanup paths.
- Speaking AI có weekly/burst quota dưới advisory lock; DB N+1 transcript/audio lookup được batch trước provider calls.
- Registration yêu cầu đồng ý versioned terms/privacy; policy công khai mô tả data, retention, AI và DSR contact.
- CSP cho phép đúng local/hosted Supabase origins, chỉ upgrade insecure request trên HTTPS deployment.

## Giới hạn và release gate

Remote parity 20/20, linked lint, performance advisor và rollback verifier 12/12 đã pass. Security advisor còn cảnh báo có chủ đích cho authenticated RPC (được ownership/signature tests bảo vệ) và leaked-password protection chưa bật. Supabase backup/PITR, Auth/SMTP/CAPTCHA, scheduler và AI provider budget alert là cấu hình vận hành ngoài repo; operator phải check trước go-live. Không có phát hiện P0/P1 trong code/schema; verdict và evidence đầy đủ ở `FINAL_TEST_REPORT.md`.
