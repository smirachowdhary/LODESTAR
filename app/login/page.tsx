"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const handleLogin = async (
    event: FormEvent
  ) => {
    event.preventDefault();

    setLoading(true);
    setError("");

    const { error } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <main className="min-h-screen bg-[#fbfcfa]">
      <header className="border-b border-black/10">
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

          <Link
            href="/signup"
            className="text-sm text-[#123f35]"
          >
            Create account
          </Link>
        </div>
      </header>

      <section className="mx-auto flex min-h-[calc(100vh-74px)] max-w-6xl items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#467a6b]">
              Welcome back
            </p>

            <h1 className="text-4xl font-semibold tracking-tight">
              Continue your path.
            </h1>

            <p className="mt-3 text-sm text-black/60">
              Log in to access your saved
              plans and resources.
            </p>
          </div>

          <form
            onSubmit={handleLogin}
            className="rounded-3xl border border-black/10 bg-white p-7 shadow-sm"
          >
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Email
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  required
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-[#123f35]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Password
                </label>

                <input
                  type="password"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  required
                  placeholder="Your password"
                  className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-[#123f35]"
                />
              </div>
            </div>

            {error && (
              <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full rounded-xl bg-[#123f35] px-5 py-3 font-medium text-white hover:opacity-90 disabled:opacity-60"
            >
              {loading
                ? "Logging in..."
                : "Log in"}
            </button>

            <p className="mt-6 text-center text-sm text-black/55">
              New to LODESTAR?{" "}
              <Link
                href="/signup"
                className="font-medium text-[#123f35]"
              >
                Create an account
              </Link>
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}