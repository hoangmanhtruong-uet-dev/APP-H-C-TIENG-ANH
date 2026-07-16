"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import {
  type OnboardingActionState,
  updateLearnerPreferencesAction,
} from "@/features/onboarding/actions";
import {
  BAND_SCORES,
  DAILY_STUDY_MINUTES,
  GOAL_LABELS,
  PRIMARY_GOALS,
  PRIORITY_SKILLS,
  SKILL_LABELS,
  TEST_TYPE_LABELS,
} from "@/features/onboarding/constants";
import type { LearnerProfile } from "@/server/onboarding/learner-profile";

const initialState: OnboardingActionState = { status: "idle" };
const inputClass =
  "mt-2 h-11 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm focus-visible:border-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Đang lưu…" : "Lưu mục tiêu học"}
    </Button>
  );
}

function ErrorText({ id, error }: { id: string; error?: string }) {
  return error ? (
    <p id={id} className="mt-2 text-sm text-[var(--destructive)]">
      {error}
    </p>
  ) : null;
}

export function LearningPreferencesForm({
  profile,
}: {
  profile: LearnerProfile;
}) {
  const [state, action] = useActionState(
    updateLearnerPreferencesAction,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "error") {
      formRef.current
        ?.querySelector<HTMLElement>(
          "[aria-invalid=true], [aria-describedby$='-error']",
        )
        ?.focus();
    }
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-6" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor="preferences-test-type"
            className="text-sm font-semibold"
          >
            Loại bài thi
          </label>
          <select
            id="preferences-test-type"
            name="testType"
            defaultValue={profile.test_type ?? ""}
            aria-invalid={Boolean(state.fieldErrors?.testType?.[0])}
            aria-describedby={
              state.fieldErrors?.testType?.[0]
                ? "preferences-test-type-error"
                : undefined
            }
            className={inputClass}
          >
            <option value="">Chọn loại bài thi</option>
            {Object.entries(TEST_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <ErrorText
            id="preferences-test-type-error"
            error={state.fieldErrors?.testType?.[0]}
          />
        </div>
        <div>
          <label
            htmlFor="preferences-current-band"
            className="text-sm font-semibold"
          >
            Band hiện tại
          </label>
          <select
            id="preferences-current-band"
            name="currentBand"
            defaultValue={
              profile.current_band === null
                ? "unknown"
                : String(profile.current_band)
            }
            aria-invalid={Boolean(state.fieldErrors?.currentBand?.[0])}
            aria-describedby={
              state.fieldErrors?.currentBand?.[0]
                ? "preferences-current-band-error"
                : undefined
            }
            className={inputClass}
          >
            <option value="unknown">Chưa xác định</option>
            {BAND_SCORES.map((band) => (
              <option key={band} value={band}>
                {band.toFixed(1)}
              </option>
            ))}
          </select>
          <ErrorText
            id="preferences-current-band-error"
            error={state.fieldErrors?.currentBand?.[0]}
          />
        </div>
        <div>
          <label
            htmlFor="preferences-target-band"
            className="text-sm font-semibold"
          >
            Band mục tiêu
          </label>
          <select
            id="preferences-target-band"
            name="targetBand"
            defaultValue={
              profile.target_band === null ? "" : String(profile.target_band)
            }
            aria-invalid={Boolean(state.fieldErrors?.targetBand?.[0])}
            aria-describedby={
              state.fieldErrors?.targetBand?.[0]
                ? "preferences-target-band-error"
                : undefined
            }
            className={inputClass}
          >
            <option value="">Chọn band mục tiêu</option>
            {BAND_SCORES.map((band) => (
              <option key={band} value={band}>
                {band.toFixed(1)}
              </option>
            ))}
          </select>
          <ErrorText
            id="preferences-target-band-error"
            error={state.fieldErrors?.targetBand?.[0]}
          />
        </div>
        <div>
          <label htmlFor="preferences-goal" className="text-sm font-semibold">
            Mục tiêu chính
          </label>
          <select
            id="preferences-goal"
            name="primaryGoal"
            defaultValue={profile.primary_goal ?? ""}
            aria-invalid={Boolean(state.fieldErrors?.primaryGoal?.[0])}
            aria-describedby={
              state.fieldErrors?.primaryGoal?.[0]
                ? "preferences-goal-error"
                : undefined
            }
            className={inputClass}
          >
            <option value="">Chọn mục tiêu</option>
            {PRIMARY_GOALS.map((goal) => (
              <option key={goal} value={goal}>
                {GOAL_LABELS[goal]}
              </option>
            ))}
          </select>
          <ErrorText
            id="preferences-goal-error"
            error={state.fieldErrors?.primaryGoal?.[0]}
          />
        </div>
        <div>
          <label
            htmlFor="preferences-exam-date"
            className="text-sm font-semibold"
          >
            Ngày thi dự kiến
          </label>
          <input
            id="preferences-exam-date"
            name="targetExamDate"
            type="date"
            defaultValue={profile.target_exam_date ?? ""}
            aria-invalid={Boolean(state.fieldErrors?.targetExamDate?.[0])}
            aria-describedby={
              state.fieldErrors?.targetExamDate?.[0]
                ? "preferences-exam-date-error"
                : undefined
            }
            className={inputClass}
          />
          <ErrorText
            id="preferences-exam-date-error"
            error={state.fieldErrors?.targetExamDate?.[0]}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="preferences-minutes"
              className="text-sm font-semibold"
            >
              Phút / ngày
            </label>
            <select
              id="preferences-minutes"
              name="dailyStudyMinutes"
              defaultValue={profile.daily_study_minutes ?? ""}
              aria-invalid={Boolean(state.fieldErrors?.dailyStudyMinutes?.[0])}
              aria-describedby={
                state.fieldErrors?.dailyStudyMinutes?.[0]
                  ? "preferences-minutes-error"
                  : undefined
              }
              className={inputClass}
            >
              <option value="">Chọn</option>
              {DAILY_STUDY_MINUTES.map((minutes) => (
                <option key={minutes} value={minutes}>
                  {minutes}
                </option>
              ))}
            </select>
            <ErrorText
              id="preferences-minutes-error"
              error={state.fieldErrors?.dailyStudyMinutes?.[0]}
            />
          </div>
          <div>
            <label htmlFor="preferences-days" className="text-sm font-semibold">
              Ngày / tuần
            </label>
            <select
              id="preferences-days"
              name="studyDaysPerWeek"
              defaultValue={profile.study_days_per_week ?? ""}
              aria-invalid={Boolean(state.fieldErrors?.studyDaysPerWeek?.[0])}
              aria-describedby={
                state.fieldErrors?.studyDaysPerWeek?.[0]
                  ? "preferences-days-error"
                  : undefined
              }
              className={inputClass}
            >
              <option value="">Chọn</option>
              {[1, 2, 3, 4, 5, 6, 7].map((days) => (
                <option key={days} value={days}>
                  {days}
                </option>
              ))}
            </select>
            <ErrorText
              id="preferences-days-error"
              error={state.fieldErrors?.studyDaysPerWeek?.[0]}
            />
          </div>
        </div>
      </div>

      <fieldset>
        <legend className="text-sm font-semibold">Kỹ năng ưu tiên</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {PRIORITY_SKILLS.map((skill) => (
            <label
              key={skill}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-[var(--border)] px-4 py-3 text-sm font-semibold"
            >
              <input
                type="checkbox"
                name="prioritySkills"
                value={skill}
                defaultChecked={profile.priority_skills.includes(skill)}
                aria-describedby={
                  state.fieldErrors?.prioritySkills?.[0]
                    ? "preferences-skills-error"
                    : undefined
                }
                className="size-4 accent-[var(--primary)]"
              />
              {SKILL_LABELS[skill]}
            </label>
          ))}
        </div>
        <ErrorText
          id="preferences-skills-error"
          error={state.fieldErrors?.prioritySkills?.[0]}
        />
      </fieldset>

      <div aria-live="polite" aria-atomic="true">
        {state.message ? (
          <p
            role={state.status === "error" ? "alert" : "status"}
            className={
              state.status === "success"
                ? "rounded-lg bg-[var(--success-subtle)] p-3 text-sm text-[var(--success)]"
                : "rounded-lg bg-[var(--destructive-subtle)] p-3 text-sm text-[var(--destructive)]"
            }
          >
            {state.message}
            {state.status === "error" && state.requestId ? (
              <span className="mt-1 block text-xs opacity-80">
                Mã yêu cầu: {state.requestId}
              </span>
            ) : null}
          </p>
        ) : null}
      </div>
      <SaveButton />
    </form>
  );
}
