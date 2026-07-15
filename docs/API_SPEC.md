# API SPEC - Web tự học IELTS

> Phiên bản: 1.0  
> Style: Next.js Server Actions cho mutation UI; Route Handlers cho HTTP/upload/job/ops  
> Base path cho Route Handlers: `/api/v1`

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

Auth UI dùng Supabase flow; app cung cấp endpoint kiểm tra session tối thiểu.

### `GET /api/v1/me`

Trả profile, roles/permissions cần cho UI và onboarding state. Không trả token/claims thô.

```json
{
  "data": {
    "id": "uuid",
    "displayName": "Trường",
    "timezone": "Asia/Ho_Chi_Minh",
    "locale": "vi-VN",
    "onboardingComplete": true,
    "roles": ["LEARNER"],
    "permissions": ["learn.use", "own_data.read", "own_data.write"]
  }
}
```

## 4. Goals, onboarding và plan

### `POST /api/v1/onboarding/complete`

HTTP equivalent của `completeOnboarding`.

Request:

```json
{
  "testType": "ACADEMIC",
  "currentOverall": 5.0,
  "targetOverall": 6.5,
  "examDate": "2026-12-15",
  "minutesPerDay": 45,
  "studyDays": [1, 2, 4, 5, 6],
  "weakSkills": ["WRITING", "LISTENING"],
  "timezone": "Asia/Ho_Chi_Minh",
  "consents": [
    { "type": "AI_PROCESSING", "version": "2026-07", "granted": true }
  ]
}
```

Response `201`: goal và plan version 1. Transaction phải tránh trạng thái onboarding complete nhưng không có plan.

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

## 16. Versioning policy

- `/api/v1` chỉ có breaking changes qua `/api/v2` hoặc negotiated migration.
- Thêm optional field là non-breaking; đổi enum/state cần compatibility window.
- Client không được suy luận unknown state là success.
- API spec, Zod schema và database migration phải cập nhật cùng task.
