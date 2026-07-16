import { z } from "zod";

export const learningSlugSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Đường dẫn nội dung không hợp lệ.");

export const lessonProgressMutationSchema = z.object({
  lessonId: z.uuid("Bài học không hợp lệ."),
  sectionId: z.uuid("Phần bài học không hợp lệ."),
  moduleSlug: learningSlugSchema,
  lessonSlug: learningSlugSchema,
});

export type LessonProgressMutationInput = z.infer<
  typeof lessonProgressMutationSchema
>;
