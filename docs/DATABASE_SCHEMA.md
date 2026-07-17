# DATABASE SCHEMA - Web tự học IELTS

> Phiên bản: 1.0  
> Database: PostgreSQL/Supabase  
> Quy ước: `snake_case`, UUID, `timestamptz`, UTC khi lưu và timezone khi hiển thị

## 1. Nguyên tắc

- `auth.users` là nguồn identity; `public.profiles.id = auth.users.id`.
- Bảng user-owned có `user_id` rõ để RLS và query ownership đơn giản.
- Không hard-delete dữ liệu ảnh hưởng kết quả học tập nếu chưa qua retention/delete workflow.
- Content đã publish, submission đã submit và feedback run là snapshot bất biến.
- State transition không update tùy ý từ client.
- Idempotency key dùng cho mutation có nguy cơ retry/double-click.
- `created_at`, `updated_at` dùng `timestamptz`; trigger quản lý `updated_at`.
- Dữ liệu analytics aggregate có thể rebuild; không dùng làm nguồn sự thật nghiệp vụ.

## 2. Extensions và kiểu dùng chung

Khuyến nghị extensions: `pgcrypto`, `citext`; chỉ bật `pg_trgm` khi search cần thiết.

### 2.1. Enums hoặc CHECK constraints

| Type                | Values                                                                          |
| ------------------- | ------------------------------------------------------------------------------- |
| `app_role`          | `LEARNER`, `CONTENT_EDITOR`, `SUPPORT`, `ADMIN`, `SUPER_ADMIN`                  |
| `test_type`         | `ACADEMIC`, `GENERAL_TRAINING`                                                  |
| `skill_type`        | `LISTENING`, `READING`, `WRITING`, `SPEAKING`, `VOCABULARY`, `GRAMMAR`          |
| `goal_status`       | `ACTIVE`, `COMPLETED`, `ARCHIVED`                                               |
| `plan_status`       | `DRAFT`, `ACTIVE`, `SUPERSEDED`, `COMPLETED`                                    |
| `task_status`       | `NOT_STARTED`, `IN_PROGRESS`, `SUBMITTED`, `REVIEWED`, `SKIPPED`, `RESCHEDULED` |
| `content_status`    | `DRAFT`, `IN_REVIEW`, `PUBLISHED`, `ARCHIVED`                                   |
| `practice_status`   | `DRAFT`, `ACTIVE`, `SUBMITTED`, `SCORED`, `REVIEWED`, `ABANDONED`               |
| `submission_status` | `DRAFT`, `SUBMITTED`, `PROCESSING`, `FEEDBACK_READY`, `FAILED`, `DELETED`       |
| `job_status`        | `QUEUED`, `PROCESSING`, `COMPLETED`, `FAILED`, `RETRYING`, `DEAD`, `CANCELLED`  |
| `error_status`      | `OPEN`, `REVIEWING`, `MASTERED`, `ARCHIVED`                                     |
| `confidence_level`  | `LOW`, `MEDIUM`, `HIGH`                                                         |

PostgreSQL enum phù hợp cho state ổn định; taxonomy mở như question type/topic nên dùng lookup/tag table hoặc validated text.

## 3. Sơ đồ domain cấp cao

```mermaid
erDiagram
  AUTH_USERS ||--|| PROFILES : has
  PROFILES ||--o| LEARNER_PROFILES : personalizes
  PROFILES ||--o{ LEARNING_GOALS : owns
  LEARNING_GOALS ||--o{ STUDY_PLANS : versions
  STUDY_PLANS ||--o{ PLAN_WEEKS : contains
  STUDY_PLANS ||--o{ STUDY_TASKS : schedules
  CONTENT_ITEMS ||--o{ CONTENT_VERSIONS : versions
  CONTENT_VERSIONS ||--o{ QUESTION_SETS : contains
  QUESTION_SETS ||--o{ QUESTIONS : contains
  PROFILES ||--o{ PRACTICE_SESSIONS : starts
  PRACTICE_SESSIONS ||--o{ ATTEMPT_ANSWERS : records
  PROFILES ||--o{ WRITING_SUBMISSIONS : writes
  WRITING_SUBMISSIONS ||--o{ WRITING_REVISIONS : revises
  PROFILES ||--o{ SPEAKING_SUBMISSIONS : records
  SPEAKING_SUBMISSIONS ||--o| AUDIO_ASSETS : uses
  SPEAKING_SUBMISSIONS ||--o{ TRANSCRIPTS : has
  PROFILES ||--o{ AI_JOBS : queues
  AI_JOBS ||--o{ AI_FEEDBACK_RUNS : executes
  PROFILES ||--o{ ERROR_ITEMS : owns
  PROFILES ||--o{ USER_VOCABULARY : learns
```

## 4. Identity, settings và consent

### 4.1. `profiles`

Schema đang được triển khai bởi migration Phase 2:

| Column                     | Type        | Rules                                     |
| -------------------------- | ----------- | ----------------------------------------- |
| `id`                       | uuid PK     | FK `auth.users(id)` ON DELETE CASCADE     |
| `display_name`             | text        | nullable; trimmed, 1-100 chars khi có     |
| `timezone`                 | text        | required, default `Asia/Ho_Chi_Minh`      |
| `locale`                   | text        | required, default `vi-VN`                 |
| `created_at`, `updated_at` | timestamptz | required, database default `now()`        |

`current_band`, `target_band`, `target_exam_date` và `onboarding_completed_at` thuộc domain `learner_profiles`; không nhồi vào identity profile.

