# PRD - Web tự học IELTS

> Phiên bản: 1.0  
> Trạng thái: Baseline cho Phase 0  
> Nguồn: `Ke_hoach_chi_tiet_xay_dung_web_tu_hoc_IELTS.pdf`  
> Phạm vi mặc định: IELTS Academic, mục tiêu Band 6.5, private beta

## 1. Tóm tắt sản phẩm

Web giúp người học IELTS biết hôm nay cần học gì, luyện đúng điểm yếu, nhận phản hồi có bằng chứng và theo dõi tiến bộ theo thời gian. Sản phẩm tổ chức việc học thành vòng lặp khép kín:

`Onboarding/Diagnostic -> Study plan -> Daily task -> Practice -> Feedback -> Error review -> Progress -> Plan mới`

MVP là một web cá nhân có thể dùng hằng ngày và mời 10-50 người vào private beta. MVP không cố trở thành kho đề khổng lồ, mạng xã hội hay giáo viên AI toàn năng.

## 2. Vấn đề cần giải quyết

| Vấn đề                               | Hậu quả                             | Đáp án sản phẩm                                    |
| ------------------------------------ | ----------------------------------- | -------------------------------------------------- |
| Không biết bắt đầu từ đâu            | Học lan man, đổi tài liệu liên tục  | Goal, diagnostic ngắn và lộ trình cá nhân          |
| Biết lý thuyết nhưng thiếu thực hành | Không hình thành kỹ năng            | Daily task, timer, practice và review              |
| Chỉ biết đáp án đúng/sai             | Lặp lại cùng lỗi                    | Error notebook, giải thích và micro-drill          |
| Không có người sửa Writing/Speaking  | Không biết mức độ và cách cải thiện | AI feedback theo rubric, có evidence và next steps |
| Khó duy trì thói quen                | Bỏ chuỗi học                        | Kế hoạch vừa sức, missed-day recovery, streak nhẹ  |
| Không hiểu nguyên nhân điểm thấp     | Chỉ nhìn tổng điểm                  | Phân tích theo kỹ năng, dạng câu, thời gian và lỗi |

## 3. Người dùng mục tiêu

### 3.1. Persona chính

1. Người học nền tảng 2.5-4.5 muốn đạt 6.0-6.5, cần hướng dẫn rõ và giải thích tiếng Việt.
2. Người học 5.0-5.5 muốn đạt 6.5-7.0, cần phân tích lỗi có hệ thống và feedback theo rubric.
3. Người bận, chỉ có 30-60 phút/ngày, cần kế hoạch tự co giãn theo thời gian.
4. Content editor/admin cần tạo, duyệt, publish và version nội dung có nguồn/licence.

### 3.2. Vai trò hệ thống

- `LEARNER`: học và quản lý dữ liệu của chính mình.
- `CONTENT_EDITOR`: tạo/sửa nội dung, có thể không được publish.
- `SUPPORT`: xem dữ liệu vận hành giới hạn để xử lý yêu cầu.
- `ADMIN`: vận hành nội dung, user, AI jobs và audit.
- `SUPER_ADMIN`: quản lý role, feature flag và cấu hình nhạy cảm.

Chi tiết quyền nằm trong [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md).

## 4. Mục tiêu và chỉ số

### 4.1. Mục tiêu MVP

- Người mới hoàn tất onboarding và có study plan 4 tuần.
- Người học mở Dashboard Today và bắt đầu task trong tối đa 2 click.
- Hoàn thành được Reading, Listening, Writing Task 2 và Speaking Part 2 theo luồng end-to-end.
- Draft, answer, recording và feedback không mất khi refresh/retry hợp lệ.
- Lỗi được gom về notebook và ảnh hưởng đến task ôn tiếp theo.
- Có đủ công cụ admin để publish 30-50 learning objects chất lượng.

### 4.2. North-star metric

`Weekly Effective Study Sessions`: số phiên trong tuần đồng thời thỏa mãn:

1. Người học hoàn thành một task hợp lệ.
2. Người học xem feedback/review.
3. Hệ thống tạo được bằng chứng học tập: answer, revision, error item hoặc review log.

### 4.3. KPI hỗ trợ

