# SECURITY CHECKLIST - Web tự học IELTS

> Phiên bản: 1.0  
> Baseline: private beta; defense in depth  
> Quy tắc: RLS không thay thế server authorization

## 1. Release blockers

Không phát hành private beta nếu còn một trong các điều sau:

- [ ] User A có thể đọc/sửa/xóa resource của user B.
- [ ] Service-role/OpenAI key/token xuất hiện trong browser bundle, log hoặc error response.
- [ ] Writing/audio/transcript private có thể truy cập bằng public URL.
- [ ] Submit/upload/AI job có thể bị double-charge hoặc tạo duplicate không kiểm soát.
- [ ] AI output invalid được hiển thị như feedback hợp lệ.
- [ ] Admin mutation thiếu permission check hoặc audit.
- [ ] Không có delete/retention policy cho recording.
- [ ] Không có backup/restore test hoặc rollback plan.

## 2. Authentication và session

- [ ] Supabase Auth session chỉ được xác minh bằng server client ở protected operations.
- [ ] Middleware chỉ redirect/refresh phục vụ UX, không làm authorization boundary duy nhất.
- [ ] Register/login/reset không tiết lộ account tồn tại quá mức cần thiết.
- [ ] Reset token single-use, expiry hợp lý, không xuất hiện trong log/referrer.
- [ ] Email verification policy được chốt theo environment.
- [ ] Logout/revocation xử lý trên thiết bị hiện tại; có chiến lược logout-all khi cần.
- [ ] Session expiry giữa autosave/submit có UX recovery, không mất draft.
- [ ] Redirect sau login chỉ nhận relative path allowlisted; test `//evil.com`, encoded URL và nested redirect.
- [ ] Auth endpoints có abuse/rate protection.
- [ ] Admin/Super Admin bật MFA trước public beta.

## 3. Authorization, ownership và IDOR

- [ ] Không nhận `user_id` từ client làm nguồn owner.
- [ ] Owner query scope theo actor ở repository; không query ID đơn độc.
- [ ] Resource không thuộc actor trả 404 hoặc 403 theo policy nhất quán, không leak existence.
- [ ] Server Action/Route Handler kiểm permission cho mọi mutation.
- [ ] Role được map sang permission; không dùng một boolean `is_admin` cho mọi quyền.
- [ ] Content editor không mặc định có quyền publish/user sensitive view.
- [ ] Support chỉ xem trường tối thiểu cần thiết.
- [ ] Role grant/revoke chỉ qua protected use case, có audit.
- [ ] User A/B integration tests cho mọi user-owned table/endpoint.
- [ ] Negative tests cho guessed UUID, nested child ID, source reference và signed URL.

## 4. Supabase RLS và database

- [ ] RLS bật trên mọi table public chứa user/admin data.
- [ ] Policy `SELECT`, `INSERT`, `UPDATE`, `DELETE` được review riêng.
- [ ] Child table policy dựa trên `user_id` denormalized hoặc indexed parent ownership.
- [ ] Learner không trực tiếp update immutable submission/result/audit/event.
- [ ] Published content read policy không mở draft/answer key.
- [ ] Service-role chỉ tồn tại server/worker; không dùng để bỏ qua invariant tùy tiện.
- [ ] Database function `SECURITY DEFINER` có fixed `search_path`, permission tối thiểu và input validation.
- [ ] Constraints enforce active goal/plan, uniqueness, band range và state invariants quan trọng.
- [ ] RLS tests chạy bằng hai real authenticated test users, không phải service role.
- [ ] Migration user/role được least privilege; production không dùng owner credential trong app runtime.

## 5. Input validation và output encoding

- [ ] Mọi mutation có Zod/server schema; client validation chỉ hỗ trợ UX.
- [ ] UUID, enum, band, date, timezone, word count, array size và JSON depth có giới hạn.
- [ ] Unknown fields bị strip/reject theo contract.
- [ ] Text người dùng render như text; rich text được sanitize bằng allowlist.
- [ ] Không render raw HTML từ content/user/AI.
- [ ] URL nguồn/asset validate protocol/domain khi cần.
- [ ] CSV/content import chống formula injection, oversized row và zip bomb nếu được bổ sung.
- [ ] Error response không chứa stack, SQL, provider raw error, secret hoặc prompt.

