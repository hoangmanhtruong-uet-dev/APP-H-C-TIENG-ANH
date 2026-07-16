# TASKS - Web tự học IELTS

> Phiên bản: 1.0  
> Cách dùng: làm theo dependency order; chỉ đóng phase khi exit criteria đạt  
> Trạng thái: `[ ]` todo, `[-]` in progress, `[x]` done, `[!]` blocked

## 1. Quy tắc thực thi

- Một task implementation phải link PRD requirement, schema/API liên quan và test.
- Không chuyển phase chỉ vì UI “đã nhìn thấy”; phải đạt exit criteria.
- Mỗi vertical slice bao gồm product, UI states, DB/RLS, backend, tests, docs và observability phù hợp.
- Mỗi ngày ưu tiên thay đổi nhỏ nhất có thể demo end-to-end.
- Sau mỗi task: build, lint, typecheck và test liên quan.
- Cuối mỗi tuần: demo, xóa mock/dead CTA, cập nhật task/known issues.

## 2. Dependency order bắt buộc

1. Auth, ownership, RLS trước dữ liệu cá nhân.
2. Content/question model trước practice renderer.
3. Practice session/autosave/submit trước AI scoring.
4. Upload/recording lifecycle trước transcript/scoring.
5. Error taxonomy trước adaptive planning.
6. Events/aggregates trước analytics dashboard.
7. Publish/versioning trước nhập content số lượng lớn.
8. Observability/feature flags trước private/public beta.

## 3. Phase 0 - Discovery và design baseline

Mục tiêu: tài liệu thống nhất trước business implementation.

- [x] `P0-DOC-01` Tạo [PRD.md](./PRD.md).
- [x] `P0-DOC-02` Tạo [ARCHITECTURE.md](./ARCHITECTURE.md).
- [x] `P0-DOC-03` Tạo [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md).
- [x] `P0-DOC-04` Tạo [API_SPEC.md](./API_SPEC.md).
- [x] `P0-DOC-05` Tạo [TASKS.md](./TASKS.md), [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md), [KNOWN_ISSUES.md](./KNOWN_ISSUES.md).
- [x] `P0-DEC-01` Chốt package manager, Node/Next/Supabase CLI versions; commit lockfile. npm/Node/Next/Supabase CLI và lockfile đã có; migration workflow local đã kiểm chứng.
- [ ] `P0-DEC-02` Chốt timezone mặc định, locale, min/max time budget và content taxonomy MVP.
- [ ] `P0-DEC-03` Chốt retention audio, AI raw response, logs và account deletion.
- [ ] `P0-UX-01` Wireframe responsive cho landing, onboarding, Today, practice, feedback và admin publish.
- [x] `P0-UX-02` Chốt design tokens và component states.
- [ ] `P0-RISK-01` Review risk register/known issues và assign owner/date.

Exit criteria:

- Bảy tài liệu không mâu thuẫn về MVP, state machine, role và stack.
- Các quyết định mở có owner/target phase.
- Không code business feature trước khi baseline được review.

## 4. Phase 1 - Foundation (tuần 1-2)

### 4.1. Repository và quality gates

- [x] `P1-REP-01` Khởi tạo Next.js App Router, TypeScript strict, path aliases.
- [x] `P1-REP-02` Chọn package manager, commit lockfile và pin runtime.
- [x] `P1-REP-03` Cài Tailwind/shadcn; định nghĩa color/spacing/type/radius tokens.
- [x] `P1-REP-04` Cấu hình ESLint, format, typecheck, Vitest, Testing Library, Playwright.
- [x] `P1-REP-05` CI chạy install locked, lint, typecheck, unit và Playwright smoke.
- [x] `P1-REP-06` `.env.example` và runtime env validation; fail fast khi thiếu required env.

### 4.2. App shell và cross-cutting

- [-] `P1-APP-01` Route groups public/auth/onboarding/app/admin. Đã có public/auth/dashboard shell; onboarding/admin chờ phase tương ứng.
- [-] `P1-APP-02` App shell responsive 375/768/1440, nav theo permission. Shell dùng user thật và đã test 375/768/1024/1440; permission nav chờ roles ở phase sau.
- [-] `P1-APP-03` Shared loading, empty, error, not-found, toast và network state. Đã có loading/empty/error/not-found; toast/network state còn chờ mutation flows.
- [-] `P1-APP-04` Typed domain errors và normalized API error envelope. Đã có API envelope nền tảng; domain taxonomy đầy đủ chờ API business.
- [ ] `P1-APP-05` Structured logging với trace/request ID và PII redaction.
- [ ] `P1-APP-06` Feature flag service theo environment/cohort.
- [x] `P1-APP-07` Liveness/readiness endpoints không lộ config.