Database behavior:

- `on_auth_user_created` chạy `public.handle_new_auth_user()` sau INSERT `auth.users`, đọc duy nhất metadata tên hiển thị và insert idempotent.
- Backfill tạo profile còn thiếu nhưng không ghi đè row đã có.
- `set_profiles_updated_at` cập nhật timestamp phía database.
- Email vẫn thuộc Supabase Auth, không sao chép vào `profiles`.

### 4.2. `learner_profiles` (Phase 3 implemented)

Migration `20260716040212_phase_3_learner_onboarding.sql` tạo một row tối đa cho mỗi profile. Row được tạo lazy bằng server-side upsert khi user lưu bước đầu tiên; actor luôn lấy từ session, không lấy `user_id` từ form.

| Column | Type | Nullable | Constraint/semantics |
| --- | --- | --- | --- |
| `user_id` | uuid PK | no | FK `profiles(id)` ON DELETE CASCADE |
| `test_type` | text | yes | `academic` hoặc `general_training` |
| `current_band` | numeric(2,1) | yes | 0-9, bước 0.5; null là chưa biết |
| `target_band` | numeric(2,1) | yes while draft | 0-9, bước 0.5; bắt buộc khi complete |
| `target_exam_date` | date | yes | null hoặc không ở quá khứ theo timezone profile khi nhập/sửa |
| `daily_study_minutes` | smallint | yes while draft | 15, 30, 45, 60, 90 hoặc 120 |
| `study_days_per_week` | smallint | yes while draft | integer 1-7 |
| `priority_skills` | text[] | no | subset unique của listening/reading/writing/speaking |
| `primary_goal` | text | yes while draft | allowlist goal Phase 3 |
| `onboarding_step` | smallint | no | 1-8; bước resume hiện tại |
| `onboarding_completed_at` | timestamptz | yes | chỉ RPC server/database ghi; UTC |
| `created_at`, `updated_at` | timestamptz | no | database `now()`; update trigger |

RLS/grants:

- `authenticated`: SELECT/INSERT/UPDATE đúng row có `user_id = auth.uid()`; không DELETE.
- Column grants chỉ cho phép các preference và `onboarding_step`; không cho ghi completion/timestamps.
- `anon`: không có table grant và không execute completion RPC.
- `complete_learner_onboarding()` là hardened SECURITY DEFINER, `search_path = ''`, tự lấy `auth.uid()`, lock row, validate đủ field rồi idempotently ghi completion timestamp.
- Không tạo index phụ: PK đã phục vụ toàn bộ lookup Phase 3 theo user.

### 4.3. `user_roles`

`user_id uuid`, `role app_role`, `granted_by uuid`, `granted_at timestamptz`, unique `(user_id, role)`.

Role mutation chỉ qua protected server function/use case; learner không tự ghi.

### 4.4. `user_settings`

`user_id PK`, `study_reminder_enabled`, `email_enabled`, `daily_reminder_time`, `week_starts_on`, `reduced_motion`, timestamps.

### 4.5. `consents`

| Column                      | Type                                                           |
| --------------------------- | -------------------------------------------------------------- |
| `id`                        | uuid PK                                                        |
| `user_id`                   | uuid FK                                                        |
| `consent_type`              | text (`TERMS`, `PRIVACY`, `AI_PROCESSING`, `AUDIO_PROCESSING`) |
| `version`                   | text                                                           |
| `granted`                   | boolean                                                        |
| `recorded_at`, `revoked_at` | timestamptz                                                    |
| `metadata`                  | jsonb, không lưu fingerprint quá mức cần thiết                 |

Unique `(user_id, consent_type, version)`.

## 5. Goals và planning

### 5.1. `learning_goals`

| Column                              | Type         | Rules                     |
| ----------------------------------- | ------------ | ------------------------- |
| `id`                                | uuid PK      |                           |
| `user_id`                           | uuid FK      | owner                     |
| `test_type`                         | enum         | default `ACADEMIC`        |
| `current_overall`, `target_overall` | numeric(2,1) | 0-9 step 0.5              |
| `target_by_skill`                   | jsonb        | optional, keys theo skill |
| `exam_date`                         | date         | nullable                  |
| `minutes_per_day`                   | smallint     | 5-240                     |
| `study_days`                        | smallint[]   | ISO 1-7, unique           |
| `weak_skills`                       | skill_type[] | tối đa 4                  |
| `status`                            | goal_status  |                           |
| `created_at`, `updated_at`          | timestamptz  |                           |

Partial unique index: một `ACTIVE` goal/user.

### 5.2. `diagnostic_sessions`

`id`, `user_id`, `goal_id`, `status`, `started_at`, `submitted_at`, `scores jsonb`, `evidence jsonb`, `confidence_by_skill jsonb`, `content_version_id`.

### 5.3. `study_plans`

| Column                   | Type         | Rules                           |
| ------------------------ | ------------ | ------------------------------- |
| `id`                     | uuid PK      |                                 |
| `user_id`, `goal_id`     | uuid FK      | denormalize owner để RLS/index  |
| `version`                | integer      | >= 1                            |
| `start_date`, `end_date` | date         | end >= start                    |
| `status`                 | plan_status  |                                 |
| `rationale`              | jsonb        | inputs, rules và lý do thay đổi |
| `generator_version`      | text         | required                        |
| `supersedes_plan_id`     | uuid FK self | nullable                        |
| timestamps               | timestamptz  |                                 |

