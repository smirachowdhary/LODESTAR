"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

type Resource = {
  id: string;
  organization_name: string;
  category: string;
  description: string;
  state: string;
  city: string;
  website: string;
  phone?: string | null;
  services: string[];
  languages: string[];
  verified: boolean;
};

const categories = [
  "All",
  "Housing",
  "Food",
  "Employment",
  "Healthcare",
  "Legal",
  "Benefits",
  "Family Services",
  "Community Services",
];

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadResources() {
      try {
        const response = await fetch("/api/resources");

        if (!response.ok) {
          throw new Error("Unable to load resources");
        }

        const data = await response.json();

        setResources(data.resources ?? []);
      } catch (err) {
        console.error(err);
        setError("We couldn't load the resource directory.");
      } finally {
        setLoading(false);
      }
    }

    loadResources();
  }, []);

  const filteredResources = useMemo(() => {
    const query = search.trim().toLowerCase();

    return resources.filter((resource) => {
      const matchesCategory =
        category === "All" ||
        resource.category.toLowerCase() === category.toLowerCase();

      if (!query) {
        return matchesCategory;
      }

      const searchableText = [
        resource.organization_name,
        resource.category,
        resource.description,
        resource.city,
        ...resource.services,
        ...resource.languages,
      ]
        .join(" ")
        .toLowerCase();

      return matchesCategory && searchableText.includes(query);
    });
  }, [resources, search, category]);

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

          <div className="hidden items-center gap-8 text-sm text-[#59635d] md:flex">

            <a
              href="/how-it-works"
              className="transition hover:text-[#173d32]"
            >
              How it works
            </a>

            <a
              href="/resources"
              className="font-medium text-[#173d32]"
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

          <a
            href="/"
            className="rounded-full bg-[#173d32] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#235746]"
          >
            Get help
          </a>

        </div>
      </nav>

      {/* Header */}
      <section className="border-b border-[#e7ebe8] bg-white">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10">

          <a
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#477765] transition hover:text-[#173d32]"
          >
            <ArrowLeft size={16} />
            Back home
          </a>

          <div className="mt-10 max-w-3xl">

            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#477765]">
              Community resources
            </p>

            <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
              Find resources you can use.
            </h1>

            <p className="mt-5 max-w-2xl text-lg leading-8 text-[#66716b]">
              Explore organizations and programs that can help with housing,
              food, employment, healthcare, legal support, benefits, and more.
            </p>

          </div>

          {/* Search */}
          <div className="mt-10 max-w-3xl rounded-2xl border border-[#dce3de] bg-white p-2 shadow-[0_10px_35px_rgba(23,61,50,0.06)]">

            <div className="flex items-center gap-3 px-4 py-3">

              <Search
                size={20}
                className="shrink-0 text-[#7c8982]"
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search by service, organization, or need..."
                className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-[#9aa49f]"
              />

              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="text-sm text-[#7a857f] hover:text-[#173d32]"
                >
                  Clear
                </button>
              )}

            </div>
          </div>

          {/* Filters */}
          <div className="mt-5 flex flex-wrap gap-2">

            {categories.map((item) => (
              <button
                key={item}
                onClick={() => setCategory(item)}
                className={`rounded-full px-4 py-2 text-sm transition ${
                  category === item
                    ? "bg-[#173d32] text-white"
                    : "bg-[#edf3ef] text-[#477765] hover:bg-[#e1ebe4]"
                }`}
              >
                {item}
              </button>
            ))}

          </div>

        </div>
      </section>

      {/* Resource directory */}
      <section className="mx-auto max-w-7xl px-6 py-12 lg:px-10">

        <div className="mb-7 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">

          <div>
            <h2 className="text-xl font-semibold">
              {loading
                ? "Resources"
                : `${filteredResources.length} ${
                    filteredResources.length === 1
                      ? "resource"
                      : "resources"
                  }`}
            </h2>

            {!loading && (
              <p className="mt-1 text-sm text-[#7a857f]">
                Washington community resources
              </p>
            )}
          </div>

          {category !== "All" && (
            <button
              onClick={() => setCategory("All")}
              className="w-fit text-sm font-medium text-[#477765] hover:underline"
            >
              View all resources
            </button>
          )}

        </div>

        {/* Loading */}
        {loading && (
          <div className="grid gap-5 md:grid-cols-2">

            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-64 animate-pulse rounded-3xl border border-[#e4e9e5] bg-white"
              />
            ))}

          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="rounded-3xl border border-[#eadfda] bg-white p-10 text-center">

            <h2 className="text-xl font-semibold">
              Something went wrong.
            </h2>

            <p className="mt-3 text-[#66716b]">
              {error}
            </p>

            <button
              onClick={() => window.location.reload()}
              className="mt-6 rounded-xl bg-[#173d32] px-5 py-3 text-sm font-medium text-white"
            >
              Try again
            </button>

          </div>
        )}

        {/* Empty */}
        {!loading &&
          !error &&
          filteredResources.length === 0 && (
            <div className="rounded-3xl border border-[#e4e9e5] bg-white p-12 text-center">

              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#edf3ef] text-[#477765]">
                <Search size={21} />
              </div>

              <h2 className="mt-5 text-xl font-semibold">
                No resources found.
              </h2>

              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#66716b]">
                Try a different search or choose another category.
              </p>

              <button
                onClick={() => {
                  setSearch("");
                  setCategory("All");
                }}
                className="mt-6 rounded-xl bg-[#173d32] px-5 py-3 text-sm font-medium text-white"
              >
                Clear filters
              </button>

            </div>
          )}

        {/* Cards */}
        {!loading &&
          !error &&
          filteredResources.length > 0 && (
            <div className="grid gap-5 md:grid-cols-2">

              {filteredResources.map((resource) => (
                <article
                  key={resource.id}
                  className="group rounded-3xl border border-[#e1e8e3] bg-white p-6 transition duration-200 hover:-translate-y-1 hover:border-[#cbdad1] hover:shadow-[0_15px_45px_rgba(23,61,50,0.08)]"
                >

                  {/* Top */}
                  <div className="flex items-start justify-between gap-4">

                    <div className="min-w-0">

                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#477765]">
                        {resource.category}
                      </p>

                      <h3 className="mt-2 text-xl font-semibold tracking-tight">
                        {resource.organization_name}
                      </h3>

                    </div>

                    {resource.verified && (
                      <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#edf5f0] px-3 py-1.5 text-xs font-medium text-[#477765]">
                        <ShieldCheck size={14} />
                        Verified
                      </div>
                    )}

                  </div>

                  {/* Description */}
                  <p className="mt-4 text-sm leading-7 text-[#66716b]">
                    {resource.description}
                  </p>

                  {/* Location */}
                  <div className="mt-5 flex items-center gap-2 text-sm text-[#7a857f]">
                    <MapPin size={15} />
                    {resource.city === "Statewide"
                      ? "Available statewide in Washington"
                      : `${resource.city}, Washington`}
                  </div>

                  {/* Services */}
                  {resource.services?.length > 0 && (
                    <div className="mt-5 flex flex-wrap gap-2">

                      {resource.services
                        .slice(0, 6)
                        .map((service) => (
                          <span
                            key={service}
                            className="rounded-full bg-[#f1f5f2] px-3 py-1.5 text-xs text-[#5f6d65]"
                          >
                            {service}
                          </span>
                        ))}

                    </div>
                  )}

                  {/* Languages */}
                  {resource.languages?.length > 0 && (
                    <p className="mt-5 text-xs text-[#7a857f]">
                      Languages:{" "}
                      {resource.languages.join(", ")}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="mt-6 flex flex-wrap gap-3 border-t border-[#edf0ee] pt-5">

                    {resource.website && (
                      <a
                        href={resource.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-xl bg-[#173d32] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#235746]"
                      >
                        Visit resource
                        <ExternalLink size={14} />
                      </a>
                    )}

                    {resource.phone && (
                      <a
                        href={`tel:${resource.phone}`}
                        className="rounded-xl border border-[#dce5df] px-4 py-2.5 text-sm font-medium text-[#477765] transition hover:border-[#477765]"
                      >
                        {resource.phone}
                      </a>
                    )}

                  </div>

                </article>
              ))}

            </div>
          )}

      </section>

      {/* Bottom CTA */}
      <section className="border-t border-[#e7ebe8] bg-[#f1f5f2]">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10">

          <div className="flex flex-col justify-between gap-7 sm:flex-row sm:items-center">

            <div className="max-w-2xl">

              <p className="text-2xl font-semibold tracking-tight">
                Not sure what you need?
              </p>

              <p className="mt-2 leading-7 text-[#66716b]">
                You don't have to search through the directory yourself.
                Tell LODESTAR what's happening and we'll help you find a
                starting point.
              </p>

            </div>

            <a
              href="/"
              className="flex w-fit shrink-0 items-center gap-2 rounded-xl bg-[#173d32] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#235746]"
            >
              Get personalized help
              <ArrowRight size={16} />
            </a>

          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#173d32] text-white">

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