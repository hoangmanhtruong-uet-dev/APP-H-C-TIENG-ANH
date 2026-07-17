# KNOWN ISSUES - Web tự học IELTS

## Phase 10C release follow-up

| ID | Sev | Issue | Impact | Resolution / gate | Status |
| --- | --- | --- | --- | --- | --- |
| KI-084 | P1 | Phase 10C linked migration/parity/owner verifier evidence was required after local hardening | Previously blocked `COMPLETE` | Closed 2026-07-17: forward-only push, parity 20/20, linked lint clean and Management API/database-owner rollback verifier 12/12; no remote reset | CLOSED |
| KI-085 | P1 | Backup/PITR, SMTP/Auth/CAPTCHA and scheduler configuration live outside the repo | Blocks production traffic if operator has not checked them | Use production/deployment checklist and record environment evidence without secret values | RELEASE GATE |
| KI-086 | P2 | Privacy/terms identify the operator through deploy-time support email rather than a hard-coded legal entity | Wrong build env could publish a placeholder contact | Production env validation requires support email; verify rendered policy in post-deploy smoke | CONTROLLED |

No accepted issue permits cross-user, draft, answer-key, audio, transcript or essay leakage. Any such finding is P0 and blocks release.

> Phiên bản: 1.0  
> Trạng thái repo hiện tại: Phase 1–10C COMPLETE. Phase 10C đã apply forward-only với parity 20/20, local/remote lint sạch, full local/app/browser gates và rollback-only remote verifier 12/12 (`KI-084` closed). External production configuration vẫn là release gate `KI-085`.
> Mục đích: ghi rủi ro, quyết định mở và giới hạn được chấp nhận; không dùng để che P0/P1

## 1. Quy ước

### Severity

- `P0`: có thể gây lộ/mất dữ liệu nghiêm trọng hoặc hệ thống không thể phát hành.
- `P1`: phá critical flow, quyền riêng tư, tính đúng của kết quả hoặc reliability chính.
- `P2`: ảnh hưởng đáng kể nhưng có workaround chấp nhận được trong private beta.
- `P3`: cải tiến/giới hạn nhỏ.

### Status

`OPEN`, `DECISION_NEEDED`, `PLANNED`, `MITIGATED`, `ACCEPTED`, `CLOSED`.

## 2. Blockers trước khi implementation

| ID     | Sev | Vấn đề                                                                    | Ảnh hưởng                                                | Hướng xử lý                                                              | Target    | Status          |
| ------ | --- | ------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------ | --------- | --------------- |
| KI-001 | P1  | Chưa chốt runtime/package versions và package manager                     | Build không reproducible, docs có thể lệch API framework | npm, Node runtime, Next/Supabase packages/CLI, lockfile và migration workflow đã chốt | Phase 0/1 | CLOSED |
| KI-002 | P1  | Chưa có Supabase project/environment strategy                             | Không thể validate Auth/RLS/migration                    | Local stack và linked remote đã tách bằng public env validation, migration parity, dry-run/push và fail-closed E2E project ref | Phase 1 | CLOSED |
| KI-003 | P1  | Chưa chốt retention/deletion cho audio, transcript, AI raw response, logs | Privacy flow và schema cleanup chưa hoàn chỉnh           | Viết retention table + delete/export SLA trước Speaking beta             | Phase 0/6 | DECISION_NEEDED |
| KI-004 | P2  | Taxonomy MVP chưa đóng băng                                               | Content, question renderer và analytics dễ drift         | Chốt codes Reading/Listening/Writing/Speaking/difficulty/topic           | Phase 0/3 | DECISION_NEEDED |
| KI-005 | P2  | Chưa chốt ngưỡng AI evaluation để bật feature                             | Không có release gate định lượng                         | Định nghĩa schema/evidence pass rate, ordering tolerance, helpful sample | Phase 5   | DECISION_NEEDED |

## 3. Rủi ro sản phẩm và nội dung

