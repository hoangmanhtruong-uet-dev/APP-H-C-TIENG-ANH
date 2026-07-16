select jsonb_pretty(jsonb_build_object(
  'metrics', jsonb_build_object(
    'content_fingerprint', (
      select md5(coalesce(string_agg(snapshot.row_hash, '|' order by snapshot.row_key), ''))
      from (
        select 'exercise_sets:' || rows.id as row_key,
          md5((to_jsonb(rows) - 'created_at' - 'updated_at')::text) as row_hash
        from public.exercise_sets as rows
        union all
        select 'exercise_set_versions:' || rows.id,
          md5((to_jsonb(rows) - 'created_at' - 'updated_at')::text)
        from public.exercise_set_versions as rows
        union all
        select 'exercise_questions:' || rows.id,
          md5((to_jsonb(rows) - 'created_at' - 'updated_at')::text)
        from public.exercise_questions as rows
        union all
        select 'exercise_options:' || rows.id,
          md5((to_jsonb(rows) - 'created_at' - 'updated_at')::text)
        from public.exercise_options as rows
        union all
        select 'exercise_answer_keys:' || rows.question_id,
          md5((to_jsonb(rows) - 'created_at' - 'updated_at')::text)
        from private.exercise_answer_keys as rows
        union all
        select 'exercise_correct_options:' || rows.question_id || ':' || rows.option_id,
          md5((to_jsonb(rows) - 'created_at')::text)
        from private.exercise_correct_options as rows
        union all
        select 'exercise_correct_text_answers:' || rows.question_id || ':' || rows.normalized_answer,
          md5((to_jsonb(rows) - 'created_at')::text)
        from private.exercise_correct_text_answers as rows
        union all
        select 'vocabulary_entries:' || rows.id,
          md5((to_jsonb(rows) - 'created_at' - 'updated_at')::text)
        from public.vocabulary_entries as rows
        union all
        select 'vocabulary_entry_versions:' || rows.id,
          md5((to_jsonb(rows) - 'created_at' - 'updated_at')::text)
        from public.vocabulary_entry_versions as rows
        union all
        select 'grammar_topics:' || rows.id,
          md5((to_jsonb(rows) - 'created_at' - 'updated_at')::text)
        from public.grammar_topics as rows
        union all
        select 'grammar_topic_versions:' || rows.id,
          md5((to_jsonb(rows) - 'created_at' - 'updated_at')::text)
        from public.grammar_topic_versions as rows
      ) as snapshot
    ),
    'exercise_sets', (select count(*) from public.exercise_sets),
    'exercise_versions_published', (
      select count(*) from public.exercise_set_versions where status = 'published'
    ),
    'exercise_versions_draft', (
      select count(*) from public.exercise_set_versions where status = 'draft'
    ),
    'exercise_questions', (select count(*) from public.exercise_questions),
    'exercise_options', (select count(*) from public.exercise_options),
    'vocabulary_entries', (select count(*) from public.vocabulary_entries),
    'vocabulary_versions_published', (
      select count(*) from public.vocabulary_entry_versions where status = 'published'
    ),
    'grammar_topics', (select count(*) from public.grammar_topics),
    'grammar_versions_published', (
      select count(*) from public.grammar_topic_versions where status = 'published'
    )
  ),
  'exercise_content', (
    select coalesce(jsonb_agg(to_jsonb(content) order by content.slug, content.version), '[]'::jsonb)
    from (
      select
        sets.id as exercise_set_id,
        sets.slug,
        sets.domain,
        versions.id as exercise_set_version_id,
        versions.version,
        versions.status,
        versions.published_at,
        count(questions.id) as question_count
      from public.exercise_sets as sets
      left join public.exercise_set_versions as versions
        on versions.exercise_set_id = sets.id
      left join public.exercise_questions as questions
        on questions.exercise_set_version_id = versions.id
      where sets.slug in (
        'academic-vocabulary-foundations',
        'grammar-accuracy-foundations',
        'draft-content-review'
      )
      group by
        sets.id,
        sets.slug,
        sets.domain,
        versions.id,
        versions.version,
        versions.status,
        versions.published_at
    ) as content
  ),
  'vocabulary_content', (
    select coalesce(jsonb_agg(to_jsonb(content) order by content.slug, content.version), '[]'::jsonb)
    from (
      select
        entries.id,
        entries.slug,
        versions.id as version_id,
        versions.version,
        versions.status,
        versions.published_at
      from public.vocabulary_entries as entries
      left join public.vocabulary_entry_versions as versions
        on versions.vocabulary_entry_id = entries.id
      where entries.slug in ('sustainable', 'mitigate', 'prevalent', 'allocate')
    ) as content
  ),
  'grammar_content', (
    select coalesce(jsonb_agg(to_jsonb(content) order by content.slug, content.version), '[]'::jsonb)
    from (
      select
        topics.id,
        topics.slug,
        versions.id as version_id,
        versions.version,
        versions.status,
        versions.published_at
      from public.grammar_topics as topics
      left join public.grammar_topic_versions as versions
        on versions.grammar_topic_id = topics.id
      where topics.slug in (
        'subject-verb-agreement',
        'articles-in-academic-writing',
        'controlled-complex-sentences'
      )
    ) as content
  )
));
