drop policy "Learners can read accessible writing tasks" on public.writing_tasks;

create policy "Learners can read accessible or pinned writing tasks"
on public.writing_tasks for select to authenticated
using (
  (select private.writing_task_is_accessible(id))
  or exists (
    select 1
    from public.writing_submissions as submissions
    where submissions.writing_task_id = writing_tasks.id
      and submissions.user_id = (select auth.uid())
  )
);

comment on policy "Learners can read accessible or pinned writing tasks"
on public.writing_tasks is
  'Learners see current published-compatible task identities plus identities pinned to their own draft or submitted history.';
