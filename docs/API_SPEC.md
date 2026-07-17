# API SPEC - Web tự học IELTS

## Phase 10C operational endpoints

### `GET /api/health/live`

Process liveness only. Returns 200 when the Next.js process can serve requests.

### `GET /api/health/ready`

Validates production env and probes Supabase Auth health with the public anon key. Returns 200 when ready; returns a generic 503 `CONFIGURATION_ERROR` or `DEPENDENCY_UNAVAILABLE` with request id and `Cache-Control: no-store`. It never returns env values.

### `POST /api/internal/storage-cleanup`

Server scheduler only. Requires `Authorization: Bearer <STORAGE_CLEANUP_SECRET>`; missing/invalid auth returns generic 404. The route uses a server-only service-role client, expires old upload intents, claims due audio with a DB lease, removes private Storage objects, then finalizes deletion timestamps. Batch size is 100; response contains counts only. Never call this endpoint from browser code or put its secret in a URL.

> Phiên bản: 1.0  
> Style: Next.js Server Actions cho mutation UI; Route Handlers cho HTTP/upload/job/ops  
> Base path cho Route Handlers: `/api/v1`

> Trạng thái: Auth và ba Server Action onboarding bên dưới mô tả implementation hiện có. Goal/plan/task HTTP contracts còn lại là target cho phase sau.

## 1. Quy ước contract

### 1.1. Authentication

- Browser dùng Supabase session cookie.
- Server lấy actor từ verified server session; không tin `user_id` do client gửi.
- Owner/admin route authorize lại trong use case.
- API key/service role không bao giờ trả về browser.

### 1.2. Content type và thời gian

- JSON: `application/json; charset=utf-8`.
- Thời gian: ISO 8601 UTC, ví dụ `2026-07-15T16:30:00Z`.
- Ngày học: `YYYY-MM-DD`, được tính theo timezone trong profile.
- UUID dạng chuẩn; band score theo bước 0.5.

### 1.3. Success envelope

```json
{
  "data": {},
  "meta": {
    "requestId": "req_uuid",
    "serverTime": "2026-07-15T16:30:00Z"
  }
}
```