| ID     | Sev | Rủi ro                                           | Dấu hiệu                                             | Giảm thiểu                                                                   | Status   |
| ------ | --- | ------------------------------------------------ | ---------------------------------------------------- | ---------------------------------------------------------------------------- | -------- |
| KI-010 | P1  | Scope quá lớn, nhiều module dở                   | Nhiều route nhưng không có vertical slice hoàn chỉnh | Theo Phase/exit criteria; feature flags; 30-50 objects chất lượng            | OPEN     |
| KI-011 | P1  | Nội dung ít hoặc chất lượng thấp                 | Completion thấp, report cao, taxonomy trống          | Workflow draft/review/version; item stats; seed có review                    | OPEN     |
| KI-012 | P1  | Vi phạm bản quyền đề/sách/audio                  | Source/licence trống; scrape/import không kiểm soát  | Nội dung tự biên soạn/cấp phép; metadata bắt buộc; publish validation        | OPEN     |
| KI-013 | P1  | Người dùng bỏ học do plan quá tải                | Missed days, skip rate, backlog tăng                 | Time budget, reschedule thay vì dồn, weekly review, user research            | OPEN     |
| KI-014 | P2  | IELTS General Training bị hiểu nhầm là đã hỗ trợ | User chọn flow không đủ content/rubric               | Academic mặc định; General flag OFF/nhãn chưa hỗ trợ                         | ACCEPTED |
| KI-015 | P2  | Diagnostic MVP không đủ 4 kỹ năng                | Baseline confidence thấp                             | Hiển thị confidence rõ; self-assessment có nhãn; bổ sung diagnostic sau core | ACCEPTED |

## 4. Rủi ro dữ liệu và backend

| ID     | Sev | Rủi ro                                                | Failure mode                      | Giảm thiểu                                                              | Status   |
| ------ | --- | ----------------------------------------------------- | --------------------------------- | ----------------------------------------------------------------------- | -------- |
| KI-020 | P0  | RLS/ownership sai                                     | User A đọc/sửa dữ liệu B          | Profiles và learner_profiles đã pass local/remote A/B/anon tests; tiếp tục bắt buộc cho bảng mới | MITIGATED |
| KI-021 | P0  | Mất draft/bài nộp                                     | Network/reload/conflict overwrite | Local recovery + server revision + immutable submit + E2E network tests | PLANNED  |
| KI-022 | P1  | Double submit/job                                     | Duplicate score/cost/feedback     | Idempotency record + unique DB constraint + state lock                  | PLANNED  |
| KI-023 | P1  | Content update làm đổi result cũ                      | Answer/explanation drift          | Snapshot `content_version_id`; published immutable                      | PLANNED  |
| KI-024 | P1  | Plan regenerate tạo duplicate/overload                | Nhiều active plan/task trùng      | Transaction, partial unique, deterministic generator, idempotency       | PLANNED  |
| KI-025 | P1  | Timezone làm sai Today/streak/aggregate               | Task lệch ngày quanh UTC boundary | IANA timezone, local date service, boundary tests                       | PLANNED  |
| KI-026 | P2  | Polymorphic `source_type/source_id` thiếu FK toàn vẹn | Dangling source/error/task        | Validate trong service, source registry/trigger nếu drift xuất hiện     | ACCEPTED |
| KI-027 | P2  | JSONB schema drift                                    | Query/renderer khó tương thích    | Zod + `schema_version`; normalize field thường query                    | PLANNED  |
| KI-028 | P2  | DB queue không đủ tải                                 | Job backlog/lock contention       | Metrics; concurrency limit; nâng managed queue theo evidence            | ACCEPTED |

## 5. Rủi ro AI

| ID     | Sev | Rủi ro                                    | Failure mode                       | Giảm thiểu                                                         | Status   |
| ------ | --- | ----------------------------------------- | ---------------------------------- | ------------------------------------------------------------------ | -------- |
| KI-030 | P1  | Feedback không ổn định/sai schema         | UI vỡ hoặc learner tin kết quả sai | Structured Output, validation, versioning, failed state, eval set  | PLANNED  |
| KI-031 | P1  | Evidence không có trong bài               | AI bịa dẫn chứng                   | Post-validate substring/segments; reject run                       | PLANNED  |
| KI-032 | P1  | Prompt injection từ bài/content           | Lộ prompt, bỏ rubric hoặc mutation | Delimiter, no tools, schema, adversarial tests                     | PLANNED  |
| KI-033 | P1  | Audio im lặng/noisy vẫn được chấm         | Feedback giả                       | Precheck duration/silence/quality; no-score state                  | PLANNED  |
| KI-034 | P1  | Chi phí AI tăng ngoài dự kiến             | Quota/budget vượt                  | Per-user quota, max input, usage/cost metrics, flag/circuit off    | PLANNED  |
| KI-035 | P2  | Provider/model thay đổi behavior          | Regression sau upgrade             | Pin model/config, prompt/rubric version, fixed eval before rollout | OPEN     |
| KI-036 | P2  | Pronunciation estimate có confidence thấp | Người học hiểu là score chính thức | Limitation field, confidence, disclaimer, transcript edit          | ACCEPTED |
| KI-037 | P2  | Polling job status tạo tải                | Nhiều request khi backlog dài      | Backoff/revalidate; chuyển push/realtime chỉ khi metrics yêu cầu   | ACCEPTED |