### 4.3. Auth và profile

> Phase 2 Authentication execution slice: **COMPLETE**. Các task roadmap rộng hơn về forgot/reset, roles, settings và consents vẫn giữ trạng thái riêng và không bị đánh dấu hoàn thành thay cho phase sau.

> Phase 3 execution slice — IELTS Learner Onboarding & Personalization Foundation: **IMPLEMENTED AND VERIFIED** ngày 2026-07-16. Slice này map vào phần onboarding của roadmap “Phase 2 - Goal, onboarding, plan và Today”; goal versioning, diagnostic, plan generator và Today vẫn chưa triển khai nên không được đánh dấu complete.

- [x] `P3-ONB-DB-01` `learner_profiles`, FK, constraints, updated_at, RLS, policies, least-privilege grants và hardened completion RPC.
- [x] `P3-ONB-SRV-01` Zod schemas, save-per-step, completion, preference update và request-scoped server guards.
- [x] `P3-ONB-UI-01` Wizard 8 bước responsive/accessibility, resume, review, dashboard/profile integration.
- [x] `P3-ONB-TST-01` 44 pgTAP assertions Phase 3 local và 42 assertion trực tiếp trên remote; unit/component/conditional authenticated E2E.
- [-] `P3-ONB-E2E-01` Dedicated real onboarding E2E đã viết nhưng skip khi `E2E_ONBOARDING_*` không được cấp; database/server behavior đã verify, manual browser flow với dedicated account còn là release follow-up.

- [x] `P1-AUTH-01` Tạo Supabase dev project, migration workflow và generated types. Local/remote history đồng bộ; types generate từ schema applied.
- [-] `P1-AUTH-02` Register/login/logout/forgot/reset/email verify flows. Register/login/logout/confirm đã pass bằng email thật; forgot/reset nằm ngoài Phase 2 hiện tại.
- [x] `P1-AUTH-03` Server-side session helpers; Next.js 16 Proxy chỉ refresh/coarse redirect, protected layout xác minh lại bằng `getUser()`.
- [-] `P1-AUTH-04` `profiles`, settings, consents, roles migrations. `profiles` đã xong; settings/consents/roles để phase tương ứng.
- [-] `P1-AUTH-05` RLS profiles/settings/consents; owner-scoped repository. Profiles đã có least-privilege RLS và server-owned actor; các bảng còn lại chưa tạo.
- [x] `P1-AUTH-06` Safe relative redirect allowlist; chống open redirect và encoded/control-character variants.
- [x] `P1-AUTH-07` Cross-user tests user A/B trong phạm vi profiles. Local pgTAP và 21 TAP remote pass với hai auth users, `authenticated`/`anon` roles và rollback; role escalation chờ khi role model tồn tại.
- [-] `P1-AUTH-08` E2E register -> login -> profile -> logout -> reset. Luồng register/confirm/login/profile/logout đã manual pass bằng email thật; automated authenticated Playwright thiếu `E2E_AUTH_*`, reset ngoài scope.

Exit criteria:

- Build/lint/typecheck/test pass trong CI.
- User A không đọc/sửa user B bằng UI, API hoặc direct Supabase client.
- Không có service-role key/secret trong bundle/log.
- App shell, errors và auth dùng được trên 375/768/1440.

## 5. Phase 2 - Goal, onboarding, plan và Today (tuần 3-4)

### 5.1. Database/domain

- [-] `P2-DB-01` Onboarding learner profile đã có; goal, diagnostic, plan, week, task và task event chưa triển khai.
- [ ] `P2-DB-02` Constraints/partial unique active goal/plan và required indexes.
- [-] `P2-DB-03` Onboarding ownership RLS pass 42 remote assertions; các bảng goal/plan/task chưa tồn tại.
- [ ] `P2-DOM-01` Deterministic plan generator v1, unit tests edge cases.
- [ ] `P2-DOM-02` Task state machine và transition tests.
- [ ] `P2-DOM-03` Regenerate/reschedule transaction + idempotency.
- [ ] `P2-DOM-04` Timezone service; local date/day-boundary tests.

### 5.2. UI/API