| Nhóm        | KPI                                                              |
| ----------- | ---------------------------------------------------------------- |
| Activation  | Hoàn tất onboarding; có plan; hoàn thành task đầu trong 24 giờ   |
| Engagement  | Effective sessions/user/week; task completion; review completion |
| Learning    | Accuracy/mastery trend; error recurrence; revision improvement   |
| Retention   | D1/D7/D30; weekly active learners; return after missed day       |
| AI quality  | Helpful rate; schema failure; re-run; dispute; latency           |
| Reliability | Error rate; autosave failure; failed upload; p95; job backlog    |
| Cost        | AI cost/active learner; storage/user; cost/effective session     |
| Content     | Report rate; completion; taxonomy coverage; item discrimination  |

Không dùng time-on-site làm thước đo thành công chính.

## 5. Nguyên tắc sản phẩm

- Học theo vòng lặp, không duyệt kho nội dung vô tận.
- Mỗi màn hình có một hành động chính.
- Giải thích lỗi cụ thể quan trọng hơn một con số tổng quát.
- AI là trợ lý học tập, không phải giám khảo chính thức hay nguồn sự thật duy nhất.
- Mọi phản hồi AI phải có schema, evidence, phiên bản và disclaimer.
- Ưu tiên computer-based practice; tách content khỏi delivery.
- Dùng rule minh bạch trước ML phức tạp.
- Không hy sinh quyền riêng tư để lấy analytics hoặc tiện vận hành.

## 6. Phạm vi MVP

### 6.1. Must-have

| Epic              | Yêu cầu MVP                                                                                          |
| ----------------- | ---------------------------------------------------------------------------------------------------- |
| Auth & profile    | Register/login/logout/reset; profile; settings; protected routes                                     |
| Goal & onboarding | Test type, band hiện tại/mục tiêu, exam date, time budget, study days, weak skills                   |
| Planning          | Plan 4 tuần deterministic; tối đa 2 focus skills/tuần; daily tasks; reschedule/regenerate có version |
| Dashboard Today   | Task hôm nay, continue draft, estimated time, progress tuần, streak cơ bản                           |
| Content core      | Lesson/question/prompt có taxonomy, lifecycle và version snapshot                                    |
| Vocabulary        | Notebook, tránh trùng, SRS đơn giản, review queue                                                    |
| Reading           | Tối thiểu 3 dạng câu, timer, autosave, submit, score, review                                         |
| Listening         | Tối thiểu 2 section, audio player, transcript chỉ mở sau submit                                      |
| Writing           | Task 2 editor, word count, autosave, immutable submit, AI feedback, revision                         |
| Speaking          | Part 2 recorder, private upload, transcript, feedback, delete flow                                   |
| Error notebook    | Lỗi có source, evidence, correction, review state và next review                                     |
| Progress          | Weekly summary, task completion, accuracy/mastery cơ bản                                             |
| Admin             | CRUD draft, validate, review, publish/archive; question/prompt; job/error visibility                 |
| Platform          | Feature flags, structured logs, error tracking, audit, CI và E2E critical paths                      |

### 6.2. Should-have sau khi core ổn

- Diagnostic đủ 4 kỹ năng.
- Weekly review tự động và plan adjustment.
- Writing revision compare, Speaking retry compare.
- Content import workflow và analytics nâng cao.

### 6.3. Could-have sau MVP

- AI Tutor theo context hẹp.
- PWA/offline nhẹ cho vocabulary và draft.
- Text-to-Speech, admin analytics, leaderboard nhỏ.

### 6.4. Won't-have trong MVP

- Marketplace giáo viên, social network, livestream/video call.
- Mobile native, realtime AI voice liên tục.
- ML adaptive phức tạp, multi-tenant/trường học, microservices.
- Ngân hàng hàng nghìn câu hỏi thiếu workflow chất lượng.

## 7. Hành trình người dùng chính

### 7.1. Người dùng mới

1. Landing -> đăng ký và consent.
2. Onboarding -> mục tiêu, lịch học và điểm yếu.
3. Diagnostic ngắn hoặc self-assessment có confidence.
4. Hệ thống sinh plan 4 tuần và giải thích rationale.
5. Người học xác nhận plan và tới Dashboard Today.
6. Hoàn thành task đầu tiên, xem review và có error/vocab evidence.
7. Sau 7 ngày, nhận weekly summary và plan version mới nếu cần.

### 7.2. Một buổi học hằng ngày

