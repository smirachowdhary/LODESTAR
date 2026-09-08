"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";
import {
  ArrowRight,
  MapPin,
  ShieldCheck,
  Sparkles,
  Search,
  HeartHandshake,
  BriefcaseBusiness,
  House,
  Scale,
  GraduationCap,
} from "lucide-react";

const categories = [
  {
    icon: House,
    title: "Housing",
    description: "Rent assistance, shelters, utilities",
  },
  {
    icon: BriefcaseBusiness,
    title: "Employment",
    description: "Jobs, training, and career support",
  },
  {
    icon: HeartHandshake,
    title: "Food",
    description: "Food banks, meals, and groceries",
  },
  {
    icon: Scale,
    title: "Legal",
    description: "Legal aid and community advocacy",
  },
  {
    icon: GraduationCap,
    title: "Education",
    description: "Schools, scholarships, and learning support",
  },
];

export default function Home() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUser(user);
      setAuthLoading(false);
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleGetHelp() {
    if (!message.trim()) return;

    setLoading(true);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          state: "WA",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      setResults(data);

      sessionStorage.setItem(
        "lodestar-plan",
        JSON.stringify(data)
      );

      sessionStorage.setItem(
        "lodestar-situation",
        message.trim()
      );

      sessionStorage.removeItem(
        "lodestar-plan-id"
      );

      setTimeout(() => {
        document
          .getElementById("results")
          ?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#fafaf9] text-[#172018]">

      {/* Navigation */}
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <a href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#173d32] text-white">
            <Sparkles size={20} />
          </div>

          <span className="text-xl font-semibold tracking-tight">
            LODESTAR
          </span>
        </a>

        <div className="hidden items-center gap-8 text-sm text-[#59635d] md:flex">
          <a
            href="/how-it-works"
            className="transition hover:text-[#173d32]"
          >
            How it works
          </a>

          <a
            href="/resources"
            className="transition hover:text-[#173d32]"
          >
            Resources
          </a>

          <a
            href="/about"
            className="transition hover:text-[#173d32]"
          >
            About
          </a>
        </div>

        <div className="flex items-center gap-3">
          {!authLoading && user ? (
            <Link
              href="/dashboard"
              className="rounded-full border border-[#173d32] px-5 py-2.5 text-sm font-medium text-[#173d32] transition hover:bg-[#edf4ef]"
            >
              Dashboard
            </Link>
          ) : !authLoading ? (
            <>
              <Link
                href="/login"
                className="rounded-full border border-[#d8e1dc] px-5 py-2.5 text-sm font-medium text-[#173d32] transition hover:bg-[#f2f6f3]"
              >
                Log in
              </Link>

              <Link
                href="/signup"
                className="rounded-full border border-[#173d32] px-5 py-2.5 text-sm font-medium text-[#173d32] transition hover:bg-[#edf4ef]"
              >
                Sign up
              </Link>
            </>
          ) : null}

          <a
            href="#get-help"
            className="rounded-full bg-[#173d32] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#235746]"
          >
            Get help
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section
        id="get-help"
        className="relative overflow-hidden"
      >
        <div className="mx-auto grid max-w-7xl gap-14 px-6 pb-24 pt-16 lg:grid-cols-2 lg:px-10 lg:pb-32 lg:pt-24">

          <div className="flex flex-col justify-center">

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-7 inline-flex w-fit items-center gap-2 rounded-full border border-[#dce4de] bg-white px-4 py-2 text-sm text-[#53605a]"
            >
              <MapPin size={15} />
              Starting in Washington
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-2xl text-5xl font-semibold leading-[1.04] tracking-[-0.045em] sm:text-6xl lg:text-7xl"
            >
              Find the help you need.

              <span className="block text-[#477765]">
                Know what to do next.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.15,
                duration: 0.6,
              }}
              className="mt-7 max-w-xl text-lg leading-8 text-[#66716b]"
            >
              LODESTAR turns your situation into a clear path forward —
              connecting you with relevant community resources and the next
              steps that matter most.
            </motion.p>

            {/* Search */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.25,
                duration: 0.6,
              }}
              className="mt-9 max-w-2xl rounded-2xl border border-[#dce3de] bg-white p-2 shadow-[0_15px_50px_rgba(23,61,50,0.08)]"
            >
              <div className="flex items-center gap-3 px-4 py-3">

                <Search
                  size={20}
                  className="shrink-0 text-[#7c8982]"
                />

                <input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleGetHelp();
                    }
                  }}
                  className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-[#9aa49f]"
                  placeholder="What's going on? Tell us in your own words."
                />

                <button
                  onClick={handleGetHelp}
                  disabled={loading || !message.trim()}
                  className="flex shrink-0 items-center gap-2 rounded-xl bg-[#173d32] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#235746] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Finding help..." : "Get help"}

                  <ArrowRight size={16} />
                </button>

              </div>
            </motion.div>

            <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-[#758079]">

              <span className="flex items-center gap-2">
                <ShieldCheck size={16} />
                Verified resources
              </span>

              <span className="hidden sm:inline">•</span>

              <span>
                Personalized recommendations
              </span>

            </div>
          </div>

          {/* Preview */}
          <motion.div
            initial={{
              opacity: 0,
              scale: 0.96,
            }}
            animate={{
              opacity: 1,
              scale: 1,
            }}
            transition={{
              delay: 0.2,
              duration: 0.7,
            }}
            className="relative flex items-center justify-center"
          >
            <div className="absolute h-[420px] w-[420px] rounded-full bg-[#dfece4] blur-3xl" />

            <div className="relative w-full max-w-md rounded-[28px] border border-[#dce5df] bg-white p-5 shadow-[0_25px_70px_rgba(23,61,50,0.12)]">

              <div className="mb-6 flex items-center justify-between">

                <div>
                  <p className="text-sm font-semibold">
                    Your path forward
                  </p>

                  <p className="mt-1 text-xs text-[#7a857f]">
                    Based on your situation
                  </p>
                </div>

                <div className="rounded-full bg-[#e8f2eb] px-3 py-1 text-xs font-medium text-[#477765]">
                  Washington
                </div>

              </div>

              <div className="rounded-2xl bg-[#f5f8f5] p-4">
                <p className="text-sm leading-6 text-[#4f5b54]">
                  "I lost my job and I'm worried about paying rent and feeding
                  my family."
                </p>
              </div>

              <div className="mt-5 space-y-3">

                {[
                  ["01", "Housing support", "Emergency rental assistance"],
                  ["02", "Food assistance", "Nearby food resources"],
                  ["03", "Employment", "Workforce and job support"],
                ].map(([number, title, description]) => (

                  <div
                    key={number}
                    className="flex items-center gap-4 rounded-2xl border border-[#e5ebe6] p-4"
                  >

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#edf3ef] text-xs font-semibold text-[#477765]">
                      {number}
                    </div>

                    <div className="min-w-0 flex-1">

                      <p className="text-sm font-medium">
                        {title}
                      </p>

                      <p className="mt-1 text-xs text-[#7a857f]">
                        {description}
                      </p>

                    </div>

                    <ArrowRight
                      size={16}
                      className="text-[#9aa49f]"
                    />

                  </div>

                ))}

              </div>

              <a
                href="#get-help"
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#173d32] py-3 text-sm font-medium text-white"
              >
                Start with your situation
                <ArrowRight size={16} />
              </a>

            </div>
          </motion.div>

        </div>
      </section>

      {/* Results */}
      {results && (
        <section
          id="results"
          className="border-y border-[#e7ebe8] bg-white"
        >
          <div className="mx-auto max-w-7xl px-6 py-20 lg:px-10">

            <div className="max-w-2xl">

              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#477765]">
                Your next steps
              </p>

              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                Here's where I'd start.
              </h2>

              <p className="mt-4 leading-7 text-[#6d7771]">
                {results.analysis.summary}
              </p>

              <div className="mt-5 flex flex-wrap gap-2">

                {results.analysis.needs.map(
                  (need: string) => (
                    <span
                      key={need}
                      className="rounded-full bg-[#e8f1eb] px-3 py-1.5 text-sm text-[#477765]"
                    >
                      {need}
                    </span>
                  )
                )}

              </div>
            </div>

            <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px]">

              {/* Resources */}
              <div>

                <h3 className="text-xl font-semibold">
                  Recommended resources
                </h3>

                <p className="mt-2 text-sm text-[#7a857f]">
                  Verified organizations that may be able to help.
                </p>

                <div className="mt-5 space-y-4">

                  {results.recommendations.map(
                    (item: any) => (

                      <div
                        key={item.resource.id}
                        className="rounded-2xl border border-[#e4e9e5] bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-md"
                      >

                        <div className="flex items-start justify-between gap-4">

                          <div className="min-w-0">

                            <div className="flex items-center gap-2">

                              <h4 className="font-semibold">
                                {item.resource.organization_name ||
                                  item.resource.name ||
                                  "Community resource"}
                              </h4>

                              {item.resource.verified && (
                                <ShieldCheck
                                  size={16}
                                  className="shrink-0 text-[#477765]"
                                />
                              )}

                            </div>

                            <p className="mt-2 text-sm leading-6 text-[#6d7771]">
                              {item.resource.description}
                            </p>

                            <div className="mt-3 flex flex-wrap gap-2">

                              {item.matchedNeeds.map(
                                (need: string) => (
                                  <span
                                    key={need}
                                    className="rounded-full bg-[#f1f5f2] px-2.5 py-1 text-xs text-[#5f6d65]"
                                  >
                                    {need}
                                  </span>
                                )
                              )}

                            </div>

                          </div>

                          {item.resource.website && (
                            <a
                              href={item.resource.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 rounded-xl bg-[#173d32] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#235746]"
                            >
                              Visit
                            </a>
                          )}

                        </div>

                      </div>

                    )
                  )}

                </div>
              </div>

              {/* Plan */}
              <div className="h-fit rounded-3xl bg-[#f1f5f2] p-6">

                <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#477765]">
                  Your plan
                </p>

                <h3 className="mt-2 text-xl font-semibold">
                  Start here
                </h3>

                <div className="mt-5 space-y-4">

                  {results.actionPlan.map(
                    (
                      step: string,
                      index: number
                    ) => (

                      <div
                        key={step}
                        className="flex gap-3"
                      >

                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-[#477765]">
                          {index + 1}
                        </div>

                        <p className="text-sm leading-6 text-[#59655e]">
                          {step}
                        </p>

                      </div>

                    )
                  )}

                </div>

                {/* Full plan button */}
                <a
                  href="/plan"
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#173d32] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#235746]"
                >
                  Open my full plan
                  <ArrowRight size={16} />
                </a>

              </div>

            </div>
          </div>
        </section>
      )}

      {/* How It Works */}
      <section
        id="how-it-works"
        className="mx-auto max-w-7xl px-6 py-24 lg:px-10"
      >

        <div className="max-w-2xl">

          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#477765]">
            How LODESTAR works
          </p>

          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            A clearer path through complicated systems.
          </h2>

        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">

          {[
            {
              number: "01",
              title: "Tell us what's happening",
              text: "Describe your situation in your own words. You don't need to know which program or organization to look for.",
            },
            {
              number: "02",
              title: "We find what fits",
              text: "LODESTAR identifies your needs and matches them with relevant community resources.",
            },
            {
              number: "03",
              title: "Know what to do next",
              text: "Get prioritized recommendations and a clear action plan instead of a list of links.",
            },
          ].map((step) => (

            <div
              key={step.number}
              className="rounded-3xl bg-[#f1f5f2] p-8"
            >

              <span className="text-sm font-semibold text-[#477765]">
                {step.number}
              </span>

              <h3 className="mt-6 text-xl font-semibold">
                {step.title}
              </h3>

              <p className="mt-3 leading-7 text-[#68736c]">
                {step.text}
              </p>

            </div>

          ))}

        </div>
      </section>

      {/* Resources */}
      <section
        id="resources"
        className="border-y border-[#e7ebe8] bg-white"
      >
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-10">

          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">

            <div className="max-w-2xl">

              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#477765]">
                Community resources
              </p>

              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                Resources for where you are.
              </h2>

              <p className="mt-4 leading-7 text-[#6d7771]">
                Explore verified organizations and programs for housing,
                food, employment, healthcare, legal support, and more.
              </p>

            </div>

            <a
              href="/resources"
              className="flex w-fit shrink-0 items-center gap-2 rounded-xl border border-[#dce5df] px-4 py-2.5 text-sm font-medium text-[#477765] transition hover:border-[#477765]"
            >
              Explore resources
              <ArrowRight size={16} />
            </a>

          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">

            {categories.map((category) => {

              const Icon = category.icon;

              return (
                <a
                  key={category.title}
                  href={`/resources?category=${encodeURIComponent(
                    category.title
                  )}`}
                  className="group rounded-2xl border border-[#e4e9e5] bg-[#fbfcfb] p-5 transition hover:-translate-y-1 hover:border-[#c9d9cf] hover:shadow-lg"
                >

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8f1eb] text-[#477765]">
                    <Icon size={19} />
                  </div>

                  <h3 className="mt-5 font-semibold">
                    {category.title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-[#77817b]">
                    {category.description}
                  </p>

                </a>
              );

            })}

          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#e4e9e5] bg-[#173d32] text-white">

        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-12 lg:px-10">

          <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">

            <div>

              <a
                href="/"
                className="flex items-center gap-3"
              >

                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
                  <Sparkles size={18} />
                </div>

                <span className="font-semibold">
                  LODESTAR
                </span>

              </a>

              <p className="mt-3 max-w-md text-sm leading-6 text-white/60">
                Helping people navigate the systems built to support them.
              </p>

            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-white/60">

              <a
                href="/how-it-works"
                className="transition hover:text-white"
              >
                How it works
              </a>

              <a
                href="/resources"
                className="transition hover:text-white"
              >
                Resources
              </a>

              <a
                href="/about"
                className="transition hover:text-white"
              >
                About
              </a>

              <a
                href="/plan"
                className="transition hover:text-white"
              >
                My plan
              </a>

            </div>

          </div>

          <div className="border-t border-white/10 pt-6 text-xs text-white/40">
            Starting in Washington. Built to grow.
          </div>

        </div>

      </footer>

    </main>
  );
}