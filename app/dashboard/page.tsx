"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] =
    useState<User | null>(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      setUser(user);
      setLoading(false);
    };

    loadUser();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();

    router.push("/");
    router.refresh();
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fbfcfa]">
        <p className="text-sm text-black/50">
          Loading LODESTAR...
        </p>
      </main>
    );
  }

  const name =
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "there";

  return (
    <main className="min-h-screen bg-[#fbfcfa]">
      <header className="border-b border-black/10 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link
            href="/"
            className="flex items-center gap-3"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#123f35] text-white">
              ✣
            </div>

            <span className="font-semibold">
              LODESTAR
            </span>
          </Link>

          <button
            onClick={handleLogout}
            className="text-sm text-black/60 hover:text-black"
          >
            Log out
          </button>
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
            Pick up where you left off or
            start a new path forward.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <div className="rounded-3xl bg-[#123f35] p-7 text-white md:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
              Need support?
            </p>

            <h2 className="mt-4 max-w-md text-3xl font-semibold">
              Tell LODESTAR what&apos;s
              happening.
            </h2>

            <p className="mt-3 max-w-lg text-sm leading-6 text-white/70">
              Get a personalized action plan
              and verified resources based on
              your situation.
            </p>

            <Link
              href="/"
              className="mt-7 inline-flex rounded-xl bg-white px-5 py-3 text-sm font-medium text-[#123f35]"
            >
              Start a new plan →
            </Link>
          </div>

          <div className="rounded-3xl border border-black/10 bg-white p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#467a6b]">
              Account
            </p>

            <p className="mt-5 text-sm text-black/45">
              Signed in as
            </p>

            <p className="mt-1 break-all font-medium">
              {user?.email}
            </p>
          </div>
        </div>

        <section className="mt-12">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#467a6b]">
                Saved plans
              </p>

              <h2 className="mt-2 text-2xl font-semibold">
                Your paths forward.
              </h2>
            </div>
          </div>

          <div className="rounded-3xl border border-dashed border-black/15 bg-white px-8 py-14 text-center">
            <h3 className="font-semibold">
              No saved plans yet.
            </h3>

            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-black/50">
              Your future LODESTAR plans will
              appear here so you can return
              and continue making progress.
            </p>

            <Link
              href="/"
              className="mt-6 inline-block rounded-xl bg-[#123f35] px-5 py-3 text-sm font-medium text-white"
            >
              Create your first plan
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}