## 6. Rủi ro storage và privacy

| ID     | Sev | Rủi ro                                   | Failure mode                                 | Giảm thiểu                                                   | Status          |
| ------ | --- | ---------------------------------------- | -------------------------------------------- | ------------------------------------------------------------ | --------------- |
| KI-040 | P0  | Recording trở thành public               | Lộ giọng nói/dữ liệu cá nhân                 | Private bucket, owner policy, signed URL ngắn, leakage tests | PLANNED         |
| KI-041 | P1  | Orphan upload tăng storage               | Upload thành công nhưng finalize fail        | Upload intent/expiry/checksum + cleanup job                  | PLANNED         |
| KI-042 | P1  | Delete khi job đang xử lý gây race       | AI output xuất hiện lại sau delete           | Tombstone/cancel/version check trước persist result          | OPEN            |
| KI-043 | P1  | Sensitive content lọt log/error tracking | Essay/transcript/email/token bị gửi ra ngoài | Redaction middleware + tests + provider privacy config       | PLANNED         |
| KI-044 | P2  | Data export/delete scope chưa chốt       | Yêu cầu user xử lý thủ công                  | Chốt retention matrix và workflow trước beta                 | DECISION_NEEDED |

## 7. Rủi ro UI, accessibility và vận hành

| ID     | Sev | Rủi ro                                 | Failure mode                           | Giảm thiểu                                                           | Status  |
| ------ | --- | -------------------------------------- | -------------------------------------- | -------------------------------------------------------------------- | ------- |
| KI-050 | P1  | Mobile editor/Reading passage khó dùng | Không hoàn thành task ở 375px          | Wireframe + component/E2E responsive + long-content test             | OPEN    |
| KI-051 | P1  | Recorder/browser compatibility         | No mic, wrong codec, Safari/mobile lỗi | Capability detection, supported mime fallback, actionable errors     | OPEN    |
| KI-052 | P2  | Timer lệch khi tab background          | Practice time sai                      | Server timestamps + elapsed calculation; không dựa setInterval count | PLANNED |
| KI-053 | P2  | Accessibility bị làm muộn              | Keyboard/focus/label lỗi nhiều         | DoD per feature; automated + manual checks                           | PLANNED |
| KI-054 | P1  | Không có observability cho failure dài | Job/upload fail âm thầm                | Structured logs, trace, dashboards, alerts và runbook                | PLANNED |
| KI-055 | P1  | Backup có nhưng restore không chạy     | Không khôi phục được data              | Restore drill trước beta, record RTO/RPO                             | PLANNED |

## 8. Giới hạn được chấp nhận cho MVP

| ID     | Giới hạn                                | Lý do                               | Điều kiện xem lại                             |
| ------ | --------------------------------------- | ----------------------------------- | --------------------------------------------- |
| AL-001 | Modular monolith, chưa microservices    | Solo developer, tải chưa chứng minh | Module cần scale/deploy/isolation độc lập     |
| AL-002 | PostgreSQL job queue, chưa Redis/BullMQ | Giảm vận hành                       | Queue age/throughput/lock contention vượt SLO |
| AL-003 | Poll/revalidate feedback, chưa realtime | Đơn giản và đủ cho async AI         | UX/traffic metrics chứng minh cần push        |
| AL-004 | Rule-based plan/mastery                 | Minh bạch và dễ debug               | Có đủ dữ liệu sạch + offline evaluation       |
| AL-005 | Chỉ Writing Task 2, Speaking Part 2     | Khép vertical slice trước           | Core quality và retention đạt                 |
| AL-006 | 30-50 learning objects                  | Ưu tiên chất lượng/vòng lặp         | Workflow content ổn và coverage gap rõ        |
| AL-007 | Streak/XP nhẹ                           | Tránh gamification lấn mục tiêu học | Retention research chứng minh nhu cầu         |

