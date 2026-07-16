insert into public.learning_modules (
  id,
  slug,
  title,
  description,
  skill,
  test_type,
  difficulty,
  display_order,
  status,
  estimated_minutes,
  published_at
) values
  (
    '10000000-0000-4000-8000-000000000001',
    'ielts-foundations',
    'Nền tảng IELTS',
    'Những khái niệm cốt lõi giúp bạn hiểu bài thi và xây dựng cách học có mục đích.',
    'foundations',
    'both',
    'beginner',
    1,
    'published',
    30,
    '2026-07-16T00:00:00Z'
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    'reading-foundations',
    'Nền tảng Reading',
    'Rèn cách đọc có mục tiêu trước khi bước vào các dạng câu hỏi IELTS Academic.',
    'reading',
    'academic',
    'beginner',
    2,
    'published',
    40,
    '2026-07-16T00:00:00Z'
  )
on conflict (id) do nothing;

insert into public.lessons (
  id,
  module_id,
  slug,
  display_order
) values
  (
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'hieu-cau-truc-bai-thi',
    1
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    'hieu-band-score',
    2
  ),
  (
    '20000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000002',
    'doc-co-muc-dich',
    1
  ),
  (
    '20000000-0000-4000-8000-000000000004',
    '10000000-0000-4000-8000-000000000002',
    'skimming-va-scanning',
    2
  ),
  (
    '20000000-0000-4000-8000-000000000005',
    '10000000-0000-4000-8000-000000000002',
    'ghi-chu-khi-doc',
    3
  )
on conflict (id) do nothing;

insert into public.lesson_versions (
  id,
  lesson_id,
  version,
  title,
  summary,
  difficulty,
  estimated_minutes,
  status
) values
  (
    '30000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    1,
    'Hiểu cấu trúc bài thi IELTS',
    'Phân biệt bốn kỹ năng, cách tổ chức bài thi và vai trò của từng phần trong kế hoạch học.',
    'beginner',
    15,
    'draft'
  ),
  (
    '30000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000002',
    1,
    'Hiểu Band Score',
    'Đọc band score như một tập hợp bằng chứng kỹ năng, không phải nhãn đánh giá năng lực cố định.',
    'beginner',
    15,
    'draft'
  ),
  (
    '30000000-0000-4000-8000-000000000003',
    '20000000-0000-4000-8000-000000000003',
    1,
    'Đọc có mục đích',
    'Xác định thông tin cần tìm trước khi đọc để giảm việc quay lại đoạn văn không cần thiết.',
    'beginner',
    18,
    'draft'
  ),
  (
    '30000000-0000-4000-8000-000000000004',
    '20000000-0000-4000-8000-000000000004',
    1,
    'Skimming và Scanning',
    'Phân biệt hai thao tác đọc nhanh và chọn đúng thao tác theo mục tiêu thông tin.',
    'beginner',
    22,
    'draft'
  ),
  (
    '30000000-0000-4000-8000-000000000005',
    '20000000-0000-4000-8000-000000000005',
    1,
    'Ghi chú khi đọc',
    'Bản nháp nội bộ dùng để kiểm chứng rằng learner không nhìn thấy lesson chưa publish.',
    'beginner',
    12,
    'draft'
  )
on conflict (id) do nothing;

insert into public.lesson_sections (
  id,
  lesson_version_id,
  section_type,
  title,
  body_markdown,
  display_order,
  is_required
) select
  seed.id::uuid,
  seed.lesson_version_id::uuid,
  seed.section_type,
  seed.title,
  seed.body_markdown,
  seed.display_order,
  seed.is_required