| Khối        | Thời lượng gợi ý | Điều kiện hoàn thành             |
| ----------- | ---------------: | -------------------------------- |
| Warm-up     |           5 phút | Ôn vocab/error đến ngưỡng recall |
| Main skill  |       20-35 phút | Nộp attempt hợp lệ               |
| Feedback    |       10-15 phút | Đọc review và đánh dấu hiểu/sửa  |
| Micro-drill |        5-10 phút | Đạt 70-80% hoặc hoàn tất drill   |
| Reflection  |           2 phút | Lưu difficulty, focus và note    |

Nếu người học bỏ 2-3 ngày, hệ thống tái lập kế hoạch; không dồn nguyên backlog vào một ngày.

## 8. Quy tắc nghiệp vụ cốt lõi

### 8.1. Study plan

- Mỗi user chỉ có một goal active và một plan active cho goal đó.
- Plan có version và rationale; plan cũ không bị ghi đè.
- Mỗi tuần tối đa 2 focus skills và 1 maintenance skill.
- Tổng `estimated_minutes` trong ngày không vượt time budget ngoài sai số cấu hình.
- Regenerate/reschedule phải idempotent và không tạo task trùng.
- Mọi tính toán ngày dùng timezone của learner.

### 8.2. Mastery MVP

`mastery = 0.50 * recent_accuracy + 0.20 * handled_difficulty + 0.15 * recall + 0.15 * stability`

- Ưu tiên 5 attempts gần nhất cho accuracy.
- So response time với median của question type.
- Lỗi cùng tag lặp trong 7-14 ngày tạo tín hiệu micro-drill.
- Mastery là chỉ số nội bộ 0-1, không đồng nghĩa IELTS band.

### 8.3. Practice và submit

- Session snapshot content version khi bắt đầu.
- Autosave khác final submission.
- Submit phải idempotent; không chấm hai lần vì double-click/retry.
- Deterministic questions được score server-side.
- Transcript/answer key chỉ mở khi state cho phép.
- Result của attempt cũ không thay đổi khi content được publish version mới.

### 8.4. Writing/Speaking AI

- Submission sau submit là immutable; revision là record mới.
- AI chạy server-side qua job, có timeout, retry giới hạn và dead state.
- Lưu model, prompt version, rubric version, usage, latency và output đã validate.
- Feedback chỉ là band estimate phục vụ học tập.
- Evidence phải tồn tại trong text/transcript nguồn.
- Output invalid không được render như kết quả hợp lệ.

### 8.5. Content

- Lifecycle: `DRAFT -> IN_REVIEW -> PUBLISHED -> ARCHIVED`.
- Published version immutable; sửa bằng version mới.
- Mọi item phải có skill, type, difficulty, topic, source/licence và estimated time phù hợp.
- Không scrape hoặc phân phối lại nội dung có bản quyền nếu không có quyền.

## 9. Yêu cầu chức năng theo module

Mỗi module phải có loading, empty, error, success, offline/network-failure state phù hợp.

### 9.1. Dashboard & Planning

- Hiển thị task theo ngày và timezone.
- Continue task/session đang dở.
- Start, skip, reschedule theo transition hợp lệ.
- Hiển thị progress tuần và cảnh báo quá tải.
- Cho sửa goal và regenerate mà giữ lịch sử.

### 9.2. Reading & Listening

- Reading MVP hỗ trợ ít nhất: multiple choice, true/false/not given, matching headings hoặc summary completion.
- Listening MVP hỗ trợ ít nhất hai section/type đã publish.
- Autosave answer, timer, resume và review từng câu.
- Listening không lộ transcript/answer trước submit.

### 9.3. Writing

- Prompt list/filter, editor, timer, word count, autosave status và leave warning.
- Submit immutable; trạng thái processing rõ.
- Feedback gồm overall estimate, 4 criteria, evidence, 3-5 priority issues, strengths, revision plan và disclaimer.
- Revision compare không ghi đè bản nộp cũ.

### 9.4. Speaking

- Kiểm tra mic/permission; prep và recording timer; max duration.
- Local preview; upload retry; trạng thái upload/transcribe/score.
- Original transcript và learner-edited transcript tách biệt.
- Cho xóa recording/transcript theo retention policy.

### 9.5. Error notebook & Vocabulary

