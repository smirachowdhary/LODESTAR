"use client";

import { useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Database,
  ExternalLink,
  Loader2,
  Sparkles,
} from "lucide-react";

type Resource = {
  organization_name: string;
  category: string;
  description: string;
  city: string;
  website: string;
  phone: string | null;
  services: string[];
};

type Stats = {
  sourcesScanned: number;
  sourcesSuccessful: number;
  resourcesDiscovered: number;
  uniqueResources: number;
  newResources: number;
  duplicatesSkipped: number;
};

type SourceResult = {
  url: string;
  success: boolean;
  discovered: number;
  error?: string;
};

export default function ResourceDiscoveryPage() {
  const [sourceUrls, setSourceUrls] = useState("");
  const [loading, setLoading] = useState(false);
  const [resources, setResources] = useState<Resource[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [sources, setSources] = useState<SourceResult[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [rawResponse, setRawResponse] = useState("");

  async function discoverResources() {
    const urls = sourceUrls
      .split("\n")
      .map((url) => url.trim())
      .filter(Boolean);

    if (urls.length === 0) {
      setError("Enter at least one source URL.");
      return;
    }

    if (urls.length > 10) {
      setError("You can scan up to 10 sources at a time.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");
    setResources([]);
    setStats(null);
    setSources([]);
    setRawResponse("");

    try {
      const response = await fetch("/api/discover-resources", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          urls,
        }),
      });

      const responseText = await response.text();

      setRawResponse(responseText);

      let data: any;

      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(
          `The API returned invalid JSON (HTTP ${response.status}). Response: ${responseText.slice(
            0,
            1000
          )}`
        );
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.details ||
            `Resource discovery failed with HTTP ${response.status}.`
        );
      }

      setStats(data.stats || null);
      setSources(data.sources || []);
      setResources(data.resources || []);

      const failedSources = (data.sources || []).filter(
        (source: SourceResult) => !source.success
      );

      if (failedSources.length > 0) {
        setError(
          `${failedSources.length} source${
            failedSources.length === 1 ? "" : "s"
          } failed. See the source results below for the exact error.`
        );
      }

      if (data.stats?.newResources > 0) {
        setMessage(
          `${data.stats.newResources} new resources were added to the LODESTAR database.`
        );
      } else if (failedSources.length === 0) {
        setMessage(
          "The scan completed successfully, but no new resources were found."
        );
      }
    } catch (err) {
      console.error("LODESTAR discovery error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while scanning the sources."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#fafaf9] text-[#172018]">
      {/* Navigation */}
      <nav className="border-b border-[#e7ebe8] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
          <a href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#173d32] text-white">
              <Sparkles size={20} />
            </div>

            <span className="text-xl font-semibold tracking-tight">
              LODESTAR
            </span>
          </a>

          <a
            href="/resources"
            className="flex items-center gap-2 text-sm font-medium text-[#477765] transition hover:text-[#173d32]"
          >
            <ArrowLeft size={16} />
            Resources
          </a>
        </div>
      </nav>

      {/* Header */}
      <section className="border-b border-[#e7ebe8] bg-white">
        <div className="mx-auto max-w-5xl px-6 py-16 lg:px-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8f1eb] text-[#477765]">
            <Database size={23} />
          </div>

          <p className="mt-7 text-sm font-semibold uppercase tracking-[0.16em] text-[#477765]">
            Resource discovery
          </p>

          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
            Grow the LODESTAR database.
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-8 text-[#66716b]">
            Give LODESTAR trusted Washington resource directories.
            AI identifies community resources, structures their
            information, removes duplicates, and adds new resources
            to the database.
          </p>
        </div>
      </section>

      {/* Main */}
      <section className="mx-auto max-w-5xl px-6 py-12 lg:px-10">
        {/* Source input */}
        <div className="rounded-3xl border border-[#e1e8e3] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start justify-between gap-5">
            <div>
              <h2 className="text-xl font-semibold">
                Source directories
              </h2>

              <p className="mt-2 text-sm leading-6 text-[#7a857f]">
                Add one trusted source URL per line.
              </p>
            </div>

            <div className="hidden items-center gap-2 rounded-full bg-[#edf5f0] px-3 py-1.5 text-xs font-medium text-[#477765] sm:flex">
              <Sparkles size={13} />
              AI-powered
            </div>
          </div>

          <textarea
            value={sourceUrls}
            onChange={(event) =>
              setSourceUrls(event.target.value)
            }
            placeholder={`https://www.dshs.wa.gov/bha/community-resources
https://dcyf.wa.gov/services/housing-basic-needs/basic-needs-community-resource-directory`}
            className="mt-6 min-h-[190px] w-full resize-y rounded-2xl border border-[#dce5df] bg-[#fafcfb] p-5 text-sm leading-7 outline-none transition placeholder:text-[#a0aaa4] focus:border-[#477765] focus:ring-2 focus:ring-[#477765]/10"
          />

          <div className="mt-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <p className="text-xs leading-5 text-[#89938d]">
              Maximum 10 sources per scan.
            </p>

            <button
              onClick={discoverResources}
              disabled={loading || !sourceUrls.trim()}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#173d32] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#235746] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                  Scanning sources...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Scan with AI
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-6 rounded-2xl border border-[#ead8d3] bg-[#fff8f6] p-5">
            <p className="text-sm font-semibold text-[#9a5b4d]">
              Scan failed
            </p>

            <p className="mt-2 text-sm leading-6 text-[#9a5b4d]">
              {error}
            </p>
          </div>
        )}

        {/* Success */}
        {message && !error && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-[#cfe0d5] bg-[#f0f7f2] p-5">
            <CheckCircle2
              size={20}
              className="mt-0.5 shrink-0 text-[#477765]"
            />

            <p className="text-sm leading-6 text-[#477765]">
              {message}
            </p>
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Stat
              label="Sources scanned"
              value={stats.sourcesScanned}
            />

            <Stat
              label="Resources found"
              value={stats.resourcesDiscovered}
            />

            <Stat
              label="New resources"
              value={stats.newResources}
            />

            <Stat
              label="Unique resources"
              value={stats.uniqueResources}
            />

            <Stat
              label="Duplicates skipped"
              value={stats.duplicatesSkipped}
            />

            <Stat
              label="Successful sources"
              value={stats.sourcesSuccessful}
            />
          </div>
        )}

        {/* Source results */}
        {sources.length > 0 && (
          <div className="mt-10">
            <h2 className="text-xl font-semibold">
              Source results
            </h2>

            <div className="mt-4 space-y-3">
              {sources.map((source) => (
                <div
                  key={source.url}
                  className="rounded-2xl border border-[#e1e8e3] bg-white p-5"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="break-all text-sm text-[#59665f]">
                      {source.url}
                    </p>

                    <span
                      className={`shrink-0 self-start rounded-full px-3 py-1 text-xs font-medium ${
                        source.success
                          ? "bg-[#edf5f0] text-[#477765]"
                          : "bg-[#fff1ee] text-[#9a5b4d]"
                      }`}
                    >
                      {source.success
                        ? `${source.discovered} found`
                        : "Failed"}
                    </span>
                  </div>

                  {/* THIS IS THE IMPORTANT PART */}
                  {!source.success && source.error && (
                    <div className="mt-4 rounded-xl border border-[#f0d8d2] bg-[#fff8f6] p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#9a5b4d]">
                        Actual error
                      </p>

                      <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-xs leading-6 text-[#7d4a40]">
                        {source.error}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* New resources */}
        {resources.length > 0 && (
          <div className="mt-10">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#477765]">
              Added to database
            </p>

            <h2 className="mt-2 text-2xl font-semibold">
              New resources
            </h2>

            <div className="mt-5 space-y-4">
              {resources.map((resource, index) => (
                <article
                  key={`${resource.organization_name}-${index}`}
                  className="rounded-2xl border border-[#e1e8e3] bg-white p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#477765]">
                        {resource.category}
                      </p>

                      <h3 className="mt-2 text-lg font-semibold">
                        {resource.organization_name}
                      </h3>
                    </div>

                    <span className="shrink-0 rounded-full bg-[#fff5e8] px-3 py-1.5 text-xs font-medium text-[#8a6a3f]">
                      Pending verification
                    </span>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-[#66716b]">
                    {resource.description}
                  </p>

                  {resource.services?.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {resource.services.map((service) => (
                        <span
                          key={service}
                          className="rounded-full bg-[#f1f5f2] px-3 py-1.5 text-xs text-[#5f6d65]"
                        >
                          {service}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-5 flex flex-wrap gap-5 text-xs text-[#7a857f]">
                    {resource.city && (
                      <span>{resource.city}, WA</span>
                    )}

                    {resource.website && (
                      <a
                        href={resource.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:text-[#477765]"
                      >
                        Website
                        <ExternalLink size={12} />
                      </a>
                    )}

                    {resource.phone && (
                      <span>{resource.phone}</span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        {/* Raw API response */}
        {rawResponse && (
          <details className="mt-10 rounded-2xl border border-[#dfe6e1] bg-[#f7f9f7] p-5">
            <summary className="cursor-pointer text-sm font-semibold text-[#477765]">
              Developer: view raw API response
            </summary>

            <pre className="mt-4 max-h-[500px] overflow-auto whitespace-pre-wrap break-words rounded-xl bg-[#172018] p-5 font-mono text-xs leading-6 text-white">
              {rawResponse}
            </pre>
          </details>
        )}

        {/* Empty state */}
        {!loading &&
          !stats &&
          !error &&
          !message && (
            <div className="mt-10 rounded-2xl border border-dashed border-[#d7e1da] p-10 text-center">
              <Database
                size={28}
                className="mx-auto text-[#8fa198]"
              />

              <h2 className="mt-4 font-semibold">
                Ready to grow the database
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#7a857f]">
                Add trusted Washington resource directories
                above and let LODESTAR extract the organizations
                automatically.
              </p>
            </div>
          )}
      </section>
    </main>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-[#e1e8e3] bg-white p-5">
      <p className="text-2xl font-semibold text-[#173d32]">
        {value}
      </p>

      <p className="mt-1 text-xs text-[#7a857f]">
        {label}
      </p>
    </div>
  );
}