from (values
  (
    '40000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001',
    'text',
    'Bốn kỹ năng, bốn loại bằng chứng',
    'IELTS đánh giá **Listening, Reading, Writing và Speaking**. Mỗi kỹ năng tạo ra một loại bằng chứng khác nhau: câu trả lời, bài viết hoặc phần trình bày nói. Vì vậy, một kế hoạch học tốt phải chỉ rõ bạn đang rèn kỹ năng nào và bằng chứng hoàn thành là gì.',
    1,
    true
  ),
  (
    '40000000-0000-4000-8000-000000000002',
    '30000000-0000-4000-8000-000000000001',
    'checklist',
    'Kiểm tra trước khi học',
    '- Xác định Academic hay General Training.\n- Ghi lại band mục tiêu và ngày thi nếu đã có.\n- Chọn tối đa hai kỹ năng cần ưu tiên trong tuần.\n- Dành thời gian riêng cho luyện tập và xem lại lỗi.',
    2,
    true
  ),
  (
    '40000000-0000-4000-8000-000000000003',
    '30000000-0000-4000-8000-000000000001',
    'summary',
    'Điều cần nhớ',
    'Cấu trúc bài thi giúp bạn chia nhỏ mục tiêu. Nó không thay thế việc luyện tập có thời gian, nộp câu trả lời và xem lại lỗi.',
    3,
    true
  ),
  (
    '40000000-0000-4000-8000-000000000004',
    '30000000-0000-4000-8000-000000000002',
    'text',
    'Band score mô tả điều gì?',
    'Band score tóm tắt mức độ đáp ứng tiêu chí tại một thời điểm. Điểm tổng không cho biết chính xác bạn cần sửa câu nào, nên hãy kết hợp nó với bằng chứng cụ thể như dạng lỗi, độ chính xác và chất lượng bài sửa.',
    1,
    true
  ),
  (
    '40000000-0000-4000-8000-000000000005',
    '30000000-0000-4000-8000-000000000002',
    'example',
    'Một cách đọc kết quả hữu ích',
    'Thay vì ghi “Reading 6.0”, hãy ghi rõ hơn: **mất nhiều thời gian ở câu matching headings và thường chọn đáp án trước khi đọc hết ý chính của đoạn**. Mô tả này dẫn tới hành động học cụ thể.',
    2,
    true
  ),
  (
    '40000000-0000-4000-8000-000000000006',
    '30000000-0000-4000-8000-000000000002',
    'tip',
    'Theo dõi bằng chứng nhỏ',
    'Sau mỗi buổi, lưu một điều đã làm tốt và một lỗi cần xem lại. Chuỗi bằng chứng nhỏ đáng tin cậy hơn cảm giác “hôm nay học khá ổn”.',
    3,
    false
  ),
  (
    '40000000-0000-4000-8000-000000000007',
    '30000000-0000-4000-8000-000000000003',
    'text',
    'Câu hỏi quyết định cách đọc',
    'Trước khi đọc, hãy xác định bạn cần **ý chính, vị trí thông tin hay một chi tiết chính xác**. Mục tiêu này quyết định tốc độ và vùng văn bản cần chú ý.',
    1,
    true
  ),
  (
    '40000000-0000-4000-8000-000000000008',
    '30000000-0000-4000-8000-000000000003',
    'example',
    'Ví dụ ngắn',
    'Nếu câu hỏi hỏi nguyên nhân một dự án bị trì hoãn, bạn cần tìm quan hệ nguyên nhân và kết quả. Bạn không cần ghi nhớ mọi con số xuất hiện trong đoạn.',
    2,
    true
  ),
  (
    '40000000-0000-4000-8000-000000000009',
    '30000000-0000-4000-8000-000000000003',
    'checklist',
    'Quy trình ba bước',
    '1. Đọc yêu cầu và gạch chân từ khóa chức năng.\n2. Dự đoán loại thông tin cần tìm.\n3. Chỉ đọc kỹ vùng văn bản có khả năng chứa bằng chứng.',
    3,
    true
  ),
  (
    '40000000-0000-4000-8000-000000000010',
    '30000000-0000-4000-8000-000000000004',
    'text',
    'Skimming để nắm cấu trúc',
    'Skimming là đọc nhanh để nhận ra chủ đề, hướng phát triển và chức năng của từng đoạn. Hãy chú ý tiêu đề, câu đầu, câu cuối và những từ nối báo hiệu chuyển ý.',
    1,
    true
  ),
  (
    '40000000-0000-4000-8000-000000000011',
    '30000000-0000-4000-8000-000000000004',
    'text',
    'Scanning để định vị chi tiết',
    'Scanning là di chuyển mắt có chọn lọc để tìm tên riêng, mốc thời gian, thuật ngữ hoặc cách diễn đạt tương đương với câu hỏi. Sau khi định vị, hãy đọc kỹ câu xung quanh để xác nhận.',
    2,
    true
  ),
  (
    '40000000-0000-4000-8000-000000000012',
    '30000000-0000-4000-8000-000000000004',
    'warning',
    'Không dùng một kỹ thuật cho mọi câu',
    'Đọc nhanh chỉ giúp định vị. Đáp án vẫn cần bằng chứng trong ngữ cảnh. Nếu một từ khóa trùng khớp nhưng quan hệ ý nghĩa khác, đó chưa phải bằng chứng đủ.',
    3,
    true
  ),
  (
    '40000000-0000-4000-8000-000000000013',
    '30000000-0000-4000-8000-000000000005',
    'text',
    'Bản nháp chưa xuất bản',
    'Section này chỉ dùng để kiểm chứng publication isolation và không được xuất hiện với learner.',
    1,
    true
  )
) as seed (
  id,
  lesson_version_id,
  section_type,
  title,
  body_markdown,
  display_order,
  is_required
)
where not exists (
  select 1
  from public.lesson_sections as existing_section
  where existing_section.id = seed.id::uuid
);

update public.lesson_versions
set
  status = 'published',
  published_at = '2026-07-16T00:00:00Z'
where id in (
  '30000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000002',
  '30000000-0000-4000-8000-000000000003',
  '30000000-0000-4000-8000-000000000004'
)
and status = 'draft';
