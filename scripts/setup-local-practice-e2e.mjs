import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const mailpitUrl = process.env.LOCAL_MAILPIT_URL ?? "http://127.0.0.1:54324";

if (!supabaseUrl || !anonKey) {
  throw new Error("Local Supabase URL and anon key are required.");
}

const accounts = [
  {
    email: process.env.E2E_PRACTICE_USER_A_EMAIL,
    password: process.env.E2E_PRACTICE_USER_A_PASSWORD,
    displayName: "Phase 5 Browser A",
  },
  {
    email: process.env.E2E_PRACTICE_USER_B_EMAIL,
    password: process.env.E2E_PRACTICE_USER_B_PASSWORD,
    displayName: "Phase 5 Browser B",
  },
];

for (const account of accounts) {
  if (!account.email || !account.password) {
    throw new Error("Two local Phase 5 E2E accounts are required.");
  }
  await provisionLearner(account);
}

async function provisionLearner({ email, password, displayName }) {
  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const signIn = await supabase.auth.signInWithPassword({ email, password });
  let user = signIn.data.user;
  if (!user) {
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    if (signUpError) throw signUpError;

    const tokenHash = await waitForTokenHash(email);
    const { data: verified, error: verifyError } =
      await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: "signup",
      });
    if (verifyError || !verified.user) {
      throw verifyError ?? new Error("Email verification failed.");
    }
    user = verified.user;
  }

  const { error: profileError } = await supabase
    .from("learner_profiles")
    .upsert({
      user_id: user.id,
      test_type: "academic",
      current_band: 5,
      target_band: 7,
      daily_study_minutes: 45,
      study_days_per_week: 5,
      priority_skills: ["reading", "writing"],
      primary_goal: "study_abroad",
      onboarding_step: 8,
    });
  if (profileError) throw profileError;

  const { error: completionError } = await supabase.rpc(
    "complete_learner_onboarding",
  );
  if (completionError) throw completionError;
  await supabase.auth.signOut();
}

async function waitForTokenHash(email) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 20_000) {
    const listResponse = await fetch(`${mailpitUrl}/api/v1/messages`);
    if (!listResponse.ok)
      throw new Error("Mailpit message list is unavailable.");
    const list = await listResponse.json();
    const message = list.messages?.find((item) => {
      const recipients = Array.isArray(item.To) ? item.To : [item.To];
      return recipients.some((recipient) => recipient?.Address === email);
    });
    if (message) {
      const messageResponse = await fetch(
        `${mailpitUrl}/api/v1/message/${message.ID}`,
      );
      if (!messageResponse.ok)
        throw new Error("Mailpit message is unavailable.");
      const body = await messageResponse.json();
      const content = `${body.HTML ?? ""}\n${body.Text ?? ""}`.replaceAll(
        "&amp;",
        "&",
      );
      const match = content.match(/(?:token_hash|token)=([^&\s"'<>]+)/);
      if (match?.[1]) return decodeURIComponent(match[1]);
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(
    `Timed out waiting for local confirmation email for ${email}.`,
  );
}