- [-] `P2-UI-01` Onboarding goal/schedule/priority skills đã hoàn thành; consent ngoài scope Phase 3.
- [ ] `P2-UI-02` Diagnostic optional/placeholder confidence có nhãn rõ, không giả score.
- [ ] `P2-UI-03` Plan preview 4 tuần, rationale và confirm.
- [ ] `P2-UI-04` Dashboard Today với task, estimated time, continue, weekly progress.
- [ ] `P2-UI-05` Start/skip/reschedule/regenerate UI và conflict/error states.
- [ ] `P2-API-01` Implement contracts goals/plans/tasks trong API spec.
- [ ] `P2-OBS-01` Metrics duplicate task, generation failure, overload plan.

### 5.3. Verification

- [-] `P2-TST-01` Onboarding kiểm invalid duration, date quá khứ, days 0 và validation matrix; plan edge cases chưa có.
- [ ] `P2-TST-02` Regenerate nhiều lần/cùng key/khác key không duplicate.
- [ ] `P2-TST-03` Missed 2-3 days tạo plan vừa sức, không dồn backlog.
- [ ] `P2-TST-04` Đổi timezone qua UTC boundary.
- [-] `P2-E2E-01` Auth + onboarding conditional E2E đã có; plan/Today/start task chưa triển khai.

Exit criteria:

- Có plan 4 tuần đúng time budget và tối đa 2 focus skills/tuần.
- Chỉ một active plan; plan cũ giữ history/rationale.
- Today đúng timezone; task transitions hợp lệ.
- Demo end-to-end không can thiệp DB.

## 6. Phase 3 - Content core và Vocabulary (tuần 5)

- [ ] `P3-DB-01` Content item/version, tag, question/prompt schema + indexes/RLS.
- [ ] `P3-DOM-01` Content lifecycle và published immutability.
- [ ] `P3-DOM-02` Validation required metadata, answer keys, source/licence, asset links.
- [ ] `P3-ADM-01` Admin list/create/edit/preview/review/publish/archive.
- [ ] `P3-ADM-02` Optimistic concurrency cho draft edit.
- [ ] `P3-ADM-03` Audit mọi publish/archive và permission tests.
- [ ] `P3-VOC-01` Vocabulary canonical + user vocabulary + review log migrations.
- [ ] `P3-VOC-02` Normalize/deduplicate term/context.
- [ ] `P3-VOC-03` SRS v1 deterministic + unit tests.
- [ ] `P3-VOC-04` Notebook và due review queue UI.
- [ ] `P3-SEED-01` Seed có licence: lesson, vocab, Reading/Listening set, Writing/Speaking prompt.
- [ ] `P3-E2E-01` Editor draft -> preview -> publish -> learner read.

Exit criteria:

- Published version không bị sửa ngầm.
- Learner không đọc draft/answer key.
- Từ trùng được xử lý; review schedule reproducible.
- Content seed có source/licence.

## 7. Phase 4 - Reading và Listening (tuần 6-7)

### 7.1. Practice core

- [ ] `P4-DB-01` Practice session, answers, annotations schema/RLS/indexes.
- [ ] `P4-DOM-01` Start session snapshot content version, idempotency.
- [ ] `P4-DOM-02` Autosave answer revision và submit lock.
- [ ] `P4-DOM-03` Deterministic scoring, answer normalization, explanation release.
- [ ] `P4-DOM-04` Resume/abandon/review state transitions.
- [ ] `P4-UI-01` Shared question renderer, timer và sync state.

### 7.2. Reading

- [ ] `P4-REA-01` Passage layout responsive, highlight/note.
- [ ] `P4-REA-02` Ít nhất 3 question types.
- [ ] `P4-REA-03` Review theo question type và tạo error candidates.

### 7.3. Listening

- [ ] `P4-LIS-01` Audio player/loading/buffer/404/retry states.
- [ ] `P4-LIS-02` Ít nhất 2 section/type.
- [ ] `P4-LIS-03` Transcript/answer hidden trước submit.
- [ ] `P4-LIS-04` Refresh/resume policy theo mode.

### 7.4. Verification

- [ ] `P4-TST-01` Double submit, refresh, back, network drop, stale autosave.
- [ ] `P4-TST-02` Content publish mới không đổi attempt đang làm/kết quả cũ.
- [ ] `P4-TST-03` Multi-answer, case/space normalization, question order.
- [ ] `P4-TST-04` Audio 404/buffer/seek/speed và transcript leakage.
- [ ] `P4-E2E-01` Today -> Reading -> submit -> review.
- [ ] `P4-E2E-02` Listening -> submit -> transcript/review.