## 6. XSS, CSRF và browser security

- [ ] CSP được cấu hình và test; tránh `unsafe-inline/eval` nếu không có lý do.
- [ ] Security headers: HSTS ở production, `X-Content-Type-Options`, `Referrer-Policy`, frame policy và Permissions Policy.
- [ ] Cookie auth có Secure, HttpOnly, SameSite phù hợp do provider/framework cấu hình.
- [ ] State-changing request có CSRF protection theo framework/origin checks.
- [ ] CORS chỉ allow origins cần thiết; không `*` với credentials.
- [ ] Mic permission chỉ xin tại hành động rõ ràng; Permissions Policy giới hạn microphone.
- [ ] External link dùng `rel="noopener noreferrer"` khi mở tab mới.
- [ ] Sensitive response/sign URL dùng `Cache-Control: no-store`.

## 7. Secrets và configuration

- [ ] `.env*` thực chứa secret nằm trong `.gitignore`; chỉ commit `.env.example`.
- [ ] Không prefix `NEXT_PUBLIC_` cho service role, OpenAI key, model policy hoặc internal endpoint secret.
- [ ] Env validation fail fast và phân biệt dev/staging/prod.
- [ ] Secret manager/provider env được dùng cho production.
- [ ] Secret rotation runbook và owner rõ.
- [ ] CI log/artifact không in env hoặc signed URL.
- [ ] Dependency/secret scanning chạy CI; lockfile committed.
- [ ] Preview deploy không có production secrets/data.

## 8. Upload, audio và storage

- [ ] Speaking recordings ở private bucket.
- [ ] Storage path scoped theo owner + random UUID; client không tự chọn arbitrary path.
- [ ] Upload intent có expiry, one-time finalize, expected mime/size/duration.
- [ ] Server verify metadata/checksum sau upload; không tin browser.
- [ ] Mime allowlist dựa trên content inspection khi khả thi, không chỉ extension.
- [ ] Max size/duration và concurrent upload quota.
- [ ] Signed read/upload URL TTL ngắn, không log/cache/share.
- [ ] Orphan upload cleanup và quarantine/delete invalid object.
- [ ] Delete while processing tránh race; job dừng hoặc bỏ kết quả.
- [ ] Retention và consent version lưu cùng submission.
- [ ] Public content asset có licence; user media không vô tình chuyển public.

## 9. AI và prompt security

- [ ] OpenAI call chỉ server-side/worker.
- [ ] System/rubric/task/user content tách layer; user submission nằm trong delimiter và được coi là data.
- [ ] Prompt injection test không làm lộ system prompt hoặc thực thi mutation.
- [ ] AI không có tool có thể publish content, sửa score/goal hoặc đọc user khác trong MVP.
- [ ] Structured Output schema + Zod validation bắt buộc.
- [ ] Validate band range, evidence substring/segment, item count và disclaimer.
- [ ] Audio im lặng/noisy/quá ngắn trả actionable error, không chấm giả.
- [ ] Model/prompt/rubric version được pin và lưu theo run.
- [ ] Raw provider response có redaction, access hạn chế và retention ngắn.
- [ ] Quota/rate limit/max input/timeout/retry/budget alert.
- [ ] Retry không tạo concurrent duplicate hoặc double-charge không kiểm soát.
- [ ] Fixed regression/adversarial set chạy khi đổi model/prompt/rubric.

## 10. Idempotency, concurrency và integrity

- [ ] Idempotency bắt buộc cho practice/writing submit, upload finalize, AI enqueue, plan regenerate và publish.
- [ ] Key scope actor + operation; payload hash mismatch trả conflict.
- [ ] DB unique constraint bảo vệ duplicate kể cả app retry race.
- [ ] Practice submit lock state và score một lần.
- [ ] Job claim có row lock/lease; worker chết được recover.
- [ ] Autosave dùng optimistic concurrency; conflict không silent overwrite.
- [ ] Published content/submission/revision/feedback run immutable.
- [ ] Plan regeneration supersede trong transaction; chỉ một active plan.
- [ ] External provider call không nằm trong DB transaction dài.

## 11. Privacy và data protection

