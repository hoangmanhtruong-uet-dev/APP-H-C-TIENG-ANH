import "server-only";

import { getPublicEnv, getServerEnv } from "@/lib/env";

export class DependencyReadinessError extends Error {
  constructor() {
    super("Supabase dependency is unavailable.");
    this.name = "DependencyReadinessError";
  }
}

export async function assertProductionReadiness() {
  const publicEnv = getPublicEnv();
  getServerEnv();

  try {
    const response = await fetch(
      new URL("/auth/v1/health", publicEnv.NEXT_PUBLIC_SUPABASE_URL),
      {
        cache: "no-store",
        headers: { apikey: publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY },
        signal: AbortSignal.timeout(3_000),
      },
    );
    if (!response.ok) throw new DependencyReadinessError();
  } catch (error) {
    if (error instanceof DependencyReadinessError) throw error;
    throw new DependencyReadinessError();
  }
}
