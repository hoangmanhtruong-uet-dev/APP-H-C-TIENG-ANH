export const protectedRoutePrefixes = [
  "/dashboard",
  "/learn",
  "/roadmap",
  "/progress",
  "/profile",
  "/settings",
] as const;

export const guestOnlyRoutes = ["/login", "/register"] as const;

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isProtectedRoute(pathname: string) {
  return protectedRoutePrefixes.some((prefix) =>
    matchesPrefix(pathname, prefix),
  );
}

export function isGuestOnlyRoute(pathname: string) {
  return guestOnlyRoutes.some((route) => pathname === route);
}