### 1.4. Error envelope

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dữ liệu không hợp lệ",
    "fieldErrors": { "targetOverall": ["Phải theo bước 0.5"] },
    "retryable": false,
    "traceId": "trace_uuid"
  }
}
```

Client có thể hiển thị `message`; không hiển thị stack/internal provider message.

### 1.5. Error codes chung

| HTTP | Code                              | Ý nghĩa                                  |
| ---: | --------------------------------- | ---------------------------------------- |
|  400 | `VALIDATION_ERROR`                | Input sai schema/rule                    |
|  401 | `UNAUTHENTICATED`                 | Không có session hợp lệ                  |
|  403 | `FORBIDDEN`                       | Thiếu permission                         |
|  404 | `NOT_FOUND`                       | Resource không tồn tại trong scope actor |
|  409 | `STATE_CONFLICT`                  | Transition/version không hợp lệ          |
|  409 | `IDEMPOTENCY_CONFLICT`            | Cùng key nhưng khác payload              |
|  413 | `PAYLOAD_TOO_LARGE`               | Text/file/audio vượt giới hạn            |
|  415 | `UNSUPPORTED_MEDIA_TYPE`          | Mime không được phép                     |
|  422 | `CONTENT_INVALID`                 | Content/submission không đủ điều kiện    |
|  429 | `RATE_LIMITED` / `QUOTA_EXCEEDED` | Vượt rate/quota                          |
|  500 | `INTERNAL_ERROR`                  | Lỗi không dự kiến                        |
|  502 | `UPSTREAM_ERROR`                  | Provider lỗi                             |
|  503 | `TEMPORARILY_UNAVAILABLE`         | Hệ thống/job quá tải                     |

### 1.6. Idempotency và concurrency

- Header `Idempotency-Key` bắt buộc cho submit, finalize upload, enqueue AI, regenerate plan và publish.
- Key là UUID ngẫu nhiên, scope theo actor + operation, TTL tối thiểu 24 giờ.
- Cùng key/cùng request hash trả lại response cũ.
- Cùng key/khác payload trả `409 IDEMPOTENCY_CONFLICT`.
- Autosave gửi `clientRevision` và `expectedServerRevision`; mismatch trả `409 DRAFT_CONFLICT` cùng server snapshot metadata.

### 1.7. Pagination

Cursor-based:

```json
{
  "data": [],
  "meta": { "nextCursor": "opaque-or-null", "hasMore": false }
}
```

Default 20, max 100. Cursor là opaque, không dùng client-generated offset cho dữ liệu biến động.

## 2. Server Actions catalog

Các tên sau là contract use-case; implementation có thể đặt trong feature module tương ứng.

| Action                       | Input chính                             | Output                 | Quyền/ghi chú                |
| ---------------------------- | --------------------------------------- | ---------------------- | ---------------------------- |
| `registerAction`             | displayName, email, password, confirm   | typed form state       | Public; Zod; generic success |
| `loginAction`                | email, password, next?                  | redirect/typed error   | Public; safe allowlist       |
| `logoutAction`               | none                                    | redirect `/login`      | Auth; local session sign-out |
| `updateProfileAction`        | displayName                             | typed form state       | Auth; actor ID từ server     |
| `completeOnboarding`         | goal, availability, consent             | goal + plan preview    | Auth; transaction            |
| `updateLearningGoal`         | goalId, fields                          | new goal state         | Owner; validate exam date    |
| `generateStudyPlan`          | goalId, reason                          | plan version           | Owner; idempotent            |
| `updateStudyTask`            | taskId, transition                      | task                   | Owner; state machine         |
| `rescheduleTasks`            | taskIds, target dates, reason           | plan/tasks             | Owner; transaction           |
| `startPracticeSession`       | setId, mode, taskId?                    | session snapshot       | Auth; idempotent             |
| `saveAttemptAnswer`          | sessionId, questionId, answer, revision | saved revision         | Owner; upsert before submit  |
| `submitPracticeSession`      | sessionId                               | score/result state     | Owner; idempotent            |
| `markPracticeReviewed`       | sessionId                               | reviewed state         | Owner; requires score/review |
| `addVocabulary`              | term, context, note                     | user vocabulary        | Owner; normalized unique     |
| `submitVocabReview`          | itemId, rating, responseMs              | next schedule          | Owner; append log            |
| `saveWritingDraft`           | draftId?, promptId, text, revisions     | draft                  | Owner; concurrency check     |
| `submitWriting`              | draftId, promptId, taskId?              | submission + job       | Owner; idempotent            |
| `submitWritingRevision`      | submissionId, text                      | immutable revision     | Owner                        |
| `createSpeakingUploadIntent` | promptId, mime, size, duration          | signed upload info     | Owner; consent/quota         |
| `finalizeSpeaking`           | uploadIntentId, checksum, taskId?       | submission + job state | Owner; idempotent            |
| `saveEditedTranscript`       | submissionId, text                      | transcript version     | Owner; original unchanged    |
| `deleteSpeakingData`         | submissionId, scope                     | deletion request/state | Owner; audit                 |
| `reviewErrorItem`            | errorId, result, confidence             | next review            | Owner                        |
| `publishContent`             | contentItemId, version                  | published snapshot     | Permission; idempotent/audit |
| `retryAiJob`                 | jobId                                   | job state              | Admin permission; safe retry |

## 3. Auth và actor

Phase 2 không tạo REST API `/api/v1/me`; Server Components đọc actor/profile trực tiếp qua typed Supabase server client.

### `registerAction`

- Input: `displayName` 1-100 ký tự, normalized email, password 8-72 ký tự, confirmation phải khớp.
- Gọi `supabase.auth.signUp` với metadata `display_name`.
- Không trả trạng thái “email đã tồn tại”; success hướng user kiểm tra inbox.
- Password không đi vào query string, log hoặc public database.

### `loginAction`

- Input: normalized email, password, optional `next`.
- Gọi `signInWithPassword`; lỗi provider được map sang message tiếng Việt an toàn.
- `next` chỉ chấp nhận protected internal path allowlisted; mặc định `/dashboard`.

### `GET /auth/confirm`

Query: `token_hash`, `type=email|signup`, optional safe `next`.

- Verify bằng `auth.verifyOtp` trên server.
- Thành công tạo session cookie và redirect protected path.
- Token sai/hết hạn redirect `/login?authError=confirmation_invalid`.
- Response redirect có `Cache-Control: private, no-cache, no-store`.

### `logoutAction`

Gọi `signOut({ scope: "local" })`, sau đó redirect `/login`.

### `updateProfileAction`

- Input: `displayName` 1-100 ký tự.
- Actor lấy từ server session; client không gửi/chọn profile id.
- Update `public.profiles.display_name` với filter actor và RLS ownership.
- Thành công revalidate `/profile` và `/dashboard`; lỗi trả typed form state + request ID.

### Auth form error contract

```ts
type ActionState<Field extends string> = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Partial<Record<Field, string[]>>;
  requestId?: string;
};
```

Không trả raw Supabase/SQL error, stack, token hoặc cookie.

## 4. Onboarding implementation và target plan APIs

Phase 3 không tạo REST endpoint onboarding trùng nghiệp vụ. UI dùng Server Actions và typed form state:

| Action | Input | Authorization | Persistence/result |
| --- | --- | --- | --- |
| `saveOnboardingStepAction` | `step` + allowlist field của đúng bước; không có `user_id` | `requireCurrentAccount`; actor từ session; completed user redirect dashboard | Zod validate, upsert own `learner_profiles`, tăng `onboarding_step`, revalidate `/onboarding` |
| `completeOnboardingAction` | Không nhận profile id/completion flag | Session + full-row Zod; RPC tự lấy `auth.uid()` | RPC lock/validate row, ghi completion timestamp, revalidate private layout, redirect `/dashboard` |
| `updateLearnerPreferencesAction` | Test type, bands, date, schedule, skills, goal | Session; chỉ row đã complete; explicit field map | Update own row qua RLS, không đổi completion, revalidate profile/dashboard |

```ts
type OnboardingActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  requestId?: string;
  nextStep?: number;
};
```

Validation chạy ở UI, Zod server và PostgreSQL constraints. Error trả tiếng Việt + request ID; không trả raw Supabase/Postgres error. Database lưu canonical lowercase values, UI map sang label tiếng Việt.

Các HTTP contract goal/plan dưới đây vẫn là target, chưa triển khai trong Phase 3.

### `GET /api/v1/plans/active`

Trả active plan, week hiện tại và summary; không trả toàn bộ content body.

### `POST /api/v1/plans/regenerate`

Header `Idempotency-Key` required.

```json
{
  "goalId": "uuid",
  "reason": "GOAL_UPDATED",
  "effectiveDate": "2026-07-20"
}
```

Tạo plan version mới và supersede plan cũ trong transaction. Không duplicate task.

### `GET /api/v1/tasks/today?date=2026-07-15`

- `date` optional, mặc định local today.
- Validate date không vượt cửa sổ cho phép.
- Trả tasks, active drafts/sessions và weekly progress summary.

### `PATCH /api/v1/tasks/{taskId}`

```json
{
  "transition": "START",
  "expectedStatus": "NOT_STARTED"
}
```

Transitions: `START`, `SUBMIT`, `REVIEW`, `SKIP`. Reschedule dùng endpoint riêng.

### `POST /api/v1/tasks/reschedule`

Header `Idempotency-Key` required.

```json
{
  "items": [{ "taskId": "uuid", "targetDate": "2026-07-17" }],
  "reason": "MISSED_DAY"
}
```

## 5. Content và discovery

### `GET /api/v1/content`

Query: `kind`, `skill`, `type`, `difficulty`, `topic`, `cursor`, `limit`. Learner chỉ nhận published versions.

### `GET /api/v1/content/{contentId}`

Trả published version hiện tại hoặc version snapshot hợp lệ cho session owner. Answer key không nằm trong response learner bình thường.

### `GET /api/v1/question-sets/{setId}/setup`

Trả metadata, type coverage, estimated time, rules; không trả answer key/transcript bị khóa.

## 6. Practice Reading/Listening

### `POST /api/v1/practice/sessions`

Header `Idempotency-Key` required.

```json
{
  "questionSetId": "uuid",
  "studyTaskId": "uuid-or-null",
  "mode": "PRACTICE"
}
```

Response `201`:

```json
{
  "data": {
    "sessionId": "uuid",
    "status": "ACTIVE",
    "contentVersionId": "uuid",
    "startedAt": "2026-07-15T16:30:00Z",
    "timeLimitSec": 1200,
    "questions": []
  }
}
```

Server snapshot version; shuffle order nếu có phải reproducible theo session seed.

### `PUT /api/v1/practice/sessions/{sessionId}/answers/{questionId}`

```json
{
  "answer": { "selected": ["option-uuid"] },
  "clientRevision": 8,
  "timeSpentSec": 42
}
```

Upsert trước submit; response gồm `serverRevision`, `savedAt`.

### `POST /api/v1/practice/sessions/{sessionId}/submit`

Header `Idempotency-Key` required. Server lock session, finalize answers và score deterministic questions một lần.

Response:

```json
{
  "data": {
    "sessionId": "uuid",
    "status": "SCORED",
    "score": 28,
    "maxScore": 40,
    "reviewAvailable": true
  }
}
```

### `GET /api/v1/practice/sessions/{sessionId}/result`

Owner only. Chỉ sau submit mới trả correctness, answer key, explanation và Listening transcript theo policy.

## 7. Vocabulary

### `GET /api/v1/vocabulary`

Filters: `status`, `dueBefore`, `term`, cursor.

### `POST /api/v1/vocabulary`

```json
{
  "term": "sustainable",
  "context": { "type": "CONTENT_VERSION", "id": "uuid" },
  "personalNote": "Thường đi với development"
}
```

Normalize Unicode/case/whitespace; trả record hiện có nếu duplicate hợp lệ.

### `GET /api/v1/vocabulary/review-queue?limit=20`

Trả items `next_review_at <= now()` theo owner.

### `POST /api/v1/vocabulary/{id}/reviews`

```json
{ "rating": 4, "responseMs": 1800 }
```

Append review log và update SRS state trong transaction.

## 8. Writing

### `PUT /api/v1/writing/drafts/{draftId}`

```json
{
  "text": "Essay text...",
  "clientRevision": 12,
  "expectedServerRevision": 11
}
```

Response gồm word count tính server-side và sync state. Draft quá lớn trả 413.

### `POST /api/v1/writing/submissions`

Header `Idempotency-Key` required.

```json
{
  "draftId": "uuid",
  "promptId": "uuid",
  "studyTaskId": "uuid-or-null"
}
```

Server validate owner, published prompt snapshot, min/max words và consent/quota. Transaction tạo immutable submission và unique AI job.

Response `202`:

```json
{
  "data": {
    "submissionId": "uuid",
    "status": "PROCESSING",
    "job": { "id": "uuid", "status": "QUEUED" }
  }
}
```

### `GET /api/v1/writing/submissions/{id}`

Owner only. Trả submission metadata, processing state và validated feedback nếu có. Không trả raw provider response/prompt.

### `POST /api/v1/writing/submissions/{id}/revisions`

Header `Idempotency-Key` required. Tạo immutable revision; không update submission text.

### Writing feedback shape

```json
{
  "overallBandEstimate": 6.0,
  "confidence": "MEDIUM",
  "criteria": {
    "taskResponse": { "band": 6.0, "summary": "...", "evidence": ["..."] },
    "coherenceCohesion": { "band": 6.0, "summary": "...", "evidence": ["..."] },
    "lexicalResource": { "band": 6.0, "summary": "...", "evidence": ["..."] },
    "grammarAccuracy": { "band": 5.5, "summary": "...", "evidence": ["..."] }
  },
  "priorityIssues": [
    {
      "type": "grammar",
      "evidence": "...",
      "why": "...",
      "correction": "...",
      "drill": "..."
    }
  ],
  "strengths": ["..."],
  "revisionPlan": ["..."],
  "disclaimer": "Band ước lượng phục vụ học tập, không phải điểm thi chính thức."
}
```

## 9. Speaking và upload

### `POST /api/v1/speaking/upload-intents`

```json
{
  "promptId": "uuid",
  "mimeType": "audio/webm",
  "sizeBytes": 2450000,
  "durationSec": 118
}
```

Server kiểm tra consent, quota, allowlist, max size/duration và tạo path private scoped owner.

Response:

```json
{
  "data": {
    "uploadIntentId": "uuid",
    "uploadUrl": "signed-short-lived-url",
    "expiresAt": "2026-07-15T16:40:00Z",
    "requiredHeaders": { "content-type": "audio/webm" }
  }
}
```

Không log hoặc cache response chứa signed URL.

### `POST /api/v1/speaking/submissions/finalize`

Header `Idempotency-Key` required.

```json
{
  "uploadIntentId": "uuid",
  "checksum": "sha256:...",
  "studyTaskId": "uuid-or-null"
}
```

Verify object metadata trước khi tạo submission/job. Mismatch xóa/quarantine object theo policy.

### `GET /api/v1/speaking/submissions/{id}`

Owner only. Trả processing state, signed playback URL ngắn khi được phép, transcript và validated feedback.

### `POST /api/v1/speaking/submissions/{id}/transcripts`

Tạo `USER_EDITED` transcript mới; không sửa original.

### `DELETE /api/v1/speaking/submissions/{id}/media`

Yêu cầu xóa recording/transcript theo scope và retention. Response `202` nếu cleanup async.

## 10. AI job status

### `GET /api/v1/ai/jobs/{jobId}`

Owner xem job thuộc own submission; admin có permission xem metadata vận hành. Response không chứa raw input/output.

```json
{
  "data": {
    "id": "uuid",
    "status": "PROCESSING",
    "attemptCount": 1,
    "updatedAt": "2026-07-15T16:31:20Z",
    "error": null
  }
}
```

### `POST /api/v1/admin/ai/jobs/{jobId}/retry`

Permission `ai_jobs.retry`, idempotency required, audit required. Chỉ retry job retryable/DEAD theo policy; không tạo concurrent duplicate.

### `POST /api/v1/admin/ai/jobs/{jobId}/cancel`

Cancel queued/retrying; processing chỉ cooperative cancel nếu provider/runtime hỗ trợ.

## 11. Error notebook và progress

### `GET /api/v1/errors`

Filters: `skill`, `type`, `status`, `dueBefore`, cursor. Owner only.

### `GET /api/v1/errors/{id}`

Trả evidence/correction, source summary và review history. Source content chỉ trả nếu actor có quyền.

### `POST /api/v1/errors/{id}/reviews`

```json
{ "result": "CORRECT", "confidence": 4 }
```

Append review và update next review/status transactionally.

### `GET /api/v1/progress/weekly?week=2026-W29`

Trả effective sessions, completion, minutes, skill trend, recurring errors và data freshness. Phân biệt `observed` và `estimated` metrics.

## 12. Admin content API

Tất cả endpoint cần permission và ghi audit cho mutation.

| Method/Path                                   | Permission             | Mô tả                             |
| --------------------------------------------- | ---------------------- | --------------------------------- |
| `GET /api/v1/admin/content`                   | `content.read_all`     | List version/draft                |
| `POST /api/v1/admin/content`                  | `content.edit`         | Tạo logical item + draft v1       |
| `PUT /api/v1/admin/content/{id}/versions/{v}` | `content.edit`         | Sửa draft, optimistic concurrency |
| `POST /api/v1/admin/content/{id}/review`      | `content.edit`         | DRAFT -> IN_REVIEW                |
| `POST /api/v1/admin/content/{id}/publish`     | `content.publish`      | Validate + snapshot + publish     |
| `POST /api/v1/admin/content/{id}/archive`     | `content.publish`      | Archive current version           |
| `GET /api/v1/admin/audit-logs`                | `audit_logs.view`      | Cursor list, filtered             |
| `GET/PUT /api/v1/admin/feature-flags/{key}`   | `feature_flags.manage` | Read/update rollout               |

Publish request bắt buộc `Idempotency-Key` và `expectedVersion`. Invalid answer key, missing licence/source hoặc broken asset trả `422 CONTENT_INVALID`.

## 13. Health và operational endpoints

### `GET /api/health/live`

Trả process liveness, không query dependency, không auth, không lộ version secret.

Response hiện tại:

```json
{
  "data": {
    "status": "ok"
  },
  "requestId": "uuid"
}
```

### `GET /api/health/ready`

Protected/internal nếu có thể; kiểm tra DB và required config, trả trạng thái tổng quát.

Phase 1 foundation hiện kiểm tra required public environment variables. Khi thiếu hoặc sai config, endpoint trả `503` với normalized error envelope và không lộ giá trị cấu hình:

```json
{
  "error": {
    "code": "CONFIGURATION_ERROR",
    "message": "Required public environment variables are missing or invalid.",
    "requestId": "uuid"
  }
}
```

### `POST /api/internal/jobs/run`

Chỉ scheduler authenticated bằng secret/signature; claim job server-side. Không nhận arbitrary job payload từ public internet.

## 14. Rate limit/quota baseline

| Operation           |                   Baseline beta | Key               |
| ------------------- | ------------------------------: | ----------------- |
| Login/reset         | Theo provider + app abuse limit | IP + account hash |
| Autosave            |                   30/phút/draft | user + draft      |
| Practice submit     |                         10/phút | user              |
| Writing AI          |       quota tuần + burst 2/phút | user + feature    |
| Speaking upload     | max concurrent 2; quota storage | user              |
| AI job status       |         30/phút/job nếu polling | user + job        |
| Admin publish/retry |             thấp, audit mọi lần | actor             |

Giá trị cuối cùng phải cấu hình theo environment và đo tải; không hard-code rải rác.

## 15. Contract testing

- Zod schemas là executable contract cho request/response nội bộ.
- Integration tests cho 401/403/404 scoping, state conflict và idempotency replay.
- User A không đọc/update resource của user B, kể cả đoán UUID.
- Snapshot/contract tests cho AI validated output, không snapshot raw provider prose.
- E2E bắt buộc: onboarding, Today, Reading submit, Writing processing/result, Speaking upload/delete, admin publish.

## 16. Phase 4 learning contracts (implemented)

Phase 4 không tạo REST API mới. Pages gọi server-only data layer; mutation đi qua Server Actions và hai PostgreSQL RPC. Các `/api/v1/content` target ở mục 5 chưa tồn tại và không được xem là implementation hiện tại.

### `openLessonSectionAction(input)`

- Input internal typed object: `{ lessonId: UUID, sectionId: UUID, moduleSlug: slug, lessonSlug: slug }`.
- Authorization: `requireCompletedOnboarding()` rồi Supabase server client dùng session cookie; không nhận actor ID.
- Validation: Zod UUID và lower-kebab slug allowlist.
- Database: `open_lesson_section(p_lesson_id, p_section_id)`.
- Success: `{ status: "success", message, requestId }`.
- Error: `{ status: "error", message, requestId }`; không trả raw Postgres message/constraint.
- Revalidation: exact lesson/module và `/learn`, `/dashboard`, `/progress`.

### `completeLessonSectionAction(previousState, formData)`

- Form fields: `lessonId`, `sectionId`, `moduleSlug`, `lessonSlug`; không có `userId`, `status`, `percent` hoặc timestamps.
- Authorization/validation/result/error/revalidation giống action open.
- Database: `complete_lesson_section(p_lesson_id, p_section_id)` tự kiểm relationship và tự tính completion.
- Pending state dùng `useActionState`; lỗi hiển thị tiếng Việt kèm request ID.

Typed action result:

```ts
type LearningProgressActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  requestId?: string;
};
```

### `open_lesson_section(uuid, uuid default null)` RPC

- Execute: chỉ `authenticated`.
- Actor: `auth.uid()`; lỗi `28000` nếu không có session.
- Validation: learner đã onboarding, lesson/version/module accessible, section thuộc đúng version.
- Result: row `learner_lesson_progress` đã upsert.
- Integrity: stable version snapshot, current-section composite FK, idempotent open/resume.

### `complete_lesson_section(uuid, uuid)` RPC

- Execute/actor/access validation như RPC open.
- Atomic steps: lock actor/progress, upsert completed section, đếm required/required-completed, tính percent, update lesson status/timestamps.
- Result: row `learner_lesson_progress` sau calculation.
- Optional section không block completion; completed lesson gọi lại vẫn completed.

### Read data layer

- `getLearningCatalog()`: published modules/versions + own progress, RLS filtered theo test type.
- `getLearningModule(moduleSlug)`: validation slug rồi lookup catalog.
- `getLessonReader(moduleSlug, lessonSlug, sectionOrder?)`: published hoặc owned archived snapshot, sections, resume selection và deterministic next lesson.
- `getLearningOverview()`: totals/continue/next/recent từ catalog/progress thật.
- Read failures ném `LearningContentReadError` an toàn; invalid/unavailable slug trả `null` để route dùng `notFound()`.

## 17. Versioning policy

- `/api/v1` chỉ có breaking changes qua `/api/v2` hoặc negotiated migration.
- Thêm optional field là non-breaking; đổi enum/state cần compatibility window.
- Client không được suy luận unknown state là success.
- API spec, Zod schema và database migration phải cập nhật cùng task.

## 18. Phase 5 exercise contracts (implemented)

Phase 5 không tạo public REST endpoint. Pages dùng server-only read layer; mutation đi qua Server Actions và PostgreSQL RPC dưới learner JWT.

| Contract | Input đáng tin | Server/database-derived |
| --- | --- | --- |
| `startPracticeAction` / `start_exercise_attempt` | exercise slug, opaque request key | actor, published version snapshot, initial status |
| `savePracticeAnswerAction` / `save_exercise_answer` | attempt UUID, question UUID, selected option UUIDs hoặc text, expected revision | owner, question type/membership, next revision, timestamps |
| `submitPracticeAction` / `submit_exercise_attempt` | attempt UUID | answer keys, correctness, awarded/possible points, score, submitted timestamp |
| `get_exercise_attempt_result` | attempt UUID | ownership, submitted-state gate, answer review/explanation theo content policy |

### 18.1. Start và resume

- `start_exercise_attempt(text, text)` chỉ execute cho `authenticated`, lấy actor từ `auth.uid()` và chọn published version accessible.
- Cùng owner + request key trả lại cùng attempt; request key không phải user ID.
- Read layer trả câu hỏi/option hiển thị và answer draft của owner, không trả private key.

### 18.2. Save answer

- Zod allowlist phân biệt text và option payload; database kiểm tra question/option thuộc pinned version.
- Revision mismatch trả conflict an toàn; duplicate option và invalid option/question bị reject.
- Submitted attempt bị reject mutation bất kể client gửi trạng thái gì.

### 18.3. Submit và result

- `submit_exercise_attempt(uuid)` lock attempt, chấm deterministic trong cùng transaction và idempotent khi replay.
- Client không gửi score, correct answer, completion hoặc owner.
- Result chỉ đọc được sau submit và chỉ bởi owner; cross-user UUID trả unauthorized/not-found boundary, không lộ resource.
- Server Actions revalidate exact practice/result và `/progress`; UI không suy luận success từ client state.

### 18.4. Contract verification

Local Phase 5 pgTAP pass 64/64; verifier contract chạy trên local và remote đều pass 24/24. Remote owner run xác nhận stable slug lookup, publication visibility, hidden-answer boundary, ownership, scoring và submit idempotency sau khi foundation data migration được apply. Không contract nào nhận actor, score hoặc correct answer từ client.

## 19. Phase 6 Reading contracts

| Contract | Trusted input | Database-derived output/invariant |
| --- | --- | --- |
| `startReadingPracticeAction` → `start_exercise_attempt` | published slug, opaque idempotency key | actor, pinned snapshots, start/expiry timestamps |
| `saveReadingAnswerAction` → `save_exercise_answer` | attempt/question UUID, choices or text, next revision | ownership, membership/type/word-limit validation, saved revision/time |
| `get_reading_attempt_clock` | attempt UUID | owner-only `started_at`, `expires_at`, `server_now` |
| `submitReadingPracticeAction` → `submit_exercise_attempt` | attempt UUID only | atomic score, submitted/scored timestamps, late state |
| `get_exercise_attempt_result` | submitted attempt UUID | owner/status gate and conditional review disclosure |

Routes are `/practice/reading`, `/practice/reading/[exerciseSlug]` and `/practice/reading/[exerciseSlug]/result/[attemptId]`. Actions authenticate and Zod-validate but never accept `user_id`, score, correctness, completion or timer state. Conflict responses preserve the browser draft and require reconcile/retry.
# Phase 7 Listening server/RPC contract (2026-07-17)

- `start_exercise_attempt(exercise_slug, idempotency_key)` resolves the accessible published Listening version and derives `time_limit_seconds`/`expires_at` inside PostgreSQL. It does not accept an actor or timer value.
- `save_exercise_answer(attempt_id, question_id, selected_option_ids, answer_text, client_revision)` validates owner, pinned membership, option ownership and monotonic revision. Identical revision replay is safe; a different stale payload raises `40001`.
- `submit_exercise_attempt(attempt_id)` locks and scores the attempt atomically from private answer keys. Repeated submit returns the stored scored attempt.
- `get_listening_attempt_clock(attempt_id)` returns `started_at`, `expires_at` and `server_now` only to the owner.
- `get_listening_attempt_result(attempt_id)` returns score/questions/transcript only after submit and only to the owner. Direct transcript and answer-key table reads are not part of the learner API.

Application routes are `/practice/listening`, `/practice/listening/[exerciseSlug]` and `/practice/listening/[exerciseSlug]/result/[attemptId]`. Server Actions accept only the slug/attempt/question/answer/revision fields required by these RPCs; client-supplied user, score, correctness, submit time or remaining timer values are ignored by schema allowlisting and never sent to PostgreSQL.

# Phase 8 Writing server/RPC contract (2026-07-17)

| Server action / RPC | Accepted client input | Server/database authority |
| --- | --- | --- |
| `startWritingAction` → `start_writing_submission` | published task slug | actor, compatible pinned version, initial revision, start/expiry timestamps |
| `saveWritingDraftAction` → `save_writing_draft` | submission UUID, essay text, expected revision | owner, next revision, word count, minimum state and saved time |
| `submitWritingAction` → `submit_writing_submission` | submission UUID and opaque idempotency key | immutable text snapshot, checksum, word count, status, submitted time and late state |
| `get_writing_submission_clock` | submission UUID | owner-only start/expiry/server/submitted timestamps |
| `requestWritingFeedbackAction` → `start_writing_feedback_request` | submitted UUID and explicit consent | actor, essay/prompt from PostgreSQL, quota, lease, version metadata and nonce |
| `finalize_writing_feedback` / `fail_writing_feedback_run` | server HMAC payload or allowlisted error | Vault-backed signature, schema/evidence validation, atomic immutable result/run state |

Routes are `/practice/writing`, `/practice/writing/[taskSlug]` and `/practice/writing/[taskSlug]/submission/[submissionId]`. Review lookup requires an owner submission with database status `submitted`; the browser cannot open feedback on a draft by changing a URL or status field.

The optional provider path uses the official OpenAI Responses API server-side with `store: false`, Structured Outputs, moderation, no SDK retry and a 25-second timeout. `OPENAI_API_KEY`, model and signing secret are server-only. Missing configuration returns a safe unavailable state while the submitted essay remains readable. Provider errors never create synthetic feedback and only an allowlisted error code is persisted. Validated output is explicitly labelled a practice estimate, not an official IELTS score.

## 23. Phase 9 Speaking contracts

Phase 9 adds no custom public REST endpoint. Server Components read through the learner JWT and RLS; Server Actions validate Zod input and use the same actor session.

| Contract | Client input | Server/database authority |
| --- | --- | --- |
| `startSpeakingAction` → `start_speaking_attempt` | published set slug | actor, compatible version, active attempt, status and timestamps |
| `createSpeakingUploadIntentAction` → `create_speaking_upload_intent` | attempt/prompt IDs and claimed file envelope | owner/membership/editable state, exact private path and expiry |
| browser Storage upload | issued bucket/path and Blob | bucket limits plus actor/intent Storage policy; no service role |
| `verifySpeakingUploadAction` → `finalize_speaking_upload` | intent ID | server media signature/MIME/bytes/duration/checksum verification and HMAC/Vault finalization |
| `submitSpeakingAction` → `submit_speaking_attempt` | attempt ID and opaque key | required ready responses, submitted state/time and immutability |
| `requestSpeakingAiReviewAction` | submitted attempt ID and explicit consent | real provider transcript, transcript checksum and optional structured practice feedback |

Provider absence or failure returns a safe unavailable/error state without synthetic transcript or feedback. Full object URLs, signed URLs, transcripts and prompts are not logged. Owner signed URLs expire after 10 minutes.

## 24. Phase 10A Mock Test contracts

Phase 10A adds no custom public REST endpoint. Server Components read through the learner JWT and RLS. Server Actions accept only slugs/UUIDs and opaque idempotency keys validated by Zod; actor, score, state and timestamps are never accepted from the browser.

| Contract | Client input | PostgreSQL authority |
| --- | --- | --- |
| `startMockTestAction` → `start_mock_test` | published mock slug | actor, compatible published version, version pin, active-session resume and start time |
| `startMockSectionAction` → `start_mock_test_section` | session/section UUIDs | owner, version membership, required order, database timer and underlying engine attempt/submission |
| `submitMockTestSectionAction` → `submit_mock_test_section` | section-attempt UUID and opaque key | owner, engine submit/scoring, immutable submitted state, late flag and next section |
| `get_mock_test_section_clock` | section-attempt UUID | owner-only start/expiry/server/submitted timestamps |
| `submitMockTestAction` → `submit_mock_test` | session UUID and opaque key | all required sections submitted, immutable submitted state/time |
| `complete_mock_test` | submitted session UUID | real Reading/Listening raw scores and Writing/Speaking owner references |

Routes are `/mock-tests`, `/mock-tests/[mockTestSlug]`, `/mock-tests/[mockTestSlug]/session/[sessionId]` and the nested `/summary`. Existing practice runners receive a validated mock context and route section submit through the orchestration RPC. Review remains governed by each reused engine's owner and submitted-state rules. No Phase 10A contract returns or accepts an aggregate IELTS band.

## 25. Phase 10B learner analytics contracts

All Phase 10B contracts are read-only RPC calls from authenticated Server Components. They accept no actor identifier and execute under the learner JWT/RLS.

| RPC | Input | Safe output |
| --- | --- | --- |
| `get_learner_progress_overview` | none | Lesson totals/progress and active/completed counts |
| `get_learner_skill_progress` | none | Objective persisted score totals/accuracy/sample count; Writing/Speaking submission count and feedback status |
| `get_learner_recent_activity` | bounded `p_limit` 1–20 | Title, status, timestamp, safe route and optional persisted objective score |
| `get_learner_mock_test_history` | bounded `p_limit` 1–20 | Session lifecycle and optional persisted raw Reading/Listening score |

Invalid limits return `22023`; missing actor returns `42501`. No contract accepts or returns a band trend, essay, audio path, transcript, answer key or another learner's identifier.
