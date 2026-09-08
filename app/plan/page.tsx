"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Check,
  Circle,
  ExternalLink,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { supabase } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";

type PlanStep = {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
};

type Recommendation = {
  resource: {
    id: string;
    name: string;
    category: string;
    description: string;
    website?: string;
    phone?: string | null;
    verified: boolean;
  };
  score: number;
  matchedNeeds: string[];
};

type PlanData = {
  analysis: {
    needs: string[];
    urgency: "high" | "medium" | "normal";
    location: string;
    summary: string;
  };
  recommendations: Recommendation[];
  actionPlan: string[];
};

type SavedPlan = {
  id: string;
  completed_steps: string[] | null;
  reminder_enabled: boolean | null;
  reminder_time: string | null;
  summary: string | null;
  action_steps: string[] | null;
};

export default function PlanPage() {
  const initialized = useRef(false);

  const [plan, setPlan] = useState<PlanData | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const [planId, setPlanId] = useState<string | null>(null);

  const [completed, setCompleted] = useState<string[]>([]);

  const [reminderEnabled, setReminderEnabled] =
    useState(false);

  const [reminderTime, setReminderTime] =
    useState("09:00");

  const [saving, setSaving] = useState(false);
  const [reminderSaving, setReminderSaving] =
    useState(false);

  const [saveMessage, setSaveMessage] =
    useState("");

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    async function initializePlan() {
      const storedPlan =
        sessionStorage.getItem("lodestar-plan");

      if (!storedPlan) {
        return;
      }

      let parsedPlan: PlanData;

      try {
        parsedPlan = JSON.parse(storedPlan);
        setPlan(parsedPlan);
      } catch (error) {
        console.error(
          "Unable to load plan:",
          error
        );
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUser(user);

      if (!user) {
        return;
      }

      const existingPlanId =
        sessionStorage.getItem(
          "lodestar-plan-id"
        );

      if (existingPlanId) {
        const {
          data: existingPlanData,
          error: existingPlanError,
        } = await supabase
          .from("plans")
          .select(
            "id, completed_steps, reminder_enabled, reminder_time, summary, action_steps"
          )
          .eq("id", existingPlanId)
          .maybeSingle();

        if (existingPlanError) {
          console.error(
            "Unable to load saved plan:",
            existingPlanError
          );
        }

        const existingPlan =
          (existingPlanData as SavedPlan | null) || null;

        const samePlan =
          existingPlan &&
          existingPlan.summary ===
            parsedPlan.analysis.summary &&
          JSON.stringify(
            existingPlan.action_steps || []
          ) ===
            JSON.stringify(
              parsedPlan.actionPlan
            );

        if (samePlan) {
          setPlanId(existingPlan.id);

          setCompleted(
            existingPlan.completed_steps || []
          );

          setReminderEnabled(
            existingPlan.reminder_enabled ||
              false
          );

          setReminderTime(
            existingPlan.reminder_time ||
              "09:00"
          );

          return;
        }

        sessionStorage.removeItem(
          "lodestar-plan-id"
        );
      }

      await saveNewPlan(
        parsedPlan,
        user
      );
    }

    initializePlan();
  }, []);

  async function saveNewPlan(
    planData: PlanData,
    currentUser: User
  ) {
    setSaving(true);
    setSaveMessage("");

    try {
      const timezone =
        Intl.DateTimeFormat().resolvedOptions()
          .timeZone ||
        "America/Los_Angeles";

      const situation =
        sessionStorage.getItem(
          "lodestar-situation"
        ) ||
        planData.analysis.summary;

      const resourceIds =
        planData.recommendations
          .map((item) => item.resource.id)
          .filter(Boolean);

      const payload = {
        user_id: currentUser.id,
        situation,
        summary:
          planData.analysis.summary || "",
        location:
          planData.analysis.location || "WA",
        urgency:
          planData.analysis.urgency || "normal",
        needs:
          planData.analysis.needs || [],
        action_steps:
          planData.actionPlan || [],
        resource_ids: resourceIds,
        completed_steps: [],
        reminder_enabled: false,
        reminder_time: "09:00",
        timezone,
      };

      console.log(
        "LODESTAR plan save payload:",
        payload
      );

      const { data, error } = await supabase
        .from("plans")
        .insert(payload)
        .select("id")
        .single();

      if (error) {
        console.error(
          "Unable to save plan:",
          error
        );

        setSaveMessage(
          `Save failed: ${error.message}`
        );
        return;
      }

      if (!data?.id) {
        setSaveMessage(
          "Save failed: Supabase did not return a plan ID."
        );
        return;
      }

      setPlanId(data.id);

      sessionStorage.setItem(
        "lodestar-plan-id",
        data.id
      );

      setSaveMessage("Plan saved.");
    } catch (error) {
      console.error(
        "Unexpected plan save error:",
        error
      );

      setSaveMessage(
        error instanceof Error
          ? `Save failed: ${error.message}`
          : "Save failed: Unknown error."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleStep(id: string) {
    const nextCompleted =
      completed.includes(id)
        ? completed.filter(
            (step) => step !== id
          )
        : [...completed, id];

    setCompleted(nextCompleted);

    if (!user || !planId) {
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("plans")
      .update({
        completed_steps: nextCompleted,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", planId);

    setSaving(false);

    if (error) {
      console.error(
        "Unable to save progress:",
        error
      );

      setSaveMessage(
        "Progress couldn't be saved."
      );

      return;
    }

    setSaveMessage("Progress saved.");
  }

  async function toggleReminder() {
    if (!user || !planId) {
      return;
    }

    const nextValue =
      !reminderEnabled;

    setReminderEnabled(nextValue);
    setReminderSaving(true);

    const timezone =
      Intl.DateTimeFormat().resolvedOptions()
        .timeZone ||
      "America/Los_Angeles";

    const { error } = await supabase
      .from("plans")
      .update({
        reminder_enabled: nextValue,
        reminder_time: reminderTime,
        timezone,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", planId);

    setReminderSaving(false);

    if (error) {
      console.error(
        "Unable to update reminder:",
        error
      );

      setReminderEnabled(!nextValue);
      return;
    }
  }

  async function updateReminderTime(
    time: string
  ) {
    setReminderTime(time);

    if (!user || !planId) {
      return;
    }

    setReminderSaving(true);

    const timezone =
      Intl.DateTimeFormat().resolvedOptions()
        .timeZone ||
      "America/Los_Angeles";

    const { error } = await supabase
      .from("plans")
      .update({
        reminder_time: time,
        timezone,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", planId);

    setReminderSaving(false);

    if (error) {
      console.error(
        "Unable to save reminder time:",
        error
      );
    }
  }

  if (!plan) {
    return (
      <main className="min-h-screen bg-[#fafaf9] text-[#172018]">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
          <a
            href="/"
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#173d32] text-white">
              <Sparkles size={20} />
            </div>

            <span className="text-xl font-semibold tracking-tight">
              LODESTAR
            </span>
          </a>

          <a
            href="/"
            className="flex items-center gap-2 text-sm font-medium text-[#477765]"
          >
            <ArrowLeft size={16} />
            Back home
          </a>
        </nav>

        <section className="mx-auto max-w-3xl px-6 py-24 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e8f1eb] text-[#477765]">
            <Sparkles size={24} />
          </div>

          <h1 className="mt-7 text-4xl font-semibold tracking-tight sm:text-5xl">
            Your plan starts here.
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-[#66716b]">
            Tell LODESTAR what&apos;s
            happening and we&apos;ll help you
            find relevant resources and
            decide what to do next.
          </p>

          <a
            href="/"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#173d32] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#235746]"
          >
            Tell us what&apos;s happening
            <ArrowRight size={16} />
          </a>
        </section>
      </main>
    );
  }

  const steps: PlanStep[] =
    plan.actionPlan.map(
      (step, index) => ({
        id: `step-${index}`,
        title: step,
        completed: completed.includes(
          `step-${index}`
        ),
      })
    );

  const completedCount =
    steps.filter(
      (step) => step.completed
    ).length;

  const allComplete =
    steps.length > 0 &&
    completedCount === steps.length;

  const urgencyLabel =
    plan.analysis.urgency === "high"
      ? "High priority"
      : plan.analysis.urgency ===
          "medium"
        ? "Priority"
        : "Standard priority";

  return (
    <main className="min-h-screen bg-[#fafaf9] text-[#172018]">
      {/* Navigation */}
      <nav className="border-b border-[#e7ebe8] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
          <a
            href="/"
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#173d32] text-white">
              <Sparkles size={20} />
            </div>

            <span className="text-xl font-semibold tracking-tight">
              LODESTAR
            </span>
          </a>

          <div className="flex items-center gap-5">
            {user ? (
              <Link
                href="/dashboard"
                className="text-sm font-medium text-[#477765] transition hover:text-[#173d32]"
              >
                My account
              </Link>
            ) : (
              <Link
                href="/login"
                className="text-sm font-medium text-[#477765] transition hover:text-[#173d32]"
              >
                Log in
              </Link>
            )}

            <a
              href="/"
              className="flex items-center gap-2 text-sm font-medium text-[#477765] transition hover:text-[#173d32]"
            >
              <ArrowLeft size={16} />
              Back home
            </a>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="border-b border-[#e7ebe8] bg-white">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10">
          <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-[#e8f1eb] px-3 py-1.5 text-xs font-medium text-[#477765]">
                  {plan.analysis.location}
                </span>

                <span className="rounded-full bg-[#f1f3f1] px-3 py-1.5 text-xs font-medium text-[#66716b]">
                  {urgencyLabel}
                </span>

                {user && (
                  <span
                    className={`max-w-xl rounded-full px-3 py-1.5 text-xs font-medium ${
                      saveMessage.startsWith("Save failed")
                        ? "bg-red-50 text-red-700"
                        : "bg-[#f1f3f1] text-[#66716b]"
                    }`}
                  >
                    {saving
                      ? "Saving..."
                      : saveMessage ||
                        "Saved to your account"}
                  </span>
                )}
              </div>

              <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
                Your path forward.
              </h1>

              <p className="mt-5 max-w-2xl text-lg leading-8 text-[#66716b]">
                {plan.analysis.summary}
              </p>
            </div>

            <div className="min-w-[170px] rounded-2xl border border-[#e1e8e3] bg-[#fafcfb] p-5">
              <p className="text-sm text-[#718078]">
                Progress
              </p>

              <p className="mt-1 text-3xl font-semibold">
                {completedCount}/
                {steps.length}
              </p>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#e1e8e3]">
                <div
                  className="h-full rounded-full bg-[#477765] transition-all"
                  style={{
                    width:
                      steps.length === 0
                        ? "0%"
                        : `${(completedCount / steps.length) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main */}
      <section className="mx-auto max-w-7xl px-6 py-12 lg:px-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          {/* Action plan */}
          <div>
            <div className="mb-5">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#477765]">
                Action plan
              </p>

              <h2 className="mt-2 text-2xl font-semibold">
                {allComplete
                  ? "You completed your plan."
                  : "Start with these steps."}
              </h2>
            </div>

            <div className="space-y-3">
              {steps.map(
                (step, index) => {
                  const isComplete =
                    step.completed;

                  return (
                    <button
                      key={step.id}
                      onClick={() =>
                        toggleStep(step.id)
                      }
                      className={`flex w-full items-start gap-4 rounded-2xl border p-5 text-left transition ${
                        isComplete
                          ? "border-[#cdded3] bg-[#f1f6f2]"
                          : "border-[#e1e8e3] bg-white hover:-translate-y-0.5 hover:shadow-md"
                      }`}
                    >
                      <div
                        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                          isComplete
                            ? "bg-[#477765] text-white"
                            : "bg-[#edf3ef] text-[#477765]"
                        }`}
                      >
                        {isComplete ? (
                          <Check
                            size={18}
                          />
                        ) : (
                          <span className="text-sm font-semibold">
                            {index + 1}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p
                          className={`font-medium ${
                            isComplete
                              ? "text-[#60766e] line-through"
                              : "text-[#172018]"
                          }`}
                        >
                          {step.title}
                        </p>

                        <p className="mt-1 text-sm text-[#7a857f]">
                          {isComplete
                            ? "Completed"
                            : "Tap when you've completed this step."}
                        </p>
                      </div>

                      {isComplete ? (
                        <Check
                          size={18}
                          className="mt-1 shrink-0 text-[#477765]"
                        />
                      ) : (
                        <Circle
                          size={18}
                          className="mt-1 shrink-0 text-[#b3beb8]"
                        />
                      )}
                    </button>
                  );
                }
              )}
            </div>
          </div>

          <div className="space-y-5">
            {/* Needs */}
            <aside className="rounded-3xl bg-[#173d32] p-7 text-white">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#a9c9bc]">
                What LODESTAR found
              </p>

              <h2 className="mt-3 text-2xl font-semibold">
                Your needs
              </h2>

              <div className="mt-5 flex flex-wrap gap-2">
                {plan.analysis.needs.map(
                  (need) => (
                    <span
                      key={need}
                      className="rounded-full bg-white/10 px-3 py-1.5 text-sm text-white"
                    >
                      {need}
                    </span>
                  )
                )}
              </div>

              <div className="mt-7 border-t border-white/10 pt-6">
                <div className="flex items-start gap-3">
                  <ShieldCheck
                    size={20}
                    className="mt-0.5 shrink-0 text-[#a9c9bc]"
                  />

                  <p className="text-sm leading-6 text-white/70">
                    Recommendations are
                    based on verified
                    resources in the LODESTAR
                    database.
                  </p>
                </div>
              </div>
            </aside>

            {/* Daily reminders */}
            <aside className="rounded-3xl border border-[#e1e8e3] bg-white p-7">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#e8f1eb] text-[#477765]">
                  <Bell size={20} />
                </div>

                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#477765]">
                    Daily reminders
                  </p>

                  <h2 className="mt-2 text-xl font-semibold">
                    Keep your plan moving.
                  </h2>
                </div>
              </div>

              <p className="mt-4 text-sm leading-6 text-[#66716b]">
                Get one daily email
                reminding you about the next
                unfinished step in this
                plan.
              </p>

              {!user ? (
                <div className="mt-5 rounded-2xl bg-[#f4f6f4] p-4">
                  <p className="text-sm leading-6 text-[#66716b]">
                    Sign in to save your
                    progress and enable email
                    reminders.
                  </p>

                  <Link
                    href="/login"
                    className="mt-3 inline-flex rounded-xl bg-[#173d32] px-4 py-2.5 text-sm font-medium text-white"
                  >
                    Log in
                  </Link>
                </div>
              ) : allComplete ? (
                <div className="mt-5 rounded-2xl bg-[#edf4ef] p-4">
                  <div className="flex items-center gap-2 text-[#477765]">
                    <Check size={17} />

                    <span className="text-sm font-medium">
                      Plan completed
                    </span>
                  </div>

                  <p className="mt-2 text-sm leading-6 text-[#66716b]">
                    You&apos;ve completed
                    every step, so no
                    reminders are needed.
                  </p>
                </div>
              ) : (
                <>
                  <div className="mt-6 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">
                        Email me daily
                      </p>

                      <p className="mt-1 text-xs text-[#7a857f]">
                        Sent to{" "}
                        {user.email}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={
                        toggleReminder
                      }
                      disabled={
                        reminderSaving ||
                        !planId
                      }
                      className={`relative h-7 w-12 rounded-full transition ${
                        reminderEnabled
                          ? "bg-[#477765]"
                          : "bg-[#dce3de]"
                      } disabled:opacity-50`}
                      aria-label="Toggle daily reminders"
                    >
                      <span
                        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${
                          reminderEnabled
                            ? "left-6"
                            : "left-1"
                        }`}
                      />
                    </button>
                  </div>

                  {reminderEnabled && (
                    <div className="mt-5 border-t border-[#edf0ed] pt-5">
                      <label
                        htmlFor="reminder-time"
                        className="text-sm font-medium"
                      >
                        Reminder time
                      </label>

                      <input
                        id="reminder-time"
                        type="time"
                        value={
                          reminderTime
                        }
                        onChange={(e) =>
                          updateReminderTime(
                            e.target.value
                          )
                        }
                        className="mt-2 w-full rounded-xl border border-[#dce5df] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#477765]"
                      />

                      <p className="mt-2 text-xs leading-5 text-[#7a857f]">
                        We&apos;ll use your
                        local timezone.
                      </p>
                    </div>
                  )}

                  {reminderSaving && (
                    <p className="mt-3 text-xs text-[#7a857f]">
                      Saving reminder
                      settings...
                    </p>
                  )}
                </>
              )}
            </aside>
          </div>
        </div>

        {/* Recommended resources */}
        <div className="mt-16">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#477765]">
              Recommended resources
            </p>

            <h2 className="mt-2 text-2xl font-semibold">
              Places that may be able to
              help.
            </h2>

            <p className="mt-3 text-[#66716b]">
              These recommendations were
              selected based on the needs
              LODESTAR identified.
            </p>
          </div>

          <div className="mt-7 grid gap-4 md:grid-cols-2">
            {plan.recommendations.map(
              (item) => (
                <article
                  key={item.resource.id}
                  className="rounded-2xl border border-[#e1e8e3] bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">
                          {
                            item.resource
                              .name
                          }
                        </h3>

                        {item.resource
                          .verified && (
                          <ShieldCheck
                            size={16}
                            className="shrink-0 text-[#477765]"
                          />
                        )}
                      </div>

                      <p className="mt-1 text-xs font-medium uppercase tracking-[0.1em] text-[#477765]">
                        {
                          item.resource
                            .category
                        }
                      </p>
                    </div>

                    <span className="shrink-0 rounded-full bg-[#edf3ef] px-2.5 py-1 text-xs text-[#477765]">
                      Match
                    </span>
                  </div>

                  <p className="mt-4 text-sm leading-6 text-[#66716b]">
                    {
                      item.resource
                        .description
                    }
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.matchedNeeds.map(
                      (need) => (
                        <span
                          key={need}
                          className="rounded-full bg-[#f1f4f2] px-2.5 py-1 text-xs text-[#60766e]"
                        >
                          {need}
                        </span>
                      )
                    )}
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    {item.resource
                      .website && (
                      <a
                        href={
                          item.resource
                            .website
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-xl bg-[#173d32] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#235746]"
                      >
                        Visit resource
                        <ExternalLink
                          size={14}
                        />
                      </a>
                    )}

                    {item.resource.phone && (
                      <a
                        href={`tel:${item.resource.phone}`}
                        className="rounded-xl border border-[#dce5df] px-4 py-2.5 text-sm font-medium text-[#477765]"
                      >
                        Call
                      </a>
                    )}
                  </div>
                </article>
              )
            )}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 rounded-3xl bg-[#edf4ef] p-8 sm:p-10">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <p className="text-xl font-semibold">
                Need to start over?
              </p>

              <p className="mt-2 text-sm leading-6 text-[#66716b]">
                Tell LODESTAR about a
                different situation and
                create a new path forward.
              </p>
            </div>

            <a
              href="/"
              onClick={() => {
                sessionStorage.removeItem(
                  "lodestar-plan-id"
                );
                sessionStorage.removeItem(
                  "lodestar-plan"
                );
                sessionStorage.removeItem(
                  "lodestar-situation"
                );
              }}
              className="flex w-fit items-center gap-2 rounded-xl bg-[#173d32] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#235746]"
            >
              Start again
              <ArrowRight size={16} />
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}