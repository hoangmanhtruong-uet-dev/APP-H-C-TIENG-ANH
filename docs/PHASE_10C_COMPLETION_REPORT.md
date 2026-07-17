# Phase 10C completion report

## 1. Executive summary

Phase 10C production hardening đã **COMPLETE** ở phạm vi code, database, tests và tài liệu. Không có feature lớn hay redesign; không sửa migration đã apply, không reset remote, không xóa dữ liệu thật và không đưa service role vào browser.

## 2. Completed phase

Release slice Production Hardening & Deploy Readiness đã hoàn tất ngày 2026-07-17. Final remote parity là 20/20, linked lint sạch và verifier rollback-only pass 12/12.

## 3. Included

Security headers/CSP, auth-route guard, strict production env/readiness, server-only retention cleanup, forward-only DB hardening, quota/concurrency controls, privacy/terms acceptance, targeted performance fixes, submit confirmation/recorder polish, CI gates, test stabilization và production runbooks.

## 4. Intentionally excluded

Không thêm admin CMS, forgot/reset password, analytics warehouse/band prediction, placement/roadmap/SRS nâng cao, public deployment hay redesign hệ thống. Không biến optional AI thành dependency bắt buộc.

## 5. Security

Secrets được validate server-side và lỗi trả generic. Cleanup endpoint dùng constant-time bearer comparison, trả 404 khi unauthorized và không cache. Service-role helper có `server-only` boundary, không có biến public hay client import. Security advisor không còn anonymous executable RLS helper.

## 6. RLS and Storage

RLS/grants/RPC tests giữ owner isolation cho profile, progress và mọi practice engine. Draft/published content, answer key private schema, essay, transcript, feedback và private audio không bị mở rộng quyền. Storage cleanup dùng DB lease, stale retry và xóa object trước khi finalize metadata; remote invariant verifier pass 12/12.

## 7. Privacy

Đăng ký lưu versioned acceptance cho terms/privacy. Policy công khai mô tả dữ liệu, AI, 30-day audio retention và DSR contact lấy từ production env. Audio có deadline bắt buộc và deletion audit state.

## 8. AI safety and cost

AI vẫn optional/fail-closed, yêu cầu consent, schema validation và signed finalization. Speaking transcript/feedback có retry cap, weekly/burst quotas và advisory lock chống concurrent reservation. Provider payload, token, signed URL và secret không được log.

## 9. Performance

Speaking transcript/audio metadata được batch để bỏ N+1 database reads. Cleanup và quota paths có partial/recent indexes. Provider calls vẫn tuần tự có chủ đích để kiểm soát chi phí; remote performance advisor báo 0 issue.

## 10. UX and accessibility

Không redesign. Destructive final submits dùng alert dialog có focus trap/restore và xác nhận rõ; app shell xử lý focus/inert; recorder có timer và xóa recording local. Playwright bao phủ 375/768/1024/1440, keyboard và axe.

## 11. Test matrix

Format/lint/typecheck/build/audit đều pass; 36 files/127 unit-component tests pass; 22 files/737 pgTAP assertions pass; Playwright 73 passed, 19 documented skips, 0 failed; remote verifier 12/12. Chi tiết tại `FINAL_TEST_REPORT.md`.

## 12. Deployment checklist

Thứ tự deploy, migration forward-only, post-deploy smoke, scheduler retention và rollback nằm tại `DEPLOYMENT_CHECKLIST.md`. Không dùng `db reset --linked` hay destructive down migration.

## 13. Environment checklist

Public env chỉ gồm Supabase URL/anon key, canonical site URL và support email. Service role, cleanup/signing secrets và AI key/model là server-only trong secret manager. Production validation chặn cấu hình thiếu hoặc cặp env không nhất quán; không ghi giá trị secret vào docs.

## 14. Backup and rollback

Trước mở traffic phải xác nhận backup/PITR và restore rehearsal theo RPO 24h/RTO 4h. App rollback về artifact trước; schema incident dùng forward-fix migration mới, restore vào project cô lập trước khi cut-over.

## 15. Remaining known issues

Không còn P0/P1 code/schema blocker. `KI-085` là production traffic gate do cấu hình ngoài repo: backup/PITR, leaked-password protection/Auth/SMTP/CAPTCHA, scheduler, monitoring và provider budget alerts. `KI-086` được kiểm soát bằng required support-email env và post-deploy policy smoke.

## 16. Verdict

**PHASE 10C COMPLETE.** Repo/schema Definition of Done đã đủ. **Production traffic vẫn NO-GO** cho tới khi operator check toàn bộ external release gates trong `PRODUCTION_READINESS_CHECKLIST.md`; hai kết luận này không đồng nghĩa Phase còn thiếu code.

## 17. Next recommended work

Tạo release commit, để CI chạy trên đúng commit, hoàn tất external production checklist, deploy theo runbook, chạy post-deploy smoke và lưu evidence vận hành không chứa secret. Không mở feature phase mới trong cùng release change.