Unique `(user_id, goal_id, version)`; partial unique một `ACTIVE` plan/user/goal.

### 5.4. `plan_weeks`

`id`, `plan_id`, `week_number`, `starts_on`, `ends_on`, `focus_skills skill_type[]`, `maintenance_skill`, `target_minutes`, `rationale jsonb`.

Unique `(plan_id, week_number)`; tối đa 2 focus skills được validate ở service/DB function.

### 5.5. `study_tasks`

| Column                                      | Type         | Rules                                |
| ------------------------------------------- | ------------ | ------------------------------------ |
| `id`                                        | uuid PK      |                                      |
| `user_id`, `plan_id`, `plan_week_id`        | uuid FK      | owner denormalized                   |
| `scheduled_date`                            | date         | theo learner timezone                |
| `task_type`                                 | text         | validated taxonomy                   |
| `skill`                                     | skill_type   |                                      |
| `source_type`, `source_id`                  | text, uuid   | typed reference validated by service |
| `estimated_minutes`                         | smallint     | 1-240                                |
| `priority`                                  | smallint     | 1-5                                  |
| `status`                                    | task_status  |                                      |
| `started_at`, `submitted_at`, `reviewed_at` | timestamptz  | nullable                             |
| `rescheduled_from_id`                       | uuid FK self | nullable                             |
| timestamps                                  | timestamptz  |                                      |

Indexes: `(user_id, scheduled_date, status)`, `(plan_id, scheduled_date)`. Duplicate guard theo `(plan_id, scheduled_date, task_type, source_type, source_id)` khi source không null.

### 5.6. `task_events`

Append-only: `id`, `user_id`, `task_id`, `event_type`, `from_status`, `to_status`, `occurred_at`, `metadata jsonb`, `idempotency_key`.

## 6. Content và question bank

### 6.1. `content_items`

Logical identity: `id`, `kind`, `slug`, `current_published_version_id`, `created_by`, timestamps. Unique lower-case slug.

### 6.2. `content_versions`

| Column                                       | Type            |
| -------------------------------------------- | --------------- |
| `id`                                         | uuid PK         |
| `content_item_id`                            | uuid FK         |
| `version`                                    | integer         |
| `status`                                     | content_status  |
| `title`, `summary`, `body_json`              | text/text/jsonb |
| `skill`, `difficulty`, `topic`               | enum/text/text  |
| `estimated_minutes`                          | smallint        |
| `source_name`, `source_url`, `licence`       | text            |
| `created_by`, `approved_by`                  | uuid            |
| `approved_at`, `published_at`, `archived_at` | timestamptz     |
| `checksum`                                   | text            |

Unique `(content_item_id, version)`. Published rows không update nội dung; DB trigger có thể enforce.

### 6.3. Tags

- `tags(id, group_name, code, label, active)` unique `(group_name, code)`.
- `content_version_tags(content_version_id, tag_id)` PK đôi.

### 6.4. `question_sets`

`id`, `content_version_id`, `skill`, `title`, `instructions`, `time_limit_sec`, `settings jsonb`, `version_checksum`.

### 6.5. `questions`

`id`, `question_set_id`, `position`, `question_type`, `prompt_json`, `points numeric`, `difficulty`, `metadata jsonb`.

Unique `(question_set_id, position)`.

### 6.6. `question_options`, `answer_keys`, `explanations`

- Options: `id`, `question_id`, `position`, `value`, `label`, unique `(question_id, position)`.
- Answer keys: `question_id PK`, `answer_json`, `scoring_rule`, `case_sensitive`, `normalization_rules`.
- Explanations: `question_id PK`, `explanation_json`, `source_refs jsonb`.

Answer keys chỉ được expose qua trusted server path sau submit.

### 6.7. Writing/Speaking prompts

`writing_prompts` và `speaking_prompts` tham chiếu `content_version_id`, có `task_type/part`, `prompt_text`, `asset_id`, `constraints jsonb`, `rubric_version_id`.

## 7. Practice

### 7.1. `practice_sessions`

| Column                                                   | Type                                             |
| -------------------------------------------------------- | ------------------------------------------------ |
| `id`                                                     | uuid PK                                          |
| `user_id`                                                | uuid FK                                          |
| `study_task_id`                                          | uuid nullable                                    |
| `question_set_id`, `content_version_id`                  | uuid FK snapshot                                 |
| `mode`                                                   | text (`PRACTICE`, `TIMED`, `DIAGNOSTIC`, `MOCK`) |
| `status`                                                 | practice_status                                  |
| `started_at`, `submitted_at`, `scored_at`, `reviewed_at` | timestamptz                                      |
| `duration_sec`, `score`, `max_score`                     | integer/numeric                                  |
| `idempotency_key`                                        | text                                             |
| `client_revision`                                        | integer                                          |
| timestamps                                               | timestamptz                                      |

Unique `(user_id, idempotency_key)` khi key không null.

### 7.2. `attempt_answers`

`id`, `practice_session_id`, `question_id`, `answer_json`, `is_correct`, `score`, `time_spent_sec`, `client_revision`, `saved_at`, `finalized_at`.

Unique `(practice_session_id, question_id)`. Sau session `SUBMITTED`, answer không update.

### 7.3. `annotations`

`id`, `user_id`, `practice_session_id`, `content_version_id`, `anchor_json`, `note_text`, timestamps. Anchor phải refer snapshot version.

## 8. Vocabulary và SRS

### 8.1. `vocabulary_items`

Shared canonical lexeme: `id`, `term`, `normalized_term`, `language`, `meaning_json`, `ipa`, `audio_asset_id`, `examples jsonb`.