- [ ] Privacy notice mô tả dữ liệu học, AI processing, audio, analytics và provider.
- [ ] Consent audio/AI versioned; revoke flow được định nghĩa.
- [ ] Data minimization: không thu trường không dùng.
- [ ] Export account data theo format hợp lý.
- [ ] Delete account/media/transcript workflow có trạng thái và SLA.
- [ ] Retention cụ thể cho audio, raw AI response, logs, raw events và backups.
- [ ] Logs/analytics không chứa raw essay/transcript/audio/signed URL/email khi không cần.
- [ ] Actor ID trong logs được hash/pseudonymize nếu mục đích cho phép.
- [ ] Admin sensitive view là restricted, reason-based và audit.
- [ ] Backup mã hóa và retention/access được review.

## 12. Logging, monitoring và incident response

- [ ] Mọi error response có trace ID; log có request/trace/operation/error code.
- [ ] Redaction test cho token, key, email, essay, transcript và signed URL.
- [ ] Alert auth/authorization denial spike, job backlog, schema failure, upload failure và cost anomaly.
- [ ] Audit log append-only cho role, publish/archive, feature flag, job retry/cancel và user status.
- [ ] Alert không gửi sensitive content sang Slack/email mặc định.
- [ ] Incident runbook: credential leak, cross-user access, public media, provider outage, data loss.
- [ ] Quy trình rotate secret, revoke sessions, disable feature flag và notify affected users.

## 13. Admin và operations

- [ ] Admin route authorize ở server; ẩn nav không được coi là control.
- [ ] Permission matrix được test cho learner/editor/support/admin/super admin.
- [ ] Publish validate answer/source/licence/assets trước mutation.
- [ ] Retry/cancel AI job có reason, state check, idempotency và audit.
- [ ] Feature flag update có environment scope và audit before/after summary.
- [ ] User status change không cho tự khóa super admin cuối cùng nếu policy yêu cầu.
- [ ] Admin search/list không trả raw sensitive content mặc định.
- [ ] Audit log view không cho sửa/xóa từ app.

## 14. Availability và abuse

- [ ] Rate limit theo user/feature; auth có IP/account combination.
- [ ] Quota AI tuần/tháng và concurrent jobs.
- [ ] Limit pagination, search length, JSON depth, draft size, upload size/duration.
- [ ] Timeout provider/DB; retry có exponential backoff + jitter.
- [ ] Circuit/feature flag tắt AI Speaking/Writing khi provider/cost bất thường.
- [ ] Health endpoint không thực hiện expensive work hoặc lộ dependency details.
- [ ] DB connection limit và worker concurrency theo environment.

## 15. Dependency, build và release

- [ ] Package versions/lockfile pinned; review changelog trước major update.
- [ ] CI dùng clean locked install.
- [ ] SAST/dependency audit/secret scan không có P0/P1 unresolved.
- [ ] Source maps production được bảo vệ theo provider setup.
- [ ] Staging tách data/secret; smoke test sau deploy.
- [ ] Migration rehearsal, backup/restore drill, rollback/forward-fix plan.
- [ ] Feature flag rollout theo cohort; public registration OFF cho private beta.
- [ ] `KNOWN_ISSUES.md` nêu rõ security limitation còn lại được chấp nhận.

## 16. Test matrix bắt buộc

| Area        | Cases tối thiểu                                                                 |
| ----------- | ------------------------------------------------------------------------------- |
| Cross-user  | User A đọc/sửa/delete ID của B qua mọi owner endpoint                           |
| Role        | Editor publish, support sensitive view, admin role grant, super-admin only flag |
| Auth        | Expired session, reset reuse, email unverified, open redirect                   |
| XSS         | Essay/note/content/AI chứa script/event handler/HTML                            |
| Upload      | Wrong mime, oversized, interrupted, expired URL, path tamper, delete race       |
| AI          | Prompt injection, invalid schema/evidence, timeout/retry, cost quota            |
| Concurrency | Double submit, duplicate job, stale autosave, concurrent publish                |
| Leakage     | Transcript/answer key before submit; signed URL/log/cache leak                  |

## 17. Sign-off

| Role             | Người duyệt | Ngày | Kết quả/Ghi chú |
| ---------------- | ----------- | ---- | --------------- |
| Engineering      |             |      |                 |
| Product          |             |      |                 |
| Security/Privacy |             |      |                 |
| Release owner    |             |      |                 |
