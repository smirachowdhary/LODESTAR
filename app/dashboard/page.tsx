

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  CheckCircle2,
  MapPin,
  Sparkles,
  Trash2,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";

type SavedPlan = {
  id: string;
  situation: string | null;
  summary: string | null;
  location: string | null;
  needs: string[] | null;
  urgency: "high" | "medium" | "normal" | null;
  action_steps: string[] | null;
  resource_ids: string[] | null;
  completed_steps: string[] | null;
  reminder_enabled: boolean;
  reminder_time: string | null;
  created_at: string;
  updated_at: string;
};

type ResourceRow = {
  id: string;
  organization_name: string;
  category: string;
  description: string;
  website: string | null;
  phone: string | null;
  verified: boolean;
};

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [plans, setPlans] = useState<SavedPlan[]>([]);
  const [resources, setResources] = useState<Record<string, ResourceRow>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      setLoadError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      setUser(user);

      const { data: planRows, error: planError } = await supabase
        .from("plans")
        .select(
          "id, situation, summary, location, needs, urgency, action_steps, resource_ids, completed_steps, reminder_enabled, reminder_time, created_at, updated_at"
        )
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (planError) {
        console.error("Unable to load saved plans:", planError);
        setLoadError("We couldn't load your saved plans.");
        setLoading(false);
        return;
      }

      const typedPlans = (planRows || []) as SavedPlan[];
      setPlans(typedPlans);

      const allResourceIds = Array.from(
        new Set(
          typedPlans.flatMap((plan) => plan.resource_ids || [])
        )
      );

      if (allResourceIds.length > 0) {
        const { data: resourceRows, error: resourceError } = await supabase
          .from("resources")
          .select(
            "id, organization_name, category, description, website, phone, verified"
          )
          .in("id", allResourceIds);

        if (resourceError) {
          console.error("Unable to load plan resources:", resourceError);
        } else {
          const resourceMap: Record<string, ResourceRow> = {};

          ((resourceRows || []) as ResourceRow[]).forEach((resource) => {
            resourceMap[resource.id] = resource;
          });

          setResources(resourceMap);
        }
      }

      setLoading(false);
    }

    loadDashboard();
  }, [router]);

  const name =
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "there";

  const totalIncompleteSteps = useMemo(
    () =>
      plans.reduce((total, plan) => {
        const totalSteps = plan.action_steps?.length || 0;
        const completedSteps = plan.completed_steps?.length || 0;
        return total + Math.max(totalSteps - completedSteps, 0);
      }, 0),
    [plans]
  );

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  function startNewPlan() {
    sessionStorage.removeItem("lodestar-plan");
    sessionStorage.removeItem("lodestar-plan-id");
    sessionStorage.removeItem("lodestar-situation");
    window.location.href = "/#get-help";
  }

  function continuePlan(savedPlan: SavedPlan) {
    const recommendations = (savedPlan.resource_ids || [])
      .map((id) => resources[id])
      .filter(Boolean)
      .map((resource) => ({
        resource: {
          id: resource.id,
          name: resource.organization_name,
          category: resource.category,
          description: resource.description,
          website: resource.website || undefined,
          phone: resource.phone,
          verified: resource.verified,
        },
        score: 0,
        matchedNeeds: savedPlan.needs || [],
      }));

    const planData = {
      analysis: {
        needs: savedPlan.needs || [],
        urgency: savedPlan.urgency || "normal",
        location: savedPlan.location || "Washington",
        summary:
          savedPlan.summary ||
          savedPlan.situation ||
          "Your saved LODESTAR plan.",
      },
      recommendations,
      actionPlan: savedPlan.action_steps || [],
    };

    sessionStorage.setItem("lodestar-plan", JSON.stringify(planData));
    sessionStorage.setItem("lodestar-plan-id", savedPlan.id);

    if (savedPlan.situation) {
      sessionStorage.setItem("lodestar-situation", savedPlan.situation);
    }

    router.push("/plan");
  }

  async function deletePlan(planId: string) {
    if (!window.confirm("Delete this saved plan? This cannot be undone.")) return;

    const { error } = await supabase.from("plans").delete().eq("id", planId);

    if (error) {
      console.error("Unable to delete plan:", error);
      setLoadError("We couldn't delete that plan.");
      return;
    }

    setPlans((current) => current.filter((plan) => plan.id !== planId));

    if (sessionStorage.getItem("lodestar-plan-id") === planId) {
      sessionStorage.removeItem("lodestar-plan-id");
      sessionStorage.removeItem("lodestar-plan");
      sessionStorage.removeItem("lodestar-situation");
    }
  }

  function planTitle(plan: SavedPlan) {
    const labels: Record<string, string> = {
      housing: "Housing", food: "Food", employment: "Employment",
      healthcare: "Healthcare", legal: "Legal", childcare: "Childcare",
      "financial assistance": "Financial", education: "Education",
      transportation: "Transportation", disability: "Disability",
      "community services": "Community",
    };
    const needs = (plan.needs || []).slice(0, 2).map((n) => labels[n] || n);
    return needs.length ? `${needs.join(" + ")} support plan` : "Community support plan";
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fbfcfa]">
        <p className="text-sm text-black/50">Loading your LODESTAR...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fbfcfa] text-[#0b1714]">
      <header className="border-b border-black/10 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#123f35] text-white">
              <Sparkles size={16} />
            </div>
            <span className="font-semibold">LODESTAR</span>
          </Link>

          <div className="flex items-center gap-5">
            <Link
              href="/resources"
              className="hidden text-sm text-black/55 transition hover:text-black sm:block"
            >
              Resources
            </Link>

            <button
              onClick={handleLogout}
              className="text-sm text-black/60 transition hover:text-black"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="mb-12">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#467a6b]">
            Your LODESTAR
          </p>

          <h1 className="text-4xl font-semibold tracking-tight">
            Welcome back, {name}.
          </h1>

          <p className="mt-3 max-w-xl text-black/60">
            Continue a saved plan, check your progress, or start a new path
            forward.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <div className="rounded-3xl bg-[#123f35] p-7 text-white md:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
              Need support?
            </p>

            <h2 className="mt-4 max-w-md text-3xl font-semibold">
              Tell LODESTAR what&apos;s happening.
            </h2>

            <p className="mt-3 max-w-lg text-sm leading-6 text-white/70">
              Get a personalized action plan and verified resources based on
              your situation.
            </p>

            <button
              onClick={startNewPlan}
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-medium text-[#123f35] transition hover:bg-white/90"
            >
              Start a new plan
              <ArrowRight size={16} />
            </button>
          </div>

          <div className="rounded-3xl border border-black/10 bg-white p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#467a6b]">
              Account
            </p>

            <p className="mt-5 text-sm text-black/45">Signed in as</p>
            <p className="mt-1 break-all font-medium">{user?.email}</p>

            <div className="mt-7 border-t border-black/10 pt-5">
              <p className="text-sm text-black/45">Open steps</p>
              <p className="mt-1 text-2xl font-semibold">
                {totalIncompleteSteps}
              </p>
            </div>
          </div>
        </div>

        <section className="mt-12">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#467a6b]">
                Saved plans
              </p>

              <h2 className="mt-2 text-2xl font-semibold">
                Your paths forward.
              </h2>
            </div>

            {plans.length > 0 && (
              <p className="text-sm text-black/45">
                {plans.length} {plans.length === 1 ? "plan" : "plans"} saved
              </p>
            )}
          </div>

          {loadError && (
            <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
              {loadError}
            </div>
          )}

          {plans.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-black/15 bg-white px-8 py-14 text-center">
              <h3 className="font-semibold">No saved plans yet.</h3>

              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-black/50">
                Create a plan while you&apos;re signed in and it will appear
                here with your saved progress.
              </p>

              <button
                onClick={startNewPlan}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#123f35] px-5 py-3 text-sm font-medium text-white"
              >
                Create your first plan
                <ArrowRight size={15} />
              </button>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {plans.map((plan) => {
                const totalSteps = plan.action_steps?.length || 0;
                const completedSteps = plan.completed_steps?.length || 0;
                const percentage =
                  totalSteps === 0
                    ? 0
                    : Math.round((completedSteps / totalSteps) * 100);

                const complete =
                  totalSteps > 0 && completedSteps === totalSteps;

                return (
                  <article
                    key={plan.id}
                    className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          {plan.location && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#edf4ef] px-3 py-1 text-xs font-medium text-[#467a6b]">
                              <MapPin size={12} />
                              {plan.location}
                            </span>
                          )}

                          {plan.urgency && (
                            <span className="rounded-full bg-[#f2f3f2] px-3 py-1 text-xs font-medium text-black/55">
                              {plan.urgency === "high"
                                ? "High priority"
                                : plan.urgency === "medium"
                                  ? "Priority"
                                  : "Standard priority"}
                            </span>
                          )}
                        </div>

                        <h3 className="mt-4 text-xl font-semibold">
                          {plan.needs && plan.needs.length > 0
                            ? `${plan.needs.slice(0, 2).join(" + ")} support`
                            : "Saved LODESTAR plan"}
                        </h3>

                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-black/55">
                          {plan.summary ||
                            plan.situation ||
                            "Your saved personalized plan."}
                        </p>
                      </div>

                      {complete && (
                        <CheckCircle2
                          size={22}
                          className="shrink-0 text-[#467a6b]"
                        />
                      )}
                    </div>

                    <div className="mt-6">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-black/50">Progress</span>
                        <span className="font-medium">
                          {completedSteps}/{totalSteps} steps
                        </span>
                      </div>

                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e6ebe7]">
                        <div
                          className="h-full rounded-full bg-[#467a6b] transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>

                    {plan.reminder_enabled && !complete && (
                      <div className="mt-5 flex items-center gap-2 rounded-xl bg-[#f5f8f6] px-4 py-3 text-sm text-[#58675f]">
                        <Bell size={15} className="text-[#467a6b]" />
                        Daily reminder
                        {plan.reminder_time
                          ? ` at ${formatReminderTime(plan.reminder_time)}`
                          : ""}
                      </div>
                    )}

                    <button
                      onClick={() => continuePlan(plan)}
                      className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#123f35] px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
                    >
                      {complete ? "View completed plan" : "Continue plan"}
                      <ArrowRight size={15} />
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function formatReminderTime(time: string) {
  const [hoursString, minutesString] = time.split(":");
  const hours = Number(hoursString);
  const minutes = Number(minutesString);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return time;
  }

  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 || 12;

  return `${displayHour}:${minutes.toString().padStart(2, "0")} ${suffix}`;
}