Unique `(language, normalized_term)` chỉ cho canonical item; personal meaning nằm ở user table.

### 8.2. `user_vocabulary`

`id`, `user_id`, `vocabulary_item_id`, `context_type`, `context_id`, `personal_note`, `status`, `ease_factor`, `interval_days`, `repetitions`, `next_review_at`, timestamps.

Unique `(user_id, vocabulary_item_id, context_type, context_id)` với quy ước null context rõ.

### 8.3. `vocab_reviews`

Append-only: `id`, `user_vocabulary_id`, `user_id`, `rating` (0-5), `reviewed_at`, `previous_state jsonb`, `next_state jsonb`, `response_ms`.

## 9. Writing

### 9.1. `writing_drafts`

`id`, `user_id`, `prompt_id`, `study_task_id`, `text`, `word_count`, `client_revision`, `server_revision`, `last_saved_at`, timestamps.

Unique active draft theo `(user_id, prompt_id, study_task_id)` nếu phù hợp.

### 9.2. `writing_submissions`

`id`, `user_id`, `prompt_id`, `study_task_id`, `draft_id`, `text`, `word_count`, `status`, `submitted_at`, `idempotency_key`, `content_checksum`.

Unique `(user_id, idempotency_key)`. `text` immutable sau insert.

### 9.3. `writing_revisions`

`id`, `user_id`, `submission_id`, `parent_revision_id`, `revision_number`, `text`, `word_count`, `submitted_at`, `change_summary jsonb`.

Unique `(submission_id, revision_number)`; immutable.

## 10. Speaking và media

### 10.1. `upload_intents`

`id`, `user_id`, `purpose`, `expected_mime`, `max_bytes`, `max_duration_sec`, `storage_path`, `expires_at`, `status`, `checksum`, timestamps.

Storage path bắt đầu bằng owner ID; finalize một lần.

### 10.2. `audio_assets`

`id`, `user_id`, `storage_bucket`, `storage_path`, `mime_type`, `size_bytes`, `duration_sec`, `checksum`, `status`, `retention_until`, `deleted_at`, timestamps.

Unique `(storage_bucket, storage_path)`; không trả path trực tiếp cho browser.

### 10.3. `speaking_submissions`

`id`, `user_id`, `prompt_id`, `study_task_id`, `audio_asset_id`, `duration_sec`, `status`, `consent_version`, `submitted_at`, `idempotency_key`.

### 10.4. `transcripts`

`id`, `user_id`, `speaking_submission_id`, `kind` (`ORIGINAL`, `USER_EDITED`), `text`, `segments jsonb`, `language`, `quality`, `source_transcript_id`, timestamps.

Original immutable; edited transcript là row mới.

## 11. AI và jobs

### 11.1. `prompt_versions`, `rubric_versions`

- Prompt: `id`, `feature`, `version`, `template`, `schema_json`, `status`, `created_by`, timestamps.
- Rubric: `id`, `skill`, `version`, `descriptor_json`, `licence/source metadata`, status.

Unique `(feature, version)` và `(skill, version)`.

### 11.2. `ai_jobs`

| Column                                           | Type           |
| ------------------------------------------------ | -------------- |
| `id`                                             | uuid PK        |
| `user_id`                                        | uuid FK        |
| `job_type`, `entity_type`, `entity_id`           | text/text/uuid |
| `status`                                         | job_status     |
| `idempotency_key`                                | text           |
| `attempt_count`, `max_attempts`                  | smallint       |
| `available_at`, `locked_at`, `lease_expires_at`  | timestamptz    |
| `locked_by`                                      | text           |
| `last_error_code`, `last_error_message_redacted` | text           |
| `created_at`, `updated_at`, `completed_at`       | timestamptz    |

Unique `(user_id, job_type, entity_id, idempotency_key)`. Index `(status, available_at)` và lease recovery.

### 11.3. `ai_feedback_runs`

`id`, `job_id`, `user_id`, `entity_type`, `entity_id`, `model`, `prompt_version_id`, `rubric_version_id`, `input_checksum`, `output_json`, `raw_response_ref`, `validation_status`, `confidence`, `input_tokens`, `output_tokens`, `estimated_cost`, `latency_ms`, `created_at`.

Output chỉ được cấp cho UI khi `validation_status = VALID`.

## 12. Error notebook và analytics

### 12.1. `error_items`

`id`, `user_id`, `skill`, `error_type`, `source_type`, `source_id`, `source_anchor jsonb`, `evidence`, `correction`, `explanation`, `status`, `occurrence_count`, `first_seen_at`, `last_seen_at`, `next_review_at`.

Index `(user_id, status, next_review_at)`; duplicate key nghiệp vụ gồm owner + source + anchor + error type.

### 12.2. `error_reviews`

Append-only: `id`, `user_id`, `error_item_id`, `result`, `confidence`, `reviewed_at`, `next_review_at`.

### 12.3. `events`

Append-only, có retention: `id`, `user_id`, `event_name`, `occurred_at`, `local_date`, `entity_type`, `entity_id`, `properties jsonb`, `schema_version`.

Không đưa raw writing/transcript vào analytics properties.

### 12.4. `daily_learning_stats`, `skill_mastery`

- Daily: unique `(user_id, local_date)`; minutes, task counts, effective sessions, reviews.
- Mastery: unique `(user_id, skill, taxonomy_key)`; score 0-1, inputs summary, algorithm version, calculated_at.

