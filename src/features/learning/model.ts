export type OrderedSection = {
  id: string;
  displayOrder: number;
  isRequired: boolean;
  completed: boolean;
};

export type OrderedLesson = {
  id: string;
  moduleOrder: number;
  lessonOrder: number;
  status: "not_started" | "in_progress" | "completed";
  lastAccessedAt: string | null;
};

export function calculateRequiredProgress(sections: OrderedSection[]) {
  const required = sections.filter((section) => section.isRequired);
  if (required.length === 0) return 0;

  const completed = required.filter((section) => section.completed).length;
  return completed === required.length
    ? 100
    : Math.round((completed / required.length) * 10_000) / 100;
}

export function areRequiredSectionsComplete(sections: OrderedSection[]) {
  const required = sections.filter((section) => section.isRequired);
  return required.length > 0 && required.every((section) => section.completed);
}

export function selectResumeSection(
  sections: OrderedSection[],
  currentSectionId: string | null,
) {
  const ordered = [...sections].sort(
    (left, right) => left.displayOrder - right.displayOrder,
  );

  return (
    ordered.find((section) => section.id === currentSectionId) ??
    ordered.find((section) => !section.completed) ??
    ordered[0] ??
    null
  );
}

export function selectNextLesson(lessons: OrderedLesson[]) {
  const inProgress = lessons
    .filter((lesson) => lesson.status === "in_progress")
    .sort((left, right) => {
      const dateDifference =
        new Date(right.lastAccessedAt ?? 0).getTime() -
        new Date(left.lastAccessedAt ?? 0).getTime();
      if (dateDifference !== 0) return dateDifference;
      return compareLessonOrder(left, right);
    });

  if (inProgress[0]) return inProgress[0];

  return (
    [...lessons]
      .filter((lesson) => lesson.status === "not_started")
      .sort(compareLessonOrder)[0] ?? null
  );
}

function compareLessonOrder(left: OrderedLesson, right: OrderedLesson) {
  return (
    left.moduleOrder - right.moduleOrder || left.lessonOrder - right.lessonOrder
  );
}

export function isSafeContentHref(href: string | undefined) {
  if (!href) return false;
  if (href.startsWith("/") || href.startsWith("#")) return true;

  try {
    const url = new URL(href);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}
