import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type DiscoveredResource = {
  organization_name: string;
  category: string;
  description: string;
  state: string;
  city: string;
  website: string;
  phone: string | null;
  services: string[];
  languages: string[];
  verified: boolean;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

const GROQ_API_URL =
  "https://api.groq.com/openai/v1/chat/completions";

const ALLOWED_CATEGORIES = [
  "Housing",
  "Food",
  "Employment",
  "Healthcare",
  "Legal",
  "Benefits",
  "Family Services",
  "Community Services",
  "Education",
  "Transportation",
  "Disability",
];

function normalizeName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Read a webpage through Jina Reader.
 *
 * This is much more reliable than trying to scrape
 * government websites directly from a Vercel server.
 */
async function readSource(url: string) {
  const readerUrl =
    `https://r.jina.ai/${url}`;

  const response = await fetch(readerUrl, {
    method: "GET",
    headers: {
      Accept: "text/plain",
      "User-Agent": "LODESTAR/1.0",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Reader returned HTTP ${response.status}`
    );
  }

  const text = await response.text();

  if (!text || text.trim().length < 200) {
    throw new Error(
      "Reader returned too little content."
    );
  }

  return text.slice(0, 50000);
}

/**
 * Ask Groq to extract ONLY resources actually
 * present in the source.
 */
async function extractResources(
  sourceText: string,
  sourceUrl: string
): Promise<DiscoveredResource[]> {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is missing.");
  }

  const prompt = `
You are LODESTAR's civic-resource extraction system.

Your job is to extract real community resources from
the source text below.

IMPORTANT:
Only return organizations, programs, agencies,
services, or resource providers that are explicitly
mentioned in the source.

NEVER invent organizations.
NEVER invent websites.
NEVER invent phone numbers.
NEVER invent services.

Only include resources that serve Washington State.

Source URL:
${sourceUrl}

Allowed categories:
${ALLOWED_CATEGORIES.join(", ")}

For every resource, return:

- organization_name
- category
- description
- state
- city
- website
- phone
- services
- languages
- verified

Set verified to false because LODESTAR will verify
the resource separately.

If the source contains no usable resources, return
an empty array.

Return ONLY valid JSON in exactly this format:

{
  "resources": [
    {
      "organization_name": "Example Organization",
      "category": "Housing",
      "description": "What the organization does.",
      "state": "WA",
      "city": "Seattle",
      "website": "https://example.org",
      "phone": null,
      "services": ["housing assistance"],
      "languages": ["English"],
      "verified": false
    }
  ]
}

SOURCE:

${sourceText}
`;

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization:
        `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "openai/gpt-oss-20b",
      temperature: 0,
      response_format: {
        type: "json_object",
      },
      messages: [
        {
          role: "system",
          content:
            "Extract factual Washington community resources. Never fabricate information.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Groq returned HTTP ${response.status}: ${errorText.slice(
        0,
        300
      )}`
    );
  }

  const data = await response.json();

  const content =
    data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error(
      "Groq returned no extraction."
    );
  }

  const parsed = JSON.parse(content);

  if (!Array.isArray(parsed.resources)) {
    return [];
  }

  return parsed.resources;
}

function isValidResource(
  resource: DiscoveredResource
) {
  return (
    typeof resource.organization_name ===
      "string" &&
    resource.organization_name.trim().length > 1 &&
    resource.state === "WA" &&
    ALLOWED_CATEGORIES.includes(
      resource.category
    )
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const urls: string[] = Array.isArray(body.urls)
      ? body.urls
      : [];

    if (urls.length === 0) {
      return NextResponse.json(
        {
          error:
            "Provide at least one source URL.",
        },
        { status: 400 }
      );
    }

    if (urls.length > 10) {
      return NextResponse.json(
        {
          error:
            "Maximum 10 sources per scan.",
        },
        { status: 400 }
      );
    }

    const cleanUrls = urls
      .map((url) => url.trim())
      .filter(Boolean);

    const allResources: DiscoveredResource[] =
      [];

    const sourceResults: {
      url: string;
      success: boolean;
      discovered: number;
      error?: string;
    }[] = [];

    /*
     * STEP 1:
     * Read every source through Jina.
     */
    for (const url of cleanUrls) {
      try {
        new URL(url);

        const sourceText =
          await readSource(url);

        console.log(
          `LODESTAR: Read ${url} (${sourceText.length} chars)`
        );

        /*
         * STEP 2:
         * Send the actual source content to Groq.
         */
        const extracted =
          await extractResources(
            sourceText,
            url
          );

        const valid =
          extracted.filter(
            isValidResource
          );

        allResources.push(...valid);

        sourceResults.push({
          url,
          success: true,
          discovered: valid.length,
        });

        console.log(
          `LODESTAR: ${valid.length} resources found from ${url}`
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unknown error";

        console.error(
          `LODESTAR source failed: ${url}`,
          message
        );

        sourceResults.push({
          url,
          success: false,
          discovered: 0,
          error: message,
        });
      }
    }

    /*
     * STEP 3:
     * Deduplicate resources discovered across
     * different sources.
     */
    const uniqueResources =
      Array.from(
        new Map(
          allResources.map(
            (resource) => [
              normalizeName(
                resource.organization_name
              ),
              resource,
            ]
          )
        ).values()
      );

    /*
     * STEP 4:
     * Check Supabase for resources we already have.
     */
    const { data: existing, error } =
      await supabase
        .from("resources")
        .select("organization_name");

    if (error) {
      console.error(
        "Supabase lookup failed:",
        error
      );

      return NextResponse.json(
        {
          error:
            "Supabase lookup failed.",
          details: error.message,
        },
        { status: 500 }
      );
    }

    const existingNames = new Set(
      (existing || []).map(
        (resource) =>
          normalizeName(
            resource.organization_name
          )
      )
    );

    /*
     * STEP 5:
     * Keep only genuinely new resources.
     */
    const newResources =
      uniqueResources.filter(
        (resource) =>
          !existingNames.has(
            normalizeName(
              resource.organization_name
            )
          )
      );

    /*
     * STEP 6:
     * Insert into Supabase.
     */
    let inserted: DiscoveredResource[] =
      [];

    if (newResources.length > 0) {
      const records =
        newResources.map(
          (resource, index) => ({
            id: `ai-wa-${Date.now()}-${index}`,

            organization_name:
              resource.organization_name,

            category:
              resource.category,

            description:
              resource.description,

            state: "WA",

            city:
              resource.city || "Statewide",

            website:
              resource.website || null,

            phone:
              resource.phone || null,

            services:
              resource.services || [],

            languages:
              resource.languages || [
                "English",
              ],

            verified: false,

            last_verified: null,
          })
        );

      const {
        data,
        error: insertError,
      } = await supabase
        .from("resources")
        .insert(records)
        .select("*");

      if (insertError) {
        console.error(
          "Supabase insert failed:",
          insertError
        );

        return NextResponse.json(
          {
            error:
              "Resources were discovered but could not be saved.",
            details:
              insertError.message,
          },
          { status: 500 }
        );
      }

      inserted = data || [];
    }

    /*
     * STEP 7:
     * Return everything to the admin UI.
     */
    return NextResponse.json({
      success: true,

      stats: {
        sourcesScanned:
          cleanUrls.length,

        sourcesSuccessful:
          sourceResults.filter(
            (source) => source.success
          ).length,

        resourcesDiscovered:
          allResources.length,

        uniqueResources:
          uniqueResources.length,

        newResources:
          newResources.length,

        duplicatesSkipped:
          uniqueResources.length -
          newResources.length,
      },

      sources: sourceResults,

      resources: inserted,
    });
  } catch (error) {
    console.error(
      "LODESTAR discovery error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Resource discovery failed.",
      },
      { status: 500 }
    );
  }
}