## 13. Admin, feature flags và audit

### 13.1. `feature_flags`

`id`, `key`, `description`, `environment`, `enabled`, `rollout_percentage`, `cohort_rule jsonb`, `updated_by`, timestamps. Unique `(key, environment)`.

### 13.2. `admin_audit_logs`

Append-only: `id`, `actor_id`, `permission`, `action`, `entity_type`, `entity_id`, `before_summary jsonb`, `after_summary jsonb`, `trace_id`, `created_at`.

Không lưu secret hoặc full sensitive content trong before/after.

### 13.3. `idempotency_records`

`id`, `user_id`, `operation`, `key`, `request_hash`, `resource_type`, `resource_id`, `response_code`, `response_json`, `expires_at`, timestamps. Unique `(user_id, operation, key)`.

## 14. State machines

### 14.1. Study task

```text
NOT_STARTED -> IN_PROGRESS -> SUBMITTED -> REVIEWED
NOT_STARTED/IN_PROGRESS -> SKIPPED
NOT_STARTED/IN_PROGRESS -> RESCHEDULED -> new task NOT_STARTED
```

Không `REVIEWED` khi chưa có review/feedback evidence.

### 14.2. Practice session

```text
DRAFT -> ACTIVE -> SUBMITTED -> SCORED -> REVIEWED
DRAFT/ACTIVE -> ABANDONED
```

### 14.3. AI job

```text
QUEUED -> PROCESSING -> COMPLETED
PROCESSING -> FAILED -> RETRYING -> PROCESSING
FAILED/RETRYING -> DEAD
QUEUED/RETRYING -> CANCELLED
```

### 14.4. Content và plan

```text
Content: DRAFT -> IN_REVIEW -> PUBLISHED -> ARCHIVED
Plan: DRAFT -> ACTIVE -> SUPERSEDED
Plan: DRAFT/ACTIVE -> COMPLETED
```

## 15. RLS baseline

### 15.1. User-owned tables

- `SELECT/INSERT/UPDATE`: `user_id = auth.uid()` và transition/field restrictions qua server.
- Riêng `profiles`: authenticated chỉ được `SELECT` row `id = auth.uid()` và `UPDATE(display_name)` row đó; không có client INSERT/DELETE policy.
- `anon` không có grant đọc/ghi `profiles`; authenticated không có broad table UPDATE.
- Không cho learner `DELETE` trực tiếp submission, audio metadata hoặc audit/event; dùng delete workflow.
- Child table policy dựa trên denormalized `user_id` hoặc `EXISTS` parent ownership có index.

### 15.2. Content

- Learner đọc `PUBLISHED` version.
- Content editor đọc draft theo permission; insert/update draft.
- Publish/archive chỉ qua server use case có permission và audit.

### 15.3. Admin/ops

- Role/permission lấy từ trusted table/claim được server xác minh.
- Không mở broad `USING (is_admin())` cho mọi bảng.
- Service role worker vẫn scope entity theo job owner và business invariant.

Tất cả policy phải có integration tests user A/user B và role matrix.

## 16. Index checklist

- Mọi FK dùng cho join/delete có index.
- `study_tasks(user_id, scheduled_date, status)`.
- `practice_sessions(user_id, status, started_at desc)`.
- `writing_submissions(user_id, submitted_at desc)`.
- `ai_jobs(status, available_at)` và `(user_id, entity_type, entity_id)`.
- `error_items(user_id, status, next_review_at)`.
- `events(user_id, occurred_at)`; cân nhắc partition/retention sau khi có tải.
- `content_versions(content_item_id, status, version desc)`.
- GIN chỉ cho JSONB có query thực tế; không tạo mặc định.

## 17. Migration và seed

- Migration forward-only trong CI; production có forward-fix/rollback plan rõ.
- Migration hiện có: `20260716015215_phase_2_auth_profiles.sql`; local và remote history cùng version `20260716015215`.
- `supabase/tests/database/phase_2_profiles.test.sql` kiểm tra 21 case bằng pgTAP local; verifier TAP remote kiểm tra 21 case object/trigger/grant/RLS trực tiếp và rollback toàn bộ fixture.
- Seed dev/test: 2 learner để test cross-user, 1 editor, 1 admin; goal/plan/task; published lesson; Reading set; Listening set; Writing prompt; Speaking prompt.
- Không seed production credential hoặc nội dung không rõ licence.
- Migration thay state/schema phải tương thích ít nhất một deploy window giữa app cũ/mới.

## 18. Phase 4 learning content/progress schema (implemented)

Migration nguồn sự thật: `20260716100110_phase_4_learning_content_progress.sql`. Phần content/question-bank ở mục 6 vẫn là target cho practice/admin tương lai; các bảng dưới đây là lesson foundation đã tồn tại thật.

### 19.1. Content tables

| Table | Columns chính | Constraints và quan hệ |
| --- | --- | --- |
| `learning_modules` | `id`, `slug`, `title`, `description`, `skill`, `test_type`, `difficulty`, `display_order`, `status`, `estimated_minutes`, `published_at`, timestamps | PK UUID; slug unique/lower kebab; canonical CHECK; order/time bounds; publication timestamp phải khớp lifecycle |
| `lessons` | `id`, `module_id`, `slug`, `display_order`, timestamps | FK module `RESTRICT`; unique `(module_id, slug)` và `(module_id, display_order)` |
| `lesson_versions` | `id`, `lesson_id`, `version`, `title`, `summary`, `difficulty`, `estimated_minutes`, `status`, `published_at`, `archived_at`, timestamps | FK lesson `RESTRICT`; unique `(lesson_id, version)`; partial unique một published version/lesson; lifecycle/time/content CHECK |
| `lesson_sections` | `id`, `lesson_version_id`, `section_type`, `title`, `body_markdown`, `display_order`, `is_required`, timestamps | FK version `RESTRICT`; type allowlist; Markdown 1–20,000 chars; unique order trong version |

