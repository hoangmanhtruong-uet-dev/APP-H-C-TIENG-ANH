# Content Operations

Tài liệu này là quy trình tối thiểu để thêm, review, publish và archive nội dung IELTS Flow. Đây không phải đặc tả admin CMS.

## Nguyên tắc bắt buộc

- Chỉ dùng nội dung tự biên soạn, thuộc public domain hoặc có giấy phép sử dụng rõ ràng.
- Không sao chép đề IELTS, sách, audio hoặc transcript có bản quyền khi chưa có quyền.
- Mọi thay đổi schema/data đã deploy phải đi bằng migration forward-only mới. Không sửa migration đã apply và không reset remote.
- Identity (`slug`, stable ID, display order) tách khỏi immutable version. Lịch sử learner luôn pin đúng version đã dùng.
- Draft/in-review không được learner nhìn thấy. Chỉ version `published` tương thích test type được mở mới.
- Answer key ở schema `private`; audio cá nhân, transcript, essay và feedback chỉ owner được đọc qua RLS.
- Không dùng service-role key trong browser và không disable RLS để vận hành content.

## Lifecycle matrix

| Domain | Draft | Review | Published | Archived |
| --- | --- | --- | --- | --- |
| Module, lesson, exercise, Reading, Listening | `draft` | `in_review` | `published` | `archived` |
| Writing, Speaking, Mock Test | `draft` | Review ngoài DB theo checklist này | `published` | `archived` |

Schema hiện tại không thêm `in_review` vào Writing/Speaking/Mock Test trong Phase 10B. Review của các domain đó phải được ghi nhận trước khi migration đổi status sang `published`.

## Checklist trước publish

1. Identity/slug ổn định, version tăng và không ghi đè published snapshot cũ.
2. Title, instructions, difficulty, test type, duration và display order đã review.
3. Source/licence/checksum đầy đủ tại các bảng có metadata tương ứng.
4. Passage/audio/prompt là nguyên bản hoặc có quyền sử dụng được xác nhận.
5. Question positions liên tục, points hợp lệ, option đủ và answer key nằm trong `private`.
6. Reading/Listening asset link tồn tại; checksum và MIME/duration khớp file ship.
7. Mock Test published có đúng bốn section Reading, Listening, Writing, Speaking và mỗi section pin đúng một version.
8. Chạy pgTAP content operations và actor A/B/anon trước khi apply remote.

## Quy trình thay đổi

1. Tạo version draft bằng migration mới hoặc seed authoring đã được review; không thay đổi row published bất biến.
2. Chạy local migration và `npx.cmd supabase test db --local`.
3. Review nội dung, provenance và visibility bằng learner JWT; không dùng owner/service role để mô phỏng UI.
4. Publish bằng migration forward-only sau khi checklist đạt. Unique partial indexes bảo đảm tối đa một published version trên mỗi identity.
5. Generate lại `src/types/database.ts`, chạy lint, typecheck, unit, build và Playwright.
6. Chạy remote dry-run/migration list, apply migration mới, kiểm tra parity và database lint.
7. Chạy remote owner verifier trong transaction rollback-only. Không để fixture hoặc credential trong database/repo.

## Archive và sửa lỗi

- Không update nội dung của version đã published. Tạo version mới, review rồi chuyển version cũ sang `archived` trong cùng migration có kiểm soát.
- Không xóa identity/version đang được learner progress, attempt, submission hoặc mock session tham chiếu.
- Lỗi khẩn cấp về licence: ngừng mở mới bằng archive forward-only; giữ snapshot tối thiểu cần thiết cho lịch sử theo quyết định pháp lý/retention riêng.
- Không dùng `git reset`, remote database reset hoặc DELETE dữ liệu thật để sửa content deployment.

## Automated verification

`supabase/tests/database/phase_10b_content_operations.test.sql` kiểm tra:

- tối đa một published version cho lesson/exercise/Writing/Speaking/Mock Test;
- provenance/checksum của published Writing và Speaking;
- cấu trúc bốn section của published Mock Test;
- answer key không có learner grant và transcript tiếp tục owner-scoped bằng RLS.

Các bảng foundation cũ chưa có source/licence columns không được giả metadata trong Phase 10B. Bổ sung metadata cho chúng cần một phase content-model riêng, không được suy diễn từ title hoặc seed.
