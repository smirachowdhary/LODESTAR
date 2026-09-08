"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const handleSignup = async (
    event: FormEvent
  ) => {
    event.preventDefault();

    setLoading(true);
    setError("");

    const { error } =
      await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
        },
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
            href="/login"
            className="text-sm text-[#123f35]"
          >
            Log in
          </Link>
        </div>
      </header>

      <section className="mx-auto flex min-h-[calc(100vh-74px)] max-w-6xl items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#467a6b]">
              Get started
            </p>

            <h1 className="text-4xl font-semibold tracking-tight text-[#0b1714]">
              Create your account.
            </h1>

            <p className="mt-3 text-sm leading-6 text-black/60">
              Save your plans, resources,
              and progress in one place.
            </p>
          </div>

          <form
            onSubmit={handleSignup}
            className="rounded-3xl border border-black/10 bg-white p-7 shadow-sm"
          >
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Name
                </label>

                <input
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                  required
                  placeholder="Your name"
                  className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none transition focus:border-[#123f35]"
                />
              </div>

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
                  className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none transition focus:border-[#123f35]"
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
                  minLength={6}
                  placeholder="At least 6 characters"
                  className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none transition focus:border-[#123f35]"
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
              className="mt-6 w-full rounded-xl bg-[#123f35] px-5 py-3 font-medium text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {loading
                ? "Creating account..."
                : "Create account"}
            </button>

            <p className="mt-6 text-center text-sm text-black/55">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-[#123f35]"
              >
                Log in
              </Link>
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}