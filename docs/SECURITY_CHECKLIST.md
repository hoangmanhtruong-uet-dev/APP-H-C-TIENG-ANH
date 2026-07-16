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

- [x] Supabase Auth session chỉ được xác minh bằng server client ở protected operations hiện có.
- [x] Next.js Proxy chỉ redirect/refresh phục vụ UX; protected server layout xác minh lại bằng `getUser()`.
- [-] Register/login dùng generic feedback; reset chưa triển khai trong scope hiện tại.
- [ ] Reset token single-use, expiry hợp lý, không xuất hiện trong log/referrer.
- [x] Email confirmation, Gmail SMTP, template callback và inbox thật đã manual verify trên remote.
- [x] Logout/revocation xử lý session thiết bị hiện tại bằng local scope; logout-all để phase cần thiết.
- [ ] Session expiry giữa autosave/submit có UX recovery, không mất draft.
- [x] Redirect sau login chỉ nhận protected relative path allowlisted; đã test absolute, `//`, backslash, encoded và control character.
- [-] Supabase Auth chịu rate limit; remote rate configuration chưa verify.
- [ ] Admin/Super Admin bật MFA trước public beta.

## 3. Authorization, ownership và IDOR

- [x] Profile mutation không nhận `user_id`/profile id từ client; actor lấy từ verified server session.
- [x] Onboarding save/complete/preference actions không nhận `user_id`; explicit allowlist mapping, actor lấy từ server session.
- [ ] Owner query scope theo actor ở repository; không query ID đơn độc.
- [ ] Resource không thuộc actor trả 404 hoặc 403 theo policy nhất quán, không leak existence.
- [x] Mọi Server Action Phase 2 kiểm public/auth context phù hợp; profile mutation require actor phía server.
- [x] Onboarding guard xác minh server-side trước render; auth guard và completion guard không bị trộn vào Proxy.
- [ ] Role được map sang permission; không dùng một boolean `is_admin` cho mọi quyền.
- [ ] Content editor không mặc định có quyền publish/user sensitive view.
- [ ] Support chỉ xem trường tối thiểu cần thiết.
- [ ] Role grant/revoke chỉ qua protected use case, có audit.
- [-] `profiles` có pgTAP A/B/anon local; authenticated client E2E với hai JWT thật chưa chạy.
- [x] `learner_profiles` có A/B/anon tests trực tiếp trên remote: own SELECT/UPDATE allowed, other row hidden/unchanged, anon denied.
- [ ] Negative tests cho guessed UUID, nested child ID, source reference và signed URL.

## 4. Supabase RLS và database

- [x] RLS bật trên `public.profiles` và `public.learner_profiles`.
- [x] Profiles có SELECT-own/UPDATE-own; không cấp client INSERT/DELETE.
- [x] `learner_profiles.user_id` là PK/FK và mọi policy ownership so với `(select auth.uid())`.
- [ ] Learner không trực tiếp update immutable submission/result/audit/event.
- [ ] Published content read policy không mở draft/answer key.
- [x] Ứng dụng không có service-role client/key; migration/RLS test không dùng service role.
- [x] `handle_new_auth_user` SECURITY DEFINER có empty `search_path`, schema-qualified objects và revoked execute grants.
- [x] Onboarding date validator và completion RPC là SECURITY DEFINER hardened, schema-qualified, empty `search_path`; trigger function không executable bởi client.
- [-] Constraints enforce onboarding band/range/skills/completion invariants; active goal/plan invariants chờ schema tương lai.
- [x] 130 database assertions local; 21 Phase 2 và 42 Phase 3 assertions trực tiếp trên remote chạy transaction rollback với `authenticated`/`anon`, hai auth users và JWT claim giả lập, không dùng service role. Hai direct anon UPDATE/DELETE assertions bổ sung pass local; remote privilege assertion chứng minh anon không có hai grants này.
- [x] Grants least privilege đã kiểm chứng trực tiếp trên local và remote; remote lint không có schema error.

## 5. Input validation và output encoding

- [x] Mọi mutation Phase 2 có Zod server schema; HTML attributes chỉ hỗ trợ UX.
- [x] Mutation onboarding có Zod server schema cho canonical test type/goal, half-band, timezone-safe date, duration, days và unique skill array.
- [-] UUID, enum, band, date và onboarding array size có giới hạn; word count/JSON depth chờ feature tương ứng.
- [ ] Unknown fields bị strip/reject theo contract.
- [ ] Text người dùng render như text; rich text được sanitize bằng allowlist.
- [ ] Không render raw HTML từ content/user/AI.
- [ ] URL nguồn/asset validate protocol/domain khi cần.
- [ ] CSV/content import chống formula injection, oversized row và zip bomb nếu được bổ sung.
- [x] Auth/profile errors được map tập trung, không trả raw provider/SQL/stack/token; có request ID cho form error.