Exit criteria:

- Resume draft và submit idempotent.
- Score reproducible; answer key/transcript không lộ sớm.
- Reading/Listening sử dụng được trên mobile và keyboard.

## 8. Phase 5 - Writing AI (tuần 8-9)

- [ ] `P5-DB-01` Writing draft/submission/revision, prompt/rubric, AI job/run schema.
- [ ] `P5-DOM-01` Draft autosave optimistic concurrency + local recovery protocol.
- [ ] `P5-DOM-02` Immutable submit + job enqueue trong transaction + idempotency.
- [ ] `P5-JOB-01` DB queue claim/lease/retry/backoff/dead state.
- [ ] `P5-AI-01` Versioned Writing prompt/rubric + Structured Output schema.
- [ ] `P5-AI-02` Validate band range, evidence, max issues, disclaimer.
- [ ] `P5-AI-03` Rate/quota, max input, usage/cost/latency metrics.
- [ ] `P5-UI-01` Prompt list/filter và Task 2 editor.
- [ ] `P5-UI-02` Word count, timer, sync/offline/conflict, leave warning.
- [ ] `P5-UI-03` Processing/failed/retry/result states.
- [ ] `P5-UI-04` Feedback criteria/evidence/correction/next drills.
- [ ] `P5-UI-05` Immutable revision và revision compare.
- [ ] `P5-TST-01` Long draft, paste, refresh, conflict, network drop.
- [ ] `P5-TST-02` Double submit, duplicate job, worker crash/lease recovery.
- [ ] `P5-TST-03` Timeout, provider 429/5xx, invalid schema/evidence.
- [ ] `P5-AIEVAL-01` Fixed set 20 essays từ yếu đến tốt và adversarial cases.
- [ ] `P5-E2E-01` Write -> submit -> process -> feedback -> revision.

Exit criteria:

- Không mất draft trong test network/reload.
- Job retry an toàn; invalid output không render.
- Feedback có evidence và disclaimer; eval gate đạt ngưỡng đã chốt.
- Không log raw essay/prompt/secrets.

## 9. Phase 6 - Speaking AI (tuần 10)

- [ ] `P6-DB-01` Upload intent, audio asset, speaking submission, transcript schema/RLS.
- [ ] `P6-STO-01` Private bucket/policy, signed upload/read URL ngắn.
- [ ] `P6-STO-02` Verify mime/size/duration/checksum và orphan cleanup.
- [ ] `P6-UI-01` Mic permission/no-device/silence/recorder/local preview states.
- [ ] `P6-UI-02` Prep/record timer, max duration và upload progress/retry.
- [ ] `P6-DOM-01` Finalize idempotent và transcript job.
- [ ] `P6-AI-01` Original vs edited transcript; speaking feedback schema/evidence.
- [ ] `P6-AI-02` Không chấm audio im lặng/noisy/quá ngắn; confidence limitations.
- [ ] `P6-PRI-01` Consent, retention, playback signed URL và delete flow.
- [ ] `P6-TST-01` Permission denied/no mic/wrong mime/interrupted upload.
- [ ] `P6-TST-02` Delete while processing, orphan object, expired signed URL.
- [ ] `P6-E2E-01` Record -> upload -> transcript -> edit -> feedback -> delete/retry.

Exit criteria:

- Media luôn private; user A không có URL/path của B.
- Upload retry/finalize không duplicate.
- Delete flow và consent có test.
- Chỉ bật `ai_speaking_enabled` sau khi upload/transcript ổn định.

## 10. Phase 7 - Error notebook và adaptive plan (tuần 11)

- [ ] `P7-DB-01` Error item/review/generated drill schema, taxonomy và indexes.
- [ ] `P7-DOM-01` Extract deterministic errors từ Reading/Listening.
- [ ] `P7-DOM-02` Extract AI errors có evidence từ Writing/Speaking.
- [ ] `P7-DOM-03` Duplicate/occurrence merge rules.
- [ ] `P7-UI-01` Error list/detail/review/mastered states.
- [ ] `P7-DOM-04` Mastery formula v1 và algorithm version.
- [ ] `P7-DOM-05` Weekly summary và plan adjustment rationale.
- [ ] `P7-TST-01` Source deleted/archived, duplicate extraction, recurrence 7-14 ngày.
- [ ] `P7-E2E-01` Practice error -> notebook -> review -> next plan task.