Canonical values:

- skill: `foundations`, `listening`, `reading`, `writing`, `speaking`, `vocabulary`, `grammar`.
- test type: `academic`, `general_training`, `both`.
- difficulty: `beginner`, `intermediate`, `advanced`.
- lifecycle: `draft`, `in_review`, `published`, `archived`.
- section type: `text`, `example`, `checklist`, `tip`, `warning`, `summary`.

Published lesson versions và sections không được UPDATE/DELETE bởi protection triggers. Publish validation yêu cầu ít nhất một required section.

### 19.2. Progress tables

| Table | Columns chính | Constraints và quan hệ |
| --- | --- | --- |
| `learner_lesson_progress` | `user_id`, `lesson_id`, `lesson_version_id`, `status`, `current_section_id`, `progress_percent`, `started_at`, `last_accessed_at`, `completed_at`, timestamps | PK `(user_id, lesson_id)`; FK profile cascade; composite FK bảo đảm version thuộc lesson và section thuộc version; percent 0–100; completion/status/timestamp invariant |
| `learner_section_progress` | `user_id`, `lesson_id`, `lesson_version_id`, `section_id`, `last_viewed_at`, `completed_at`, timestamps | PK `(user_id, section_id)`; FK lesson progress cascade; composite FK bảo đảm lesson-version-section chain |

Không lưu row `not_started`. `in_progress` bắt buộc percent `< 100` và chưa có `completed_at`; `completed` bắt buộc percent `100` và có timestamp. Optional sections có thể hoàn thành nhưng không nằm trong mẫu số completion.

### 19.3. Indexes

- Catalog published theo `display_order`.
- Lesson version theo lesson/status/version và partial unique published.
- Lesson progress theo user/status/last access, version và current section.
- Section progress theo user/lesson, version và section.
- Không tạo index trùng PK/unique constraints.

### 19.4. RLS, policies và grants

RLS bật trên cả sáu bảng. `anon` không có table privilege. `authenticated` chỉ có `SELECT`; không có direct content/progress write.

- Content SELECT gọi các helper `private.*_is_accessible` để kiểm tra full parent chain, onboarding complete và test type.
- Draft/in-review không đọc được qua Data API.
- Archived chỉ đọc được nếu actor đã có progress trên snapshot liên quan.
- Progress SELECT yêu cầu `auth.uid() = user_id`.
- RPC execute chỉ cấp cho `authenticated`; `PUBLIC`/`anon` bị revoke.
- Helper/RPC là `SECURITY DEFINER`, `search_path = ''`, schema-qualified object và actor từ `auth.uid()`.

### 19.5. Mutation/completion semantics

`open_lesson_section(lesson_id, section_id?)` bắt đầu hoặc resume đúng published snapshot và lưu current section. `complete_lesson_section(lesson_id, section_id)` upsert section evidence, đếm required sections, tính percent và set completion atomic. Cả hai không nhận `user_id`, khóa profile/progress phù hợp và an toàn khi gọi lặp.

### 19.6. Seed

`supabase/seed.sql` chứa stable identifiers và `NOT EXISTS` cho immutable section inserts. Seed rerun tạo 0 row mới, không tạo auth user hay progress. Seed remote chỉ chạy sau dry-run/review với `--include-seed`; không reset/xóa dữ liệu remote.

## 19. Retention và deletion

- Audio có `retention_until`; cleanup job xóa object rồi tombstone metadata.
- User delete/export workflow xác định rõ dữ liệu phải xóa, anonymize hoặc giữ vì audit/legal.
- AI raw response và application logs có TTL ngắn hơn validated feedback khi có thể.
- Analytics event hết retention được aggregate/anonymize trước khi xóa.

Các thời hạn cụ thể đang là quyết định mở trong [KNOWN_ISSUES.md](./KNOWN_ISSUES.md).

## 20. Phase 5 exercise, vocabulary và grammar schema (implemented)

Schema migration nguồn sự thật: `20260716143000_phase_5_exercise_vocabulary_grammar.sql`. Foundation content deterministic được deploy bằng data migration mới `20260716153000_phase_5_foundation_content.sql`; migration cũ không bị sửa. Các model target cũ ở mục 6–8 không đồng nghĩa đã implementation; phần này mô tả schema thật của Phase 5.

### 20.1. Exercise content

| Table | Vai trò và integrity chính |
| --- | --- |
| `exercise_sets` | Stable slug, domain `vocabulary`/`grammar`, display order và timestamps. |
| `exercise_set_versions` | Version, title/instructions, difficulty, lifecycle, review-policy và publication timestamps; mỗi set chỉ có một published version. |
| `exercise_questions` | Thuộc version; ordered; type `single_choice`, `multiple_choice`, `true_false`, `short_text`; points và prompt. |
| `exercise_options` | Ordered option thuộc question; composite FK chặn option/question mismatch. |
| `private.exercise_answer_keys` | Cấu hình scoring theo question, không cấp Data API SELECT cho learner. |
| `private.exercise_correct_options` | Correct option set cho choice/true-false. |
| `private.exercise_correct_text_answers` | Exact accepted text cho short-text, normalize trim/collapse whitespace/case. |