- Error link về attempt/submission nguồn.
- Tránh duplicate cùng source và error type.
- Hỗ trợ status open/reviewing/mastered và `next_review_at`.
- Vocabulary unique theo user + normalized term + context; SRS ghi append-only review log.

## 10. Route map MVP

Nhóm route chuẩn:

- Public/auth: `/`, `/login`, `/register`, `/forgot-password`, `/reset-password`.
- Onboarding: `/onboarding/*`.
- Learner: `/app`, `/app/plan`, `/app/learn`, `/app/practice/*`, `/app/writing/*`, `/app/speaking/*`, `/app/vocabulary/*`, `/app/errors/*`, `/app/progress/*`, `/app/settings/*`.
- Admin: `/admin`, `/admin/content`, `/admin/questions`, `/admin/prompts`, `/admin/users`, `/admin/ai-jobs`, `/admin/feature-flags`, `/admin/audit-logs`.

Owner routes luôn authorize ở server; middleware chỉ hỗ trợ UX.

## 11. Yêu cầu phi chức năng

| Nhóm            | Mục tiêu MVP/beta                                                      |
| --------------- | ---------------------------------------------------------------------- |
| Reliability     | Autosave có sync state; submit/upload/job idempotent; có retry an toàn |
| Performance     | Dashboard và core reads đo p95; tránh N+1; audio/image có giới hạn     |
| Security        | RLS + server authorization; private storage; RBAC; audit; rate/quota   |
| Privacy         | Consent audio/AI; retention; delete/export; log redaction              |
| Accessibility   | Keyboard, focus, labels, error announcements, contrast, zoom 200%      |
| Responsive      | Kiểm tra 375/768/1024/1440                                             |
| Observability   | Structured logs, trace ID, error tracking, job metrics, alert cơ bản   |
| Maintainability | TypeScript strict; Zod; domain service/repository; docs đồng bộ        |

## 12. Feature flags mặc định

| Flag                     | Private beta | Ghi chú                           |
| ------------------------ | ------------ | --------------------------------- |
| `public_registration`    | OFF          | Invite/private beta               |
| `ai_writing_enabled`     | ON có quota  | Chỉ sau eval gate                 |
| `ai_speaking_enabled`    | OFF ban đầu  | Bật sau upload/transcript ổn định |
| `mock_test_enabled`      | OFF          | Sau khi content/timer đủ          |
| `realtime_voice_enabled` | OFF          | Ngoài MVP                         |
| `gamification_enabled`   | ON nhẹ       | Chỉ streak/XP cơ bản              |

## 13. Release gates

MVP/private beta chỉ được phát hành khi:

- Auth, ownership, RLS và cross-user tests pass.
- Onboarding -> plan -> Today -> practice -> review chạy E2E.
- Writing job invalid/timeout không tạo feedback giả.
- Speaking upload private, retry và delete hoạt động trước khi bật AI Speaking.
- Không còn mock/dead CTA trong production path.
- Build, lint, typecheck, unit/integration/E2E pass.
- Backup/restore, rollback, monitoring, privacy/consent và known issues được kiểm tra.

## 14. Giả định và quyết định mở

- Ngôn ngữ UI đầu tiên: tiếng Việt; nội dung luyện tập chủ yếu tiếng Anh.
- IELTS Academic là mặc định; General Training chưa thuộc MVP.
- Stack baseline: Next.js App Router, TypeScript, Supabase, OpenAI server-side.
- Solo developer 2-4 giờ/ngày; roadmap 12 tuần là mục tiêu, không phải cam kết ngày phát hành.
- Các quyết định chưa chốt và rủi ro được theo dõi tại [KNOWN_ISSUES.md](./KNOWN_ISSUES.md).

## 15. Tài liệu liên quan

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)
- [API_SPEC.md](./API_SPEC.md)
- [TASKS.md](./TASKS.md)
- [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md)
- [KNOWN_ISSUES.md](./KNOWN_ISSUES.md)

## 16. Phase 6 Reading practice slice

Phase 6 delivers one database-backed Academic Reading vertical slice: published catalog, original passage, four task types, autosave/resume, database-derived timer, atomic deterministic submit, post-submit review and owner history. Correct answers and draft content are not learner-readable. Desktop uses split passage/questions; mobile uses accessible switching. General Training content, Listening, Writing, Speaking, AI and full mock tests remain outside this slice.
