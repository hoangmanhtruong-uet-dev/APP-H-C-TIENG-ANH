import { cache } from "react";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireCurrentAccount } from "@/server/auth/account";
import type { Database } from "@/types/database";

export type LearnerProfile =
  Database["public"]["Tables"]["learner_profiles"]["Row"];

export class LearnerProfileReadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LearnerProfileReadError";
  }
}

export const getCurrentLearnerProfile = cache(
  async (): Promise<LearnerProfile | null> => {
    const account = await requireCurrentAccount();
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("learner_profiles")
      .select(
        "user_id, test_type, current_band, target_band, target_exam_date, daily_study_minutes, study_days_per_week, priority_skills, primary_goal, onboarding_step, onboarding_completed_at, created_at, updated_at",
      )
      .eq("user_id", account.user.id)
      .maybeSingle();

    if (error) {
      throw new LearnerProfileReadError(
        "Không thể đọc thông tin cá nhân hóa học tập.",
      );
    }

    return data;
  },
);

export async function requirePendingOnboarding() {
  const [account, learnerProfile] = await Promise.all([
    requireCurrentAccount(),
    getCurrentLearnerProfile(),
  ]);

  if (learnerProfile?.onboarding_completed_at) redirect("/dashboard");
  return { account, learnerProfile };
}

export async function requireCompletedOnboarding() {
  const [account, learnerProfile] = await Promise.all([
    requireCurrentAccount(),
    getCurrentLearnerProfile(),
  ]);

  if (!learnerProfile?.onboarding_completed_at) redirect("/onboarding");
  return { account, learnerProfile };
}