Published version, question, option và key là immutable. Publish validation bắt buộc có câu hỏi, option/key hợp lệ và canonical ordering.

### 20.2. Attempts và answers

| Table | Vai trò và integrity chính |
| --- | --- |
| `learner_attempts` | Owner từ `auth.uid()`, pinned version, idempotency key, `in_progress`/`submitted`, server-derived score và timestamps. |
| `learner_answers` | Mỗi attempt/question một row, text answer hoặc choice mode phù hợp type, revision cho optimistic concurrency; bất biến sau submit. |
| `learner_answer_options` | Join answer/option với composite constraints để option phải thuộc đúng question. |

Attempt/answer chỉ owner SELECT qua RLS, không direct write. RPC lock và validate owner, version, question, option, revision; submitted attempt không thể sửa. Multiple-choice chấm all-or-nothing; short-text exact-match sau normalization; score từ published snapshot thật.

### 20.3. Vocabulary và grammar

- `vocabulary_entries` + `vocabulary_entry_versions`: stable slug; term, part of speech, Vietnamese definition, original example, topic/tags, difficulty, lifecycle/version.
- `grammar_topics` + `grammar_topic_versions`: stable slug; title, explanation Markdown, examples JSON, common mistakes JSON, related exercise set, difficulty, lifecycle/version.
- Learner đã hoàn thành onboarding chỉ SELECT published version; draft/in-review/archived không lộ qua catalog. Phase 5 coi Vocabulary/Grammar foundation là nội dung dùng chung cho hai test type.
- Phase 5 không tạo SRS, error notebook, admin CMS, AI scoring hoặc Reading/Listening engine.

### 20.4. Applied history and content parity

- Local/remote migration history đồng bộ 5/5 và có `20260716153000_phase_5_foundation_content.sql`.
- Local/remote content fingerprint cùng là `c3c7af314caa350a74994e28378a550f`.
- Seed rerun cuối ghi zero rows và không đổi fingerprint; remote không bị reset hoặc xóa dữ liệu.
- Database-owner verifier chạy đủ 24/24 assertions, failed 0, PASS.

## 21. Phase 6 Reading schema

| Table/column | Integrity purpose |
| --- | --- |
| `reading_passages` | Stable slug, `academic`/`general_training`/`both`, display order. |
| `reading_passage_versions` | Versioned metadata/source/licence/status; one published version; published rows immutable. |
| `reading_passage_sections` | Ordered Markdown-only sections pinned to one passage version. |
| `reading_practice_versions` | One-to-one exercise-version/passage-version mapping and `time_limit_seconds`. |
| `reading_question_groups` | Ordered groups, implemented type, optional section link and summary word limit. |
| `exercise_questions.reading_question_group_id` | Reuses shared questions while enforcing group/version membership. |
| `learner_attempts.reading_time_limit_seconds`, `expires_at` | Server-derived timer snapshot. |

Implemented types are `multiple_choice`, `true_false_not_given`, `matching_headings` and `summary_completion`. Publication validation requires the published passage snapshot, valid groups/questions/options/private keys and contiguous ordering. Reading tables use RLS; learners get read-only compatible published content. Attempt tables remain owner-only and RPC-mutated. Migrations `20260716180000` and `20260716181500` are synchronized local/remote at 7/7.
# Phase 7 Listening extension (2026-07-17)

Phase 7 adds `listening_audio_assets`, `listening_practice_versions` and `listening_parts` in `public`, plus `private.listening_transcripts`. `exercise_questions.listening_part_id` pins each supported question to one part. `learner_attempts.time_limit_seconds` is the generic database-owned timer snapshot; the Phase 6 `reading_time_limit_seconds` column remains for backward compatibility and is populated only for Reading attempts.

The published snapshot is immutable. Publication requires controlled WAV metadata with checksum/provenance, a private transcript, contiguous parts within the declared duration, answer keys and only `single_choice`, `multiple_choice` or `short_text` questions. Learners receive SELECT-only metadata through test-type-aware RLS; transcripts and answer keys have no learner table grants.

Listening reuses `start_exercise_attempt`, `save_exercise_answer` and `submit_exercise_attempt`. Dedicated `get_listening_attempt_clock` returns owner-scoped database timestamps, while `get_listening_attempt_result` releases transcript and answer review only after the owner attempt is scored.

# Phase 8 Writing extension (2026-07-17)

| Table | Purpose and integrity |
| --- | --- |
| `writing_tasks` | Stable slug/order identity. RLS exposes a current accessible task or a task pinned to the owner's history. |
| `writing_task_versions` | Immutable versioned task prompt, instructions, provenance, test type, word/time limits and lifecycle; one published version per task. |
| `writing_submissions` | Owner-scoped PostgreSQL draft and immutable submitted snapshot with server revision, word count, deadline, checksum and timestamps. |
| `writing_feedback_runs` | Optional AI request lifecycle, consent/version metadata, quota attempt, lease, usage and allowlisted failure code. |
| `writing_feedback` | Immutable validated feedback only; band estimates, criteria/evidence, priorities, revision plan and corrected examples. No raw provider response. |

All five public tables have RLS enabled. Authenticated learners receive SELECT-only table grants. Mutation RPCs derive the actor from `auth.uid()`, use `SECURITY DEFINER` with empty `search_path`, validate ownership and never accept client owner/status/score/band/timestamp authority.