## 9. Phase 1 foundation status

| ID     | Sev | Vấn đề                                                   | Ảnh hưởng                                      | Hướng xử lý                                           | Target  | Status  |
| ------ | --- | -------------------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------- | ------- | ------- |
| KI-060 | P1  | Auth screens từng là placeholder | Register/login/logout/confirm/profile đã manual pass với email thật | Không cần xử lý thêm trong Phase 2 | Phase 2 | CLOSED |
| KI-061 | P1  | Migration/RLS/types Supabase từng chưa có | Migration/history/types, 42 local và 21 remote database assertions đã được kiểm chứng | Không cần xử lý thêm trong Phase 2 | Phase 2 | CLOSED |
| KI-062 | P2  | Permission-based navigation chưa có role source | Shell đã dùng session/profile thật nhưng chưa có role model | Triển khai role/permission ở phase được phê duyệt, không tự thêm Phase 2 | Later | OPEN |
| KI-063 | P2  | Structured logging, feature flags, toast/network states chưa hoàn chỉnh | Vận hành private beta chưa đủ quan sát | Thêm khi có mutation/API flows đầu tiên               | Phase 1 | PLANNED |
| KI-064 | P3  | Git metadata trong workspace từng không đọc được như repo hợp lệ | Repo hiện đọc được branch/status/origin bình thường | Không cần xử lý thêm | Ops | CLOSED |
| KI-065 | P1  | Supabase CLI từng chưa login/link project thật | CLI đã link đúng project; dry-run/push/history/lint remote đã pass | Không cần xử lý thêm | Phase 2 | CLOSED |
| KI-066 | P3  | Chưa có `E2E_AUTH_EMAIL`/`E2E_AUTH_PASSWORD` trong automation | Hai authenticated Playwright cases skip có điều kiện; manual full flow đã pass | Cấp dedicated test account qua CI secret khi có test environment | Automation | ACCEPTED |
| KI-067 | P1  | Email xác minh bằng inbox thật từng chưa được kiểm tra | Gmail SMTP, delivery, confirmation link và session flow đã manual pass | Không cần xử lý thêm trong Phase 2 | Phase 2 | CLOSED |
| KI-068 | P3  | Experimental pg-delta không cache được catalog sau push vì thiếu CA temp file | Không ảnh hưởng apply/history/schema; tạo warning tooling sau push | Theo dõi Supabase CLI update hoặc tắt experimental pg-delta nếu tái diễn | Tooling | ACCEPTED |
| KI-069 | P3  | `E2E_ONBOARDING_EMAIL`/`E2E_ONBOARDING_PASSWORD` chưa được cấp | Authenticated onboarding/resume/complete/edit Playwright case skip; không có browser evidence tự động với remote user trong run này | Cấp dedicated verified account qua CI secret; test tự skip nếu account đã complete | Automation | ACCEPTED |
| KI-070 | P2  | General Training mới có module foundation dùng chung, chưa có curriculum riêng | Learner GT không thấy module Reading Academic và phạm vi nội dung còn nhỏ | RLS filter đúng test type; hiển thị đúng số nội dung thật, không giả coverage | Product | ACCEPTED |
| KI-071 | P3  | Browser verification từng có thể dùng nhầm Next process/build đã bind remote env | Mutation có thể đi nhầm project nếu chỉ dựa vào port 3000 | Runner nay dùng production build cổng 3100 riêng và mọi authenticated mutation yêu cầu expected project ref khớp active ref | Verification | CLOSED |
| KI-072 | P2  | Chưa cấp `E2E_LEARNING_EMAIL`/`E2E_LEARNING_PASSWORD` và expected project ref | 8 authenticated Playwright cases skip; database/RPC/RLS remote đã được verifier trực tiếp 66/66 | Cấp dedicated completed-onboarding account qua CI secret trên isolated test project trước release automation đầy đủ | Automation | ACCEPTED |
| KI-073 | P1  | Remote wrapper dùng `\ir` không resolve file include trong Supabase CLI container | Wrapper fail dù file test chính hợp lệ; có thể gây hiểu nhầm remote verifier | Xóa wrapper, không duplicate assertions; chạy trực tiếp `supabase/tests/database/phase_4_learning_content_progress.test.sql`, remote 66/66 PASS và rollback | Verification | CLOSED |
| KI-074 | P3  | Seed Phase 4 cố ý chỉ có 2 module/4 published lesson và 1 draft lesson | Không đại diện curriculum IELTS hoàn chỉnh | Giữ nhãn foundation, bổ sung qua content workflow/versioned seed sau khi có review và licence metadata | Content | ACCEPTED |