## 6. XSS, CSRF và browser security

- [ ] CSP được cấu hình và test; tránh `unsafe-inline/eval` nếu không có lý do.
- [ ] Security headers: HSTS ở production, `X-Content-Type-Options`, `Referrer-Policy`, frame policy và Permissions Policy.
- [-] Cookie do `@supabase/ssr` quản lý và propagate đúng framework; production flags cần verify trên deployment thật.
- [ ] State-changing request có CSRF protection theo framework/origin checks.
- [ ] CORS chỉ allow origins cần thiết; không `*` với credentials.
- [ ] Mic permission chỉ xin tại hành động rõ ràng; Permissions Policy giới hạn microphone.
- [ ] External link dùng `rel="noopener noreferrer"` khi mở tab mới.
- [x] Auth confirmation redirect và health responses đặt no-store; chưa có signed URL/storage trong scope.

## 7. Secrets và configuration

- [x] `.env*` thực nằm trong `.gitignore`; chỉ `.env.example` được commit.
- [x] Chỉ public Supabase URL/anon key dùng `NEXT_PUBLIC_`; không có service-role/secret key.
- [x] `E2E_AUTH_*` và `E2E_ONBOARDING_*` chỉ có tên rỗng trong `.env.example`; credential thật không Git track.
- [ ] Env validation fail fast và phân biệt dev/staging/prod.
- [ ] Secret manager/provider env được dùng cho production.
- [ ] Secret rotation runbook và owner rõ.
- [ ] CI log/artifact không in env hoặc signed URL.
- [ ] Dependency/secret scanning chạy CI; lockfile committed.
- [ ] Preview deploy không có production secrets/data.

## 7.1. Phase 3 completion/cache integrity

- [x] Browser không thể update `onboarding_completed_at`; column grant bị revoke và completion chỉ qua RPC.
- [x] RPC tự lấy `auth.uid()`, lock own row, validate required fields và giữ timestamp lần complete đầu tiên.
- [x] Không có DELETE grant/policy cho learner profile; anon không có table/RPC access.
- [x] Không dùng service-role client, `USING (true)`, mass assignment, localStorage source-of-truth hay onboarding payload trong URL.
- [x] Learner profile chỉ memoize request-scoped; không static/shared cache private state.
- [x] Action errors map sang thông báo tiếng Việt + request ID, không leak SQL/provider details.

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

## 17. Phase 4 learning content và progress

- [x] RLS bật trên module, lesson, version, section và hai bảng progress.
- [x] Full parent-chain policy ngăn draft/in-review leak; learner test type được kiểm tra tại database.
- [x] `anon` không có content/progress table privilege.
- [x] `authenticated` chỉ SELECT table; không có direct INSERT/UPDATE/DELETE content hoặc progress.
- [x] Progress ownership dùng `auth.uid() = user_id`; cross-user/anonymous được pgTAP kiểm tra local.
- [x] RPC không nhận `user_id`, status, percent, completed timestamp hoặc section count từ client.
- [x] Completion tính từ required sections trong transaction và idempotent.
- [x] `SECURITY DEFINER` functions có empty `search_path`, schema-qualified names và revoke PUBLIC/anon.
- [x] Published versions/sections immutable và publish validation yêu cầu required content.
- [x] Markdown renderer dùng `skipHtml`, không `dangerouslySetInnerHTML`, chặn `javascript:` và harden external links.
- [x] User progress không shared-cache/static generate; mutation revalidate các route có liên quan.
- [x] E2E runner fail-closed theo dedicated port và expected Supabase project ref trước authenticated mutation.
- [x] `.env.local`, CLI token/password và credential names/values không Git track; `.env.example` chỉ có placeholder rỗng.
- [x] Phase 4 file test chính chạy trực tiếp trên remote bằng database-owner session: 66/66 PASS, fixture transaction rollback; password không gửi/lưu.
- [x] Wrapper `\ir` lỗi đã xóa; command remote dùng trực tiếp file chính, không duplicate assertions hoặc test logic.
- [-] 8 authenticated Playwright cases vẫn skip rõ vì chưa có dedicated credentials/project ref (`KI-072`); không ghi thành PASS.

## 18. Phase 5 exercise, vocabulary và grammar

