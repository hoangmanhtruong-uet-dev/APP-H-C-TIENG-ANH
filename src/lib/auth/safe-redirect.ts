import { isProtectedRoute } from "@/lib/auth/routes";

const FALLBACK_PATH = "/dashboard";
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;

export function getSafeRedirectPath(
  value: string | null | undefined,
  fallback = FALLBACK_PATH,
) {
  if (!value) return fallback;

  const candidate = value.trim();
  if (
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.includes("\\") ||
    CONTROL_CHARACTER_PATTERN.test(candidate)
  ) {
    return fallback;
  }

  try {
    const decoded = decodeURIComponent(candidate);
    if (
      decoded.startsWith("//") ||
      decoded.includes("\\") ||
      CONTROL_CHARACTER_PATTERN.test(decoded)
    ) {
      return fallback;
    }

    const parsed = new URL(candidate, "https://ielts-flow.local");
    if (parsed.origin !== "https://ielts-flow.local") return fallback;
    if (!isProtectedRoute(parsed.pathname)) return fallback;

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