`start_writing_submission` selects a compatible published version and creates/resumes one active draft. `save_writing_draft` locks the row, enforces expected revision and calculates word count in PostgreSQL. `submit_writing_submission` locks and atomically snapshots the essay, checksum, submitted time and late state; replay is idempotent and later mutation is blocked.

AI feedback begins only for a submitted owner essay with `writing-ai-v1` consent. Quota is 5 requests per rolling 7 days, 2 per minute, and 2 attempts per submission. `finalize_writing_feedback` accepts only an HMAC-signed server payload backed by Vault secret `writing_feedback_signing_secret`; it validates structured fields, half-band ranges and exact essay substrings before storing feedback atomically. `fail_writing_feedback_run` stores only an allowlisted error code. Provider/Vault absence is a supported fail-closed state.

Phase 8 schema history is `20260717130000`, `20260717131500` and `20260717132000`; local and remote parity is 12/12. Seed contains one original published Academic Task 2 and one draft-only visibility fixture.

# Phase 9 Speaking extension (2026-07-17)

| Table | Purpose and integrity |
| --- | --- |
| `speaking_sets`, `speaking_set_versions`, `speaking_prompts` | Stable identity plus versioned, ordered, provenance-tagged content. RLS exposes compatible published content or an owner-pinned snapshot; draft content stays hidden. |
| `speaking_attempts`, `speaking_responses` | Owner-scoped attempt and prompt responses. Start/submit are idempotent; submitted rows and database timestamps are immutable. |
| `speaking_upload_intents`, `speaking_audio_assets` | Short-lived exact private path followed by immutable server-verified bucket/path, MIME, bytes, duration and checksum. |
| `speaking_transcript_runs`, `speaking_transcripts` | Optional consented provider lifecycle and immutable non-empty provider transcript. Failure leaves transcript absent. |
| `speaking_feedback_runs`, `speaking_feedback` | Optional consent/version/model lifecycle and immutable HMAC-finalized practice guidance with nullable estimates and a non-official disclaimer. |

`speaking-recordings` is private with a 15 MB limit and MIME allowlist. Authenticated users have SELECT-only grants on all Phase 9 public tables; mutation uses `SECURITY DEFINER` RPCs with empty `search_path`. Phase 9 migrations are `20260717160000`, `20260717160500` and `20260717161000`; seed has one original published 4-prompt set and one draft fixture.

Final Phase 9 database evidence: local/remote migration parity 15/15; local and remote lint report no schema errors; direct remote database-owner verifier ran as `current_user postgres` through `ok 24` with failed 0, no `not ok` and no `ERROR`, and rolled back its fixture transaction. `KI-081` is closed.

# Phase 10A Mock Test extension (2026-07-17)

| Table | Purpose and integrity |
| --- | --- |
| `mock_tests` | Stable slug and display order for a mock-test identity. |
| `mock_test_versions` | Versioned title/description/test type/difficulty/status/estimate/publication snapshot. Publication validates the full section graph. |
| `mock_test_sections` | Ordered Reading/Listening/Writing/Speaking links to exactly one existing content-version type with a database time limit. |
| `mock_test_sessions` | Owner-scoped version-pinned lifecycle, current section, idempotency keys and database timestamps. |
| `mock_test_section_attempts` | Owner/session/version/section link to exactly one reused learner attempt, Writing submission or Speaking attempt; submitted state is RPC-owned. |
| `mock_test_results` | Immutable raw Reading/Listening score/max plus Writing/Speaking owner references. No aggregate or band columns exist. |

All six tables have RLS enabled. `anon` has no table or RPC access. `authenticated` has SELECT-only table grants; mutation occurs through hardened `SECURITY DEFINER` RPCs deriving `auth.uid()` with an empty `search_path`. Catalog policies expose compatible published versions only, while owner-pinned history remains visible through session/result owner policies.

The two forward-only migrations are `20260717190000_phase_10a_mock_test_engine.sql` and `20260717191500_phase_10a_mock_test_foundation_content.sql`. The seed contains one original Academic published mock and one draft fixture; both link the existing original Phase 6–9 content versions. Local and remote migration parity is 17/17 and both lints are clean. Direct remote identity confirmed `current_user postgres`; the rollback-only owner verifier passed 20/20 with failed 0 and `KI-082` is closed.

# Phase 10B learner analytics extension (2026-07-18)

Phase 10B adds no analytics table, event warehouse, materialized view or synthetic seed. Migration `20260718090000_phase_10b_learner_analytics.sql` adds four bounded, read-only, `SECURITY INVOKER` functions and a partial `(user_id, submitted_at desc) where status = 'scored'` index.

| Function | Persisted source |
| --- | --- |
| `get_learner_progress_overview` | Published lesson catalog plus owner lesson/practice/Writing/Speaking/Mock state |
| `get_learner_skill_progress` | Objective scored attempts and submitted Writing/Speaking feedback-run status |
| `get_learner_recent_activity` | Bounded union of owner lesson, standalone practice, Writing, Speaking and Mock activity |
| `get_learner_mock_test_history` | Owner sessions plus optional persisted raw Reading/Listening result |

No function accepts `user_id`; actor identity comes from `auth.uid()` and existing RLS remains authoritative. Outputs contain no answer key, essay, audio path, transcript, raw feedback or calculated IELTS band. Writing/Speaking rows intentionally have null objective accuracy.

Final Phase 10B evidence: local/remote migration parity 18/18; both database lints report no schema errors; full local pgTAP passes 708/708; direct remote verifier ran as `current_user postgres`, passed 17/17 and rolled back all fixtures.
