"use client";

import { Check, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import {
  completeOnboardingAction,
  type OnboardingActionState,
  saveOnboardingStepAction,
} from "@/features/onboarding/actions";
import {
  BAND_SCORES,
  DAILY_STUDY_MINUTES,
  GOAL_LABELS,
  isPrimaryGoal,
  isPrioritySkill,
  isTestType,
  ONBOARDING_STEPS,
  PRIMARY_GOALS,
  PRIORITY_SKILLS,
  SKILL_LABELS,
  TEST_TYPE_LABELS,
} from "@/features/onboarding/constants";
import type { LearnerProfile } from "@/server/onboarding/learner-profile";
import { cn } from "@/lib/utils";

const initialActionState: OnboardingActionState = { status: "idle" };

type WizardValues = {
  testType: string;
  currentBand: string;
  targetBand: string;
  primaryGoal: string;
  targetExamDate: string;
  dailyStudyMinutes: string;
  studyDaysPerWeek: string;
  prioritySkills: string[];
};

function initialValues(profile: LearnerProfile | null): WizardValues {
  return {
    testType: profile?.test_type ?? "",
    currentBand:
      profile?.current_band === null || profile?.current_band === undefined
        ? "unknown"
        : String(profile.current_band),
    targetBand:
      profile?.target_band === null || profile?.target_band === undefined
        ? ""
        : String(profile.target_band),
    primaryGoal: profile?.primary_goal ?? "",
    targetExamDate: profile?.target_exam_date ?? "",
    dailyStudyMinutes:
      profile?.daily_study_minutes === null ||
      profile?.daily_study_minutes === undefined
        ? ""
        : String(profile.daily_study_minutes),
    studyDaysPerWeek:
      profile?.study_days_per_week === null ||
      profile?.study_days_per_week === undefined
        ? ""
        : String(profile.study_days_per_week),
    prioritySkills: profile?.priority_skills.filter(isPrioritySkill) ?? [],
  };
}

function SubmitStepButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="min-w-36">
      {pending ? "Đang lưu…" : "Lưu và tiếp tục"}
      {!pending ? <ChevronRight aria-hidden="true" size={18} /> : null}
    </Button>
  );
}

function CompleteButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? "Đang hoàn tất…" : "Hoàn tất onboarding"}
      {!pending ? <Check aria-hidden="true" size={19} /> : null}
    </Button>
  );
}

function FieldError({ id, errors }: { id: string; errors?: string[] }) {
  if (!errors?.[0]) return null;
  return (
    <p id={id} className="mt-2 text-sm text-[var(--destructive)]">
      {errors[0]}
    </p>
  );
}

function StepHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h1
        id="onboarding-step-title"
        tabIndex={-1}
        className="text-2xl font-bold tracking-[-0.035em] text-[var(--foreground)] outline-none sm:text-3xl"
      >
        {title}
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)] sm:text-base">
        {description}
      </p>
    </div>
  );
}

function FormFooter({ step, onBack }: { step: number; onBack: () => void }) {
  return (
    <div className="mt-8 flex flex-col-reverse gap-3 border-t border-[var(--border)] pt-6 sm:flex-row sm:items-center sm:justify-between">
      <Button type="button" variant="ghost" onClick={onBack}>
        <ChevronLeft aria-hidden="true" size={18} />
        Quay lại
      </Button>
      <input type="hidden" name="step" value={step} />
      <SubmitStepButton />
    </div>
  );
}

function SelectField({
  id,
  label,
  value,
  onChange,
  children,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  error?: string[];
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold">
        {label}
      </label>
      <select
        id={id}
        name={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error?.[0])}
        aria-describedby={error?.[0] ? `${id}-error` : undefined}
        className="mt-2 h-12 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm focus-visible:border-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
      >
        {children}
      </select>
      <FieldError id={`${id}-error`} errors={error} />
    </div>
  );
}

