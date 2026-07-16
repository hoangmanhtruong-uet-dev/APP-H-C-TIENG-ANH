# KNOWN ISSUES - Web tự học IELTS

> Phiên bản: 1.0  
> Trạng thái repo hiện tại: Phase 1 foundation, Phase 2 Auth/Profile/RLS và Phase 3 Learner Onboarding Foundation đã triển khai; placement/plan/practice/AI và các module ngoài Phase 3 chưa triển khai
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
| KI-002 | P1  | Chưa có Supabase project/environment strategy                             | Không thể validate Auth/RLS/migration                    | Tách dev/staging/prod, env validation, migration workflow                | Phase 1   | OPEN            |
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
| KI-070 | P2  | Phase 3 lưu cả Academic và General Training nhưng content chưa tồn tại | User có thể chọn General Training nhưng chưa có learning content tương ứng | Dashboard chỉ hiển thị preference thật, không hứa content/plan; giữ KI-014 và gate content ở phase sau | Product | ACCEPTED |
| KI-071 | P3  | Browser verification local dùng nhầm Next process/build đã bind `NEXT_PUBLIC_*` remote | Tối đa hai signup request chưa xác minh với email test `@example.test` có thể đã tạo auth record remote; không có learner data và không dùng credential thật | Dừng test ngay; không tự xóa remote user theo scope; dùng dedicated `E2E_ONBOARDING_*`/test environment tách biệt cho lần chạy sau | Verification | OPEN |

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
