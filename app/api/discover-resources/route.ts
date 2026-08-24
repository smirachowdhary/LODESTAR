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
 */
async function readSource(url: string) {
  const readerUrl = `https://r.jina.ai/${url}`;

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

  /*
   * IMPORTANT:
   *
   * Groq currently has an 8,000 TPM limit for this
   * model on the current service tier.
   *
   * We intentionally keep the source small enough
   * that the prompt + source + model output stay
   * under that limit.
   */
  return text.slice(0, 16000);
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
Extract Washington State civic resources from the source below.

RULES:
- Only use organizations explicitly mentioned in the source.
- Never invent organizations, websites, phone numbers, or services.
- Only include resources that serve Washington State.
- Ignore navigation, advertisements, and unrelated content.
- Return at most 20 resources.
- Keep descriptions short.
- If a field is unknown, use an empty string.
- Return ONLY a JSON object. No markdown. No explanation.

Allowed categories:
Housing, Food, Employment, Healthcare, Legal, Benefits,
Family Services, Community Services, Education, Transportation, Disability.

Return exactly this structure:

{
  "resources": [
    {
      "organization_name": "name",
      "category": "Housing",
      "description": "short description",
      "state": "WA",
      "city": "",
      "website": "",
      "phone": null,
      "services": [],
      "languages": [],
      "verified": false
    }
  ]
}

SOURCE URL:
${sourceUrl}

SOURCE:
${sourceText}
`;

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "openai/gpt-oss-20b",
      temperature: 0,
      max_completion_tokens: 2500,
      messages: [
        {
          role: "system",
          content:
            "You extract factual civic resources and return valid JSON only.",
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
        500
      )}`
    );
  }

  const data = await response.json();

  const content =
    data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error(
      "Groq returned an empty response."
    );
  }

  /*
   * Remove accidental markdown fences if the model
   * adds them despite the prompt.
   */
  const cleaned = content
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let parsed: {
    resources?: DiscoveredResource[];
  };

  try {
    parsed = JSON.parse(cleaned);
  } catch {
    console.error(
      "Groq returned invalid JSON:",
      content
    );

    throw new Error(
      "Groq returned invalid JSON."
    );
  }

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
     * Process each source separately.
     *
     * This is intentional. We do NOT send multiple
     * webpages to Groq in one request.
     */
    for (const url of cleanUrls) {
      try {
        new URL(url);

        const sourceText =
          await readSource(url);

        console.log(
          `LODESTAR: Read ${url} (${sourceText.length} chars)`
        );

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
     * Deduplicate resources discovered across sources.
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
     * Check Supabase for resources already stored.
     */
    const {
      data: existing,
      error: lookupError,
    } = await supabase
      .from("resources")
      .select("organization_name");

    if (lookupError) {
      console.error(
        "Supabase lookup failed:",
        lookupError
      );

      return NextResponse.json(
        {
          error:
            "Supabase lookup failed.",
          details: lookupError.message,
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
     * Insert new resources.
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