export function OnboardingWizard({
  learnerProfile,
  displayName,
}: {
  learnerProfile: LearnerProfile | null;
  displayName: string;
}) {
  const [step, setStep] = useState(() =>
    Math.min(8, Math.max(1, learnerProfile?.onboarding_step ?? 1)),
  );
  const [values, setValues] = useState(() => initialValues(learnerProfile));
  const [hasExamDate, setHasExamDate] = useState(
    Boolean(learnerProfile?.target_exam_date),
  );
  const [saveState, saveAction] = useActionState(
    saveOnboardingStepAction,
    initialActionState,
  );
  const [completeState, completeAction] = useActionState(
    completeOnboardingAction,
    initialActionState,
  );
  const previousRequestId = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (
      saveState.status === "success" &&
      saveState.nextStep &&
      saveState.requestId !== previousRequestId.current
    ) {
      previousRequestId.current = saveState.requestId;
      setStep(saveState.nextStep);
      requestAnimationFrame(() =>
        document.getElementById("onboarding-step-title")?.focus(),
      );
    } else if (
      saveState.status === "error" &&
      saveState.requestId !== previousRequestId.current
    ) {
      previousRequestId.current = saveState.requestId;
      requestAnimationFrame(() =>
        document
          .querySelector<HTMLElement>(
            "[aria-invalid=true], [aria-describedby$='-error']",
          )
          ?.focus(),
      );
    }
  }, [saveState]);

  function moveTo(nextStep: number) {
    setStep(nextStep);
    requestAnimationFrame(() =>
      document.getElementById("onboarding-step-title")?.focus(),
    );
  }

  function toggleSkill(skill: string, checked: boolean) {
    setValues((current) => ({
      ...current,
      prioritySkills: checked
        ? [...current.prioritySkills, skill]
        : current.prioritySkills.filter((item) => item !== skill),
    }));
  }

  const errors = saveState.fieldErrors;
  const message = step === 8 ? completeState : saveState;
  const progress = Math.round((step / ONBOARDING_STEPS.length) * 100);

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-[0.16em] text-[var(--primary)] uppercase">
            Thiết lập lộ trình
          </p>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Bước {step} / {ONBOARDING_STEPS.length}:{" "}
            {ONBOARDING_STEPS[step - 1]}
          </p>
        </div>
        <span className="text-sm font-semibold text-[var(--muted-foreground)]">
          {progress}%
        </span>
      </div>
      <div
        className="mb-8 h-2 overflow-hidden rounded-full bg-[var(--muted)]"
        role="progressbar"
        aria-label="Tiến độ onboarding"
        aria-valuemin={1}
        aria-valuemax={8}
        aria-valuenow={step}
      >
        <div
          className="h-full rounded-full bg-[var(--primary)] transition-[width] duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <section
        aria-labelledby="onboarding-step-title"
        className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_24px_70px_rgba(28,54,110,0.08)] sm:p-8 lg:p-10"
      >
        {step === 1 ? (
          <div className="py-4 sm:py-8">
            <div className="grid size-12 place-items-center rounded-2xl bg-[var(--primary-subtle)] text-[var(--primary)]">
              <Sparkles aria-hidden="true" size={24} strokeWidth={1.8} />
            </div>
            <div className="mt-6">
              <StepHeading
                title={`Chào ${displayName || "bạn"}, hãy bắt đầu từ mục tiêu thật`}
                description="Khoảng 2 phút để IELTS Flow hiểu loại bài thi, band mục tiêu và quỹ thời gian của bạn. Mỗi bước được lưu riêng để bạn có thể tiếp tục sau."
              />
            </div>
            <div className="mt-8 rounded-2xl bg-[var(--background)] p-5 text-sm leading-6 text-[var(--muted-foreground)]">
              Thông tin này chỉ dùng để cá nhân hóa trải nghiệm học. Phase này
              chưa tạo kế hoạch hoặc điểm số ước lượng.
            </div>
            <Button
              type="button"
              size="lg"
              className="mt-8"
              onClick={() => moveTo(2)}
            >
              Bắt đầu thiết lập
              <ChevronRight aria-hidden="true" size={19} />
            </Button>
          </div>
        ) : null}

        {step === 2 ? (
          <form action={saveAction} noValidate>
            <StepHeading
              title="Bạn đang chuẩn bị cho loại bài thi nào?"
              description="Academic và General Training có phần Reading, Writing khác nhau nên cần xác định ngay từ đầu."
            />
            <fieldset className="mt-7 grid gap-3 sm:grid-cols-2">
              <legend className="sr-only">Loại bài thi IELTS</legend>
              {Object.entries(TEST_TYPE_LABELS).map(([value, label]) => (
                <label
                  key={value}
                  className={cn(
                    "flex min-h-24 cursor-pointer items-start gap-3 rounded-2xl border p-5 transition-colors",
                    values.testType === value
                      ? "border-[var(--primary)] bg-[var(--primary-subtle)]"
                      : "border-[var(--border-strong)] hover:border-[var(--primary)]",
                  )}
                >
                  <input
                    type="radio"
                    name="testType"
                    value={value}
                    checked={values.testType === value}
                    onChange={() =>
                      setValues((current) => ({ ...current, testType: value }))
                    }
                    aria-describedby={
                      errors?.testType?.[0] ? "testType-error" : undefined
                    }
                    className="mt-1 size-4 accent-[var(--primary)]"
                  />
                  <span>
                    <span className="block font-bold">{label}</span>
                    <span className="mt-1 block text-sm leading-6 text-[var(--muted-foreground)]">
                      {value === "academic"
                        ? "Phù hợp mục tiêu đại học, sau đại học hoặc đăng ký nghề nghiệp."
                        : "Phù hợp mục tiêu định cư hoặc đào tạo dưới bậc đại học."}
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>
            <FieldError id="testType-error" errors={errors?.testType} />
            <FormFooter step={2} onBack={() => moveTo(1)} />
          </form>
        ) : null}

        {step === 3 ? (
          <form action={saveAction} noValidate>
            <StepHeading
              title="Band hiện tại của bạn là bao nhiêu?"
              description="Chọn kết quả gần nhất. Nếu chưa từng thi hoặc chưa làm bài đánh giá, bạn có thể chọn chưa xác định."
            />
            <div className="mt-7 max-w-md">
              <SelectField
                id="currentBand"
                label="Band hiện tại"
                value={values.currentBand}
                onChange={(value) =>
                  setValues((current) => ({ ...current, currentBand: value }))
                }
                error={errors?.currentBand}
              >
                <option value="unknown">Chưa xác định</option>
                {BAND_SCORES.map((band) => (
                  <option key={band} value={band}>
                    {band.toFixed(1)}
                  </option>
                ))}
              </SelectField>
            </div>
            <FormFooter step={3} onBack={() => moveTo(2)} />
          </form>
        ) : null}

        {step === 4 ? (
          <form action={saveAction} noValidate>
            <StepHeading
              title="Bạn muốn đạt band nào và để làm gì?"
              description="Mục tiêu rõ ràng giúp các phase sau ưu tiên đúng mức độ và kỹ năng."
            />
            <div className="mt-7 grid gap-6 md:grid-cols-2">
              <SelectField
                id="targetBand"
                label="Band mục tiêu"
                value={values.targetBand}
                onChange={(value) =>
                  setValues((current) => ({ ...current, targetBand: value }))
                }
                error={errors?.targetBand}
              >
                <option value="">Chọn band mục tiêu</option>
                {BAND_SCORES.map((band) => (
                  <option key={band} value={band}>
                    {band.toFixed(1)}
                  </option>
                ))}
              </SelectField>
              <SelectField
                id="primaryGoal"
                label="Mục tiêu chính"
                value={values.primaryGoal}
                onChange={(value) =>
                  setValues((current) => ({ ...current, primaryGoal: value }))
                }
                error={errors?.primaryGoal}
              >
                <option value="">Chọn mục tiêu</option>
                {PRIMARY_GOALS.map((goal) => (
                  <option key={goal} value={goal}>
                    {GOAL_LABELS[goal]}
                  </option>
                ))}
              </SelectField>
            </div>
            <FormFooter step={4} onBack={() => moveTo(3)} />
          </form>
        ) : null}

        {step === 5 ? (
          <form action={saveAction} noValidate>
            <StepHeading
              title="Bạn dự kiến thi khi nào?"
              description="Ngày thi là tùy chọn. Bạn có thể bổ sung hoặc thay đổi sau trong hồ sơ."
            />
            <div className="mt-7 max-w-md space-y-4">
              {hasExamDate ? (
                <div>
                  <label
                    htmlFor="targetExamDate"
                    className="block text-sm font-semibold"
                  >
                    Ngày thi dự kiến
                  </label>
                  <input
                    id="targetExamDate"
                    name="targetExamDate"
                    type="date"
                    value={values.targetExamDate}
                    onChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        targetExamDate: event.target.value,
                      }))
                    }
                    aria-invalid={Boolean(errors?.targetExamDate?.[0])}
                    aria-describedby={
                      errors?.targetExamDate?.[0]
                        ? "targetExamDate-error"
                        : undefined
                    }
                    className="mt-2 h-12 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm focus-visible:border-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
                  />
                  <FieldError
                    id="targetExamDate-error"
                    errors={errors?.targetExamDate}
                  />
                </div>
              ) : (
                <input type="hidden" name="targetExamDate" value="" />
              )}
              <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl bg-[var(--background)] px-4 py-3 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={!hasExamDate}
                  onChange={(event) => {
                    setHasExamDate(!event.target.checked);
                    if (event.target.checked)
                      setValues((current) => ({
                        ...current,
                        targetExamDate: "",
                      }));
                  }}
                  className="size-4 accent-[var(--primary)]"
                />
                Chưa xác định ngày thi
              </label>
            </div>
            <FormFooter step={5} onBack={() => moveTo(4)} />
          </form>
        ) : null}

        {step === 6 ? (
          <form action={saveAction} noValidate>
            <StepHeading
              title="Quỹ thời gian thực tế của bạn là bao nhiêu?"
              description="Chọn lịch bạn có thể duy trì đều đặn, không phải lịch lý tưởng trong một vài ngày."
            />
            <div className="mt-7 grid gap-6 md:grid-cols-2">
              <SelectField
                id="dailyStudyMinutes"
                label="Thời lượng mỗi ngày"
                value={values.dailyStudyMinutes}
                onChange={(value) =>
                  setValues((current) => ({
                    ...current,
                    dailyStudyMinutes: value,
                  }))
                }
                error={errors?.dailyStudyMinutes}
              >
                <option value="">Chọn thời lượng</option>
                {DAILY_STUDY_MINUTES.map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {minutes} phút
                  </option>
                ))}
              </SelectField>
              <SelectField
                id="studyDaysPerWeek"
                label="Số ngày mỗi tuần"
                value={values.studyDaysPerWeek}
                onChange={(value) =>
                  setValues((current) => ({
                    ...current,
                    studyDaysPerWeek: value,
                  }))
                }
                error={errors?.studyDaysPerWeek}
              >
                <option value="">Chọn số ngày</option>
                {[1, 2, 3, 4, 5, 6, 7].map((days) => (
                  <option key={days} value={days}>
                    {days} ngày / tuần
                  </option>
                ))}
              </SelectField>
            </div>
            <FormFooter step={6} onBack={() => moveTo(5)} />
          </form>
        ) : null}

        {step === 7 ? (
          <form action={saveAction} noValidate>
            <StepHeading
              title="Bạn muốn ưu tiên kỹ năng nào?"
              description="Chọn ít nhất một kỹ năng. Bạn có thể chọn cả bốn nếu chưa xác định điểm yếu."
            />
            <fieldset className="mt-7 grid gap-3 sm:grid-cols-2">
              <legend className="sr-only">Kỹ năng ưu tiên</legend>
              {PRIORITY_SKILLS.map((skill) => {
                const checked = values.prioritySkills.includes(skill);
                return (
                  <label
                    key={skill}
                    className={cn(
                      "flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl border px-5 py-4 font-bold transition-colors",
                      checked
                        ? "border-[var(--primary)] bg-[var(--primary-subtle)] text-[var(--primary)]"
                        : "border-[var(--border-strong)] hover:border-[var(--primary)]",
                    )}
                  >
                    <input
                      type="checkbox"
                      name="prioritySkills"
                      value={skill}
                      checked={checked}
                      onChange={(event) =>
                        toggleSkill(skill, event.target.checked)
                      }
                      aria-describedby={
                        errors?.prioritySkills?.[0]
                          ? "prioritySkills-error"
                          : undefined
                      }
                      className="size-4 accent-[var(--primary)]"
                    />
                    {SKILL_LABELS[skill]}
                  </label>
                );
              })}
            </fieldset>
            <FieldError
              id="prioritySkills-error"
              errors={errors?.prioritySkills}
            />
            <FormFooter step={7} onBack={() => moveTo(6)} />
          </form>
        ) : null}

        {step === 8 ? (
          <div>
            <StepHeading
              title="Kiểm tra lại thiết lập của bạn"
              description="Hoàn tất sẽ mở không gian học tập. Bạn vẫn có thể thay đổi các ưu tiên này trong hồ sơ."
            />
            <dl className="mt-7 divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)]">
              {[
                [
                  "Loại bài thi",
                  isTestType(values.testType)
                    ? TEST_TYPE_LABELS[values.testType]
                    : "Chưa chọn",
                  2,
                ],
                [
                  "Band hiện tại",
                  values.currentBand === "unknown"
                    ? "Chưa xác định"
                    : values.currentBand,
                  3,
                ],
                ["Band mục tiêu", values.targetBand || "Chưa chọn", 4],
                [
                  "Mục tiêu",
                  isPrimaryGoal(values.primaryGoal)
                    ? GOAL_LABELS[values.primaryGoal]
                    : "Chưa chọn",
                  4,
                ],
                ["Ngày thi", values.targetExamDate || "Chưa xác định", 5],
                [
                  "Lịch học",
                  values.dailyStudyMinutes && values.studyDaysPerWeek
                    ? `${values.dailyStudyMinutes} phút · ${values.studyDaysPerWeek} ngày/tuần`
                    : "Chưa chọn",
                  6,
                ],
                [
                  "Kỹ năng ưu tiên",
                  values.prioritySkills
                    .map((skill) =>
                      isPrioritySkill(skill) ? SKILL_LABELS[skill] : skill,
                    )
                    .join(", ") || "Chưa chọn",
                  7,
                ],
              ].map(([label, value, editStep]) => (
                <div
                  key={String(label)}
                  className="grid gap-2 px-4 py-4 sm:grid-cols-[11rem_1fr_auto] sm:items-center sm:px-5"
                >
                  <dt className="text-sm text-[var(--muted-foreground)]">
                    {label}
                  </dt>
                  <dd className="font-semibold">{value}</dd>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => moveTo(Number(editStep))}
                    aria-label={`Sửa ${String(label).toLowerCase()}`}
                  >
                    Sửa
                  </Button>
                </div>
              ))}
            </dl>
            <form
              action={completeAction}
              className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <Button type="button" variant="ghost" onClick={() => moveTo(7)}>
                <ChevronLeft aria-hidden="true" size={18} />
                Quay lại
              </Button>
              <CompleteButton />
            </form>
          </div>
        ) : null}

        <div aria-live="polite" aria-atomic="true" className="mt-5">
          {message.status === "error" && message.message ? (
            <p
              role="alert"
              className="rounded-xl bg-[var(--destructive-subtle)] p-4 text-sm text-[var(--destructive)]"
            >
              {message.message}
              {message.requestId ? (
                <span className="mt-1 block text-xs opacity-80">
                  Mã yêu cầu: {message.requestId}
                </span>
              ) : null}
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
