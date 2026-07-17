import type { NextConfig } from "next";

const publicSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publicSupabaseOrigin = (() => {
  if (!publicSupabaseUrl) return null;

  try {
    return new URL(publicSupabaseUrl).origin;
  } catch {
    return null;
  }
})();
const publicSupabaseWebSocketOrigin = (() => {
  if (!publicSupabaseOrigin) return null;
  return publicSupabaseOrigin.replace(/^http/, "ws");
})();
const isHttpsDeployment =
  process.env.NEXT_PUBLIC_SITE_URL?.startsWith("https://") ?? false;

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `media-src 'self' blob: https://*.supabase.co${publicSupabaseOrigin ? ` ${publicSupabaseOrigin}` : ""}`,
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co${publicSupabaseOrigin ? ` ${publicSupabaseOrigin}` : ""}${publicSupabaseWebSocketOrigin ? ` ${publicSupabaseWebSocketOrigin}` : ""}`,
  ...(isHttpsDeployment ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), geolocation=(), microphone=(self)",
  },
  ...(process.env.NODE_ENV === "production"
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    return ["reading", "listening", "writing", "speaking"].map((skill) => ({
      source: `/${skill}`,
      destination: `/practice/${skill}`,
      permanent: true,
    }));
  },
};

export default nextConfig;