## 9.1. Phase 5 exercise foundation status

| ID | Sev | Vấn đề | Ảnh hưởng | Hướng xử lý | Target | Status |
| --- | --- | --- | --- | --- | --- | --- |
| KI-075 | P1 | Linked remote `supabase test db` dùng temporary CLI login role không có `extensions`/Phase 5 verifier privileges | Remote transactional pgTAP cần database-owner evidence riêng | Đã chạy file remote verifier bằng password nhập ẩn: planned 24, ran 24, failed 0, PASS; không gửi/lưu credential và không nới grants | Phase 5 | CLOSED |
| KI-078 | P2 | Phase 5 chỉ hiển thị attempt history, chưa có error notebook hay `/progress/mistakes` | Learner xem được review theo attempt nhưng chưa có aggregation lỗi/SRS | Giữ ngoài scope Phase 5; chỉ triển khai trong phase được duyệt riêng | Later | ACCEPTED |
| KI-077 | P1 | `db push --include-seed --dry-run` báo up-to-date trong khi remote Phase 5 content bằng 0; seed rerun cũ còn bị before-insert immutability trigger | Owner verifier fail assertions 6–9, 13 và RPC `exercise not found` | Đổi protected child inserts sang `WHERE NOT EXISTS`; thêm/apply data migration `20260716153000`; verify local rerun zero writes và local/remote fingerprint `c3c7af314caa350a74994e28378a550f` | Phase 5 | CLOSED |

## 10. Decision backlog

| Decision | Câu hỏi cần chốt                                         | Deadline             |
| -------- | -------------------------------------------------------- | -------------------- |
| D-001    | pnpm/npm, Node LTS, Next.js major, Supabase CLI version? | Trước Phase 1        |
| D-002    | Private beta invite flow và email verification policy?   | Phase 1              |
| D-003    | Default/current band khi learner không làm diagnostic?   | Phase 2              |
| D-004    | Reading 3 types và Listening 2 section/type chính xác?   | Trước Phase 3 seed   |
| D-005    | Writing min/max words và off-topic threshold?            | Trước Phase 5        |
| D-006    | Speaking mime/browser matrix, max duration/size?         | Trước Phase 6        |
| D-007    | Audio/raw AI/log/event retention và deletion SLA?        | Trước Phase 6 beta   |
| D-008    | AI eval release thresholds và weekly quota?              | Trước bật AI Writing |
| D-009    | p95/SLO/RTO/RPO mục tiêu cho private beta?               | Trước Phase 10       |

## 11. Cách cập nhật

Khi thêm issue:

1. Gán ID, severity, impact và target phase.
2. Link task/test/PR nếu đã có.
3. Nếu `ACCEPTED`, ghi rõ ai chấp nhận, lý do và điều kiện xem lại.
4. Chỉ `CLOSED` khi có bằng chứng test/deploy; không xóa lịch sử issue.
5. P0/P1 mở phải xuất hiện trong release review và chặn release nếu chưa có waiver rõ.

## Phase 6 verification follow-up

| ID | Sev | Issue | Impact | Resolution | Status |
| --- | --- | --- | --- | --- | --- |
| KI-076 | P1 | Phase 6 database-owner remote verifier had not run after the 7/7 push | Blocked the Phase 6 completion decision | Closed 2026-07-17: connected successfully; planned 34, ran 34, failed 0, no `not ok`, no `ERROR`, PASS; transaction rolled back and password was neither sent nor stored in chat | CLOSED |

