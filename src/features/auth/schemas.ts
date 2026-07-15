import { z } from "zod";

const normalizedEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "Email không được dài quá 254 ký tự.")
  .pipe(z.email("Hãy nhập một địa chỉ email hợp lệ."));

const passwordSchema = z
  .string()
  .min(8, "Mật khẩu phải có ít nhất 8 ký tự.")
  .max(72, "Mật khẩu không được dài quá 72 ký tự.");

export const registerSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(1, "Hãy nhập họ và tên.")
      .max(100, "Họ và tên không được dài quá 100 ký tự."),
    email: normalizedEmailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .superRefine((value, context) => {
    if (value.password !== value.confirmPassword) {
      context.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Mật khẩu xác nhận chưa khớp.",
      });
    }
  });

export const loginSchema = z.object({
  email: normalizedEmailSchema,
  password: z
    .string()
    .min(1, "Hãy nhập mật khẩu.")
    .max(72, "Mật khẩu không được dài quá 72 ký tự."),
  next: z.string().optional(),
});

export const profileUpdateSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Hãy nhập họ và tên.")
    .max(100, "Họ và tên không được dài quá 100 ký tự."),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
