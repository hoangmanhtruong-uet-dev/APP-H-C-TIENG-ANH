import type { Metadata } from "next";

import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { getAccountLabel } from "@/server/auth/account";
import { requirePendingOnboarding } from "@/server/onboarding/learner-profile";

export const metadata: Metadata = {
  title: "Thiết lập lộ trình",
  description: "Thiết lập mục tiêu và lịch tự học IELTS của bạn.",
};

export default async function OnboardingPage() {
  const { account, learnerProfile } = await requirePendingOnboarding();

  return (
    <OnboardingWizard
      learnerProfile={learnerProfile}
      displayName={getAccountLabel(account)}
    />
  );
}
