import { createClient } from "@supabase/supabase-js";

const apiUrl = process.env.API_URL;
const serviceRoleKey = process.env.SERVICE_ROLE_KEY;
const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const accounts = [
  [
    process.env.E2E_PRACTICE_USER_A_EMAIL,
    process.env.E2E_PRACTICE_USER_A_PASSWORD,
  ],
  [
    process.env.E2E_PRACTICE_USER_B_EMAIL,
    process.env.E2E_PRACTICE_USER_B_PASSWORD,
  ],
];

for (const value of [
  apiUrl,
  serviceRoleKey,
  publicUrl,
  anonKey,
  ...accounts.flat(),
]) {
  if (!value) throw new Error("Local Speaking E2E environment is incomplete.");
}
if (
  ![new URL(apiUrl).hostname, new URL(publicUrl).hostname].every((hostname) =>
    ["127.0.0.1", "localhost"].includes(hostname),
  )
) {
  throw new Error("This fixture script is restricted to local Supabase.");
}

const admin = createClient(apiUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const listed = await admin.auth.admin.listUsers({ perPage: 1000 });
if (listed.error) throw listed.error;

for (const [email, password] of accounts) {
  let user = listed.data.users.find((candidate) => candidate.email === email);
  if (user) {
    const updated = await admin.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
    });
    if (updated.error) throw updated.error;
    user = updated.data.user;
  } else {
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: "Phase 9 Browser Actor" },
    });
    if (created.error) throw created.error;
    user = created.data.user;
  }

  const actor = createClient(publicUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const signedIn = await actor.auth.signInWithPassword({ email, password });
  if (signedIn.error) throw signedIn.error;
  const profile = await actor.from("learner_profiles").upsert({
    user_id: user.id,
    test_type: "academic",
    current_band: 5,
    target_band: 7,
    daily_study_minutes: 45,
    study_days_per_week: 5,
    priority_skills: ["speaking"],
    primary_goal: "study_abroad",
    onboarding_step: 8,
  });
  if (profile.error) throw profile.error;
  const completed = await actor.rpc("complete_learner_onboarding");
  if (completed.error) throw completed.error;
  await actor.auth.signOut();
}