Exit criteria:

- Error luôn trace về source/evidence hợp lệ.
- Không duplicate lỗi cùng source/anchor/type.
- Plan adjustment giải thích được, không dùng ML mơ hồ.

## 11. Phase 8 - Analytics và mock (sau core MVP)

- [ ] `P8-EVT-01` Event dictionary/schema version và privacy review.
- [ ] `P8-DB-01` Daily stats, skill mastery và rebuild job.
- [ ] `P8-ANA-01` Progress/weekly dashboard có data freshness.
- [ ] `P8-ANA-02` Timezone boundary, abandoned/deleted attempt rules.
- [ ] `P8-MOCK-01` Mock snapshot, timed sections, controlled resume.
- [ ] `P8-MOCK-02` Reproducible result breakdown và no-answer-leak tests.

Exit criteria: aggregate rebuild ra cùng kết quả; chart phân biệt observed/estimated; mock score reproducible.

## 12. Phase 9 - Admin và operations

- [ ] `P9-ADM-01` Admin dashboard failed jobs/drafts/alerts.
- [ ] `P9-ADM-02` Question/prompt management và validation.
- [ ] `P9-ADM-03` AI job list/retry/cancel với permission/audit.
- [ ] `P9-ADM-04` User basic view/status management theo least privilege.
- [ ] `P9-ADM-05` Feature flags environment/cohort rollout.
- [ ] `P9-ADM-06` Audit log search và integrity/retention.
- [ ] `P9-OPS-01` Runbooks: job backlog, provider outage, storage cleanup, rollback.

Exit criteria: admin không bypass invariant; mọi mutation nhạy cảm có permission và audit.

## 13. Phase 10 - Production hardening (tuần 12)

- [ ] `P10-SEC-01` Hoàn thành [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md), threat review P0/P1.
- [ ] `P10-SEC-02` Dependency/secret scan, CSP/security headers, rate/quota tests.
- [ ] `P10-DB-01` Migration rehearsal, backup/restore drill, connection limits/index review.
- [ ] `P10-OBS-01` Error dashboards/alerts và PII redaction audit.
- [ ] `P10-PERF-01` Measure/polish Dashboard, lesson, submit, queue p95.
- [ ] `P10-A11Y-01` Keyboard/focus/labels/contrast/zoom/reduced-motion audit.
- [ ] `P10-RESP-01` 375/768/1024/1440 browser matrix.
- [ ] `P10-AI-01` Eval pass, budget alert, model/prompt pin, fallback runbook.
- [ ] `P10-LEGAL-01` Privacy/terms, consent, copyright/licence, delete/export.
- [ ] `P10-REL-01` Staging smoke, feature flag rollout, rollback test.
- [ ] `P10-E2E-01` User mới -> onboarding -> một tuần học mô phỏng.
- [ ] `P10-DOC-01` README, schema, API, tasks và known issues khớp code.

Exit criteria:

- Không còn P0/P1 security/reliability issue mở.
- Critical E2E, AI regression, restore và rollback đã chạy thật.
- Private beta có support/incident contact và known limitations rõ.

## 14. Definition of Done cho mọi feature

- [ ] User story/acceptance đạt; không thêm lén out-of-scope.
- [ ] Không còn mock trong production path nếu DB đã có.
- [ ] Client + server validation; server authorization; RLS/ownership test.
- [ ] Loading/empty/error/success/network-failure states.
- [ ] Responsive 375/768/1440, keyboard và a11y cơ bản.
- [ ] Unit/integration/component/E2E theo rủi ro.
- [ ] Build/lint/typecheck/test pass, warning quan trọng được xử lý.
- [ ] Migration, constraints/index, seed và forward-fix/rollback strategy.
- [ ] Log/metrics không chứa secret/PII/raw sensitive content; error có trace ID.
- [ ] API/schema/tasks/security/known issues được cập nhật.

## 15. Mốc demo bắt buộc

- Cuối tuần 2: register -> login -> profile -> logout.
- Cuối tuần 4: onboarding -> plan -> Today -> task state/streak.
- Cuối tuần 7: Reading/Listening -> submit -> review/error.
- Cuối tuần 9: Writing -> feedback -> revision.
- Cuối tuần 10: Speaking -> transcript -> feedback/retry/delete.
- Cuối tuần 12: user mới hoàn thành một tuần học mô phỏng không cần can thiệp DB.