Accepted MVP limits: four Reading task types only; no Listening/Writing/Speaking/AI/mock test, persisted flag-for-review, adaptive difficulty or General Training Reading seed. The timer records authoritative database timestamps but does not force auto-submit at expiry.

## Phase 7 Listening verification follow-up

| ID | Sev | Issue | Impact | Resolution | Status |
| --- | --- | --- | --- | --- | --- |
| KI-079 | P1 | Direct Phase 7 database-owner remote verifier chưa chạy sau parity 9/9 | Từng chặn quyết định Phase 7 COMPLETE | Closed 2026-07-17: chạy tới `ok 34`, failed 0, không `not ok`, không `ERROR`; transaction rollback và database password không gửi/lưu trong chat | CLOSED |

Decision `D-004` đã được chốt cho execution slice: Listening dùng 2 part và 3 type `single_choice`, `multiple_choice`, `short_text`; Reading giữ 4 type Phase 6. Đây là giới hạn MVP, không mở Writing/Speaking/AI/mock test.

## Phase 8 Writing verification follow-up

| ID | Sev | Issue | Impact | Resolution | Status |
| --- | --- | --- | --- | --- | --- |
| KI-080 | P1 | Direct Phase 8 database-owner remote verifier chưa chạy sau parity 12/12 | Từng chặn quyết định Phase 8 COMPLETE | Closed 2026-07-17: direct owner run tới `ok 40`, failed 0, không `not ok`, không `ERROR`; transaction rollback và database password không gửi/lưu trong chat. Final parity 12/12 và local/remote lint vẫn sạch | CLOSED |

Accepted Phase 8 limits: chỉ Academic Writing Task 2; AI feedback optional, không phải điểm IELTS chính thức, không có queue/background job và fallback an toàn khi provider/Vault chưa cấu hình. Không có Speaking, recording, STT, mock test hoặc Phase 9.

## Phase 9 Speaking verification follow-up

| ID | Sev | Issue | Impact | Resolution | Status |
| --- | --- | --- | --- | --- | --- |
| KI-081 | P1 | Direct Phase 9 database-owner remote verifier chưa chạy sau parity 15/15 | Từng chặn quyết định Phase 9 COMPLETE | Closed 2026-07-17: direct owner connection dùng `current_user postgres`, chạy tới `ok 24`, failed 0, không `not ok`, không `ERROR`; transaction rollback và database password không gửi/lưu trong chat. Fresh parity 15/15 và local/remote lint vẫn sạch | CLOSED |

Accepted Phase 9 limits: Speaking practice only; STT/AI optional và server-only, feedback chỉ là practice guidance. Không có full mock test tổng hợp hoặc Phase 10.

## Phase 10A Mock Test verification follow-up

| ID | Sev | Issue | Impact | Resolution | Status |
| --- | --- | --- | --- | --- | --- |
| KI-082 | P1 | Direct Phase 10A database-owner remote verifier chưa chạy sau parity 17/17 | Từng chặn quyết định Phase 10A COMPLETE theo DoD | Closed 2026-07-17: identity check xác nhận `current_user postgres`; verifier rollback-only planned 20/ran 20/failed 0, không `not ok`, không `ERROR`; credential file đã xóa ngay sau run. Fresh parity 17/17 và remote lint vẫn sạch | CLOSED |

Accepted Phase 10A limits: một Academic foundation mock tái sử dụng content Phase 6–9; summary chỉ có raw Reading/Listening score và Writing/Speaking submission references. Không có overall band, analytics nâng cao, admin CMS, production hardening hoặc Phase 10B/10C.

## Phase 10B verification follow-up

| ID | Sev | Issue | Impact | Resolution | Status |
| --- | --- | --- | --- | --- | --- |
| KI-083 | P1 | Direct Phase 10B database-owner verifier chưa chạy sau parity 18/18 | Từng chặn quyết định Phase 10B COMPLETE theo DoD | Closed 2026-07-18: xác nhận `current_user postgres`; verifier planned/ran 17, failed 0, rollback toàn bộ fixture; credential Phase 10B đã xóa ngay trong `finally`, không nới grant | CLOSED |

Accepted Phase 10B limits: analytics chỉ là owner-scoped read model trên dữ liệu PostgreSQL hiện có; không có band trend, warehouse, materialized analytics, admin CMS, production hardening, deploy production hoặc Phase 10C.