- [x] Published exercise/vocabulary/grammar chỉ đọc qua RLS; draft/in-review/archived không lộ qua learner Data API.
- [x] Answer keys/correct options/exact-text keys nằm trong schema `private`; `authenticated`/`anon` không có SELECT hoặc schema usage để đọc key.
- [x] Learner không có direct INSERT/UPDATE/DELETE trên attempt/answer/content tables.
- [x] RPC lấy actor từ `auth.uid()`, không nhận `user_id`, owner, score, status, completion hoặc correct answer từ client.
- [x] Attempt/answer ownership, question-version membership và option-question membership được kiểm tra trong database.
- [x] Submit lock row, tính score từ private key của pinned published version, idempotent và freeze submitted attempt.
- [x] Save dùng expected revision; stale update và invalid/duplicate option bị reject.
- [x] Result/solution chỉ available sau submit và chỉ cho owner; Playwright hai user đã xác nhận cross-user denial.
- [x] Published content/key immutable; thay đổi nội dung phải tạo version mới.
- [x] Server Actions validate Zod, không render raw database errors và không dùng service-role key.
- [x] Grammar Markdown giữ raw HTML disabled; seed nguyên bản, nhỏ và có chất lượng.
- [x] Local Phase 5 pgTAP 64/64 và full database suite 284 tests pass; remote migration/history/lint/types pass.
- [x] Remote Phase 5 content counts/stable IDs/status và fingerprint khớp local sau data migration; không reset, delete user/attempt hay nới grants.
- [x] Remote transactional Phase 5 pgTAP đã chạy bằng database-owner session sau seed fix: planned 24, ran 24, failed 0, PASS; password nhập ẩn, không gửi/lưu (`KI-075` closed).

## 20. Phase 6 Reading security

- [x] Compatible completed learners read only published Reading content; draft and incompatible test-type content are hidden by actor RLS.
- [x] `anon` has no Reading table access; authenticated learners have SELECT-only content grants and no direct mutation grants.
- [x] Private answer keys have no learner SELECT/usage path; pre-submit result is rejected.
- [x] Start/save/submit/clock/result RPCs derive `auth.uid()`, use empty `search_path`, qualified names and restricted execute grants.
- [x] Timer, score, correctness and submission timestamps are database-derived; client countdown is display-only.
- [x] Save locks the owner attempt, validates pinned membership and revision; stale writes cannot overwrite newer data.
- [x] Submit is atomic/idempotent and scores private keys of the pinned immutable version.
- [x] Actor-real local pgTAP and two-user Playwright verify draft isolation, anon denial and cross-user denial without service-role application access.
- [x] Seed is original, source/licence-tagged content; no official test import or raw HTML.
- [x] Direct remote database-owner verifier connected and reported planned 34, ran 34, failed 0, no `not ok`, no `ERROR`, PASS; fixture transaction rolled back and the hidden password was neither sent nor stored in chat (`KI-076` closed).

## 21. Phase 7 Listening security

- [x] Compatible completed learners read only published Listening metadata/parts/questions; draft set, draft audio metadata and unpublished content are hidden by RLS.
- [x] `anon` has no Listening table access; `authenticated` receives SELECT-only public content grants and no direct content/attempt mutation grants.
- [x] Transcript and answer keys remain in schema `private`; authenticated/anon cannot select them directly.
- [x] Transcript is returned only by owner-scoped `get_listening_attempt_result` after the shared result RPC confirms `status = scored`.
- [x] Start/save/submit/clock/result derive actor from `auth.uid()`; client payload has no accepted user, score, correctness, submission time or remaining-time authority.
- [x] Generic attempt deadline is derived from the published mapping and database start time; late status compares database `submitted_at` with `expires_at`.
- [x] Autosave locks the attempt and enforces monotonic client revision; identical replay is safe and conflicting stale payload returns SQLSTATE `40001`.
- [x] Submit locks the owner attempt, creates missing blank answers, scores private keys atomically, freezes finalized answers and safely replays after scoring.
- [x] Published audio/mapping/parts/transcript are immutable; publication validates controlled audio, private transcript, contiguous parts, supported question types and audio ranges.
- [x] Public binary exists only for the published original fixture; the draft fixture has metadata for isolation testing but no shipped public audio file.
- [x] Local actor-real pgTAP, two-user Playwright and anonymous checks cover draft/key/transcript/cross-user isolation without service-role application access.
- [x] Audio checksum, duration, source and licence are persisted; seed is project-authored and does not contain copyrighted IELTS test/audio material.
- [x] Local full pgTAP 465/465, local and remote lint, remote migration parity 9/9, 98 unit/component tests and 50 Playwright tests pass.
- [x] Direct remote database-owner verifier ran through `ok 34`, failed 0, with no `not ok` and no `ERROR`; the fixture transaction rolled back and the database password was neither sent nor stored in chat (`KI-079` closed).

## 19. Sign-off

| Role             | Người duyệt | Ngày | Kết quả/Ghi chú |
| ---------------- | ----------- | ---- | --------------- |
| Engineering      |             |      |                 |
| Product          |             |      |                 |
| Security/Privacy |             |      |                 |
| Release owner    |             |      |                 |
