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
   * Keep the request below the current free-tier
   * token limit while still giving the model
   * enough information to find resources.
   */
  return text.slice(0, 14000);
}

async function extractResources(
  sourceText: string,
  sourceUrl: string
): Promise<DiscoveredResource[]> {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is missing.");
  }

  const prompt = `
Extract Washington State civic resources from the source.

Only extract organizations, programs, agencies, or services
that are explicitly mentioned in the source.

Never invent information.

Only include resources that serve Washington State.

Ignore:
- navigation
- advertisements
- unrelated businesses
- page metadata
- duplicate listings

Return no more than 15 resources.

Allowed categories:
Housing, Food, Employment, Healthcare, Legal, Benefits,
Family Services, Community Services, Education, Transportation,
Disability.

SOURCE URL:
${sourceUrl}

SOURCE CONTENT:
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

      /*
       * Keep reasoning low so the model spends its
       * output budget on the actual resource extraction.
       */
      reasoning_effort: "low",

      temperature: 0,

      /*
       * Strict structured output.
       *
       * Groq guarantees the response conforms to
       * this schema for GPT-OSS 20B.
       */
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "lodestar_resources",
          strict: true,
          schema: {
            type: "object",

            properties: {
              resources: {
                type: "array",
                maxItems: 15,

                items: {
                  type: "object",

                  properties: {
                    organization_name: {
                      type: "string",
                    },

                    category: {
                      type: "string",
                      enum: ALLOWED_CATEGORIES,
                    },

                    description: {
                      type: "string",
                    },

                    state: {
                      type: "string",
                    },

                    city: {
                      type: "string",
                    },

                    website: {
                      type: "string",
                    },

                    phone: {
                      type: ["string", "null"],
                    },

                    services: {
                      type: "array",
                      items: {
                        type: "string",
                      },
                    },

                    languages: {
                      type: "array",
                      items: {
                        type: "string",
                      },
                    },

                    verified: {
                      type: "boolean",
                    },
                  },

                  required: [
                    "organization_name",
                    "category",
                    "description",
                    "state",
                    "city",
                    "website",
                    "phone",
                    "services",
                    "languages",
                    "verified",
                  ],

                  additionalProperties: false,
                },
              },
            },

            required: ["resources"],

            additionalProperties: false,
          },
        },
      },

      max_completion_tokens: 3000,

      messages: [
        {
          role: "system",
          content:
            "You are LODESTAR's factual civic resource extraction system. Extract only information explicitly present in the supplied source.",
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
      "Groq returned an empty structured response."
    );
  }

  try {
    const parsed = JSON.parse(content);

    if (!Array.isArray(parsed.resources)) {
      return [];
    }

    return parsed.resources;
  } catch (error) {
    console.error(
      "Structured Groq response could not be parsed:",
      content
    );

    throw new Error(
      "Groq returned an unreadable structured response."
    );
  }
}

function isValidResource(
  resource: DiscoveredResource
) {
  return (
    typeof resource.organization_name ===
      "string" &&
    resource.organization_name.trim().length > 1 &&
    resource.state.toUpperCase() === "WA" &&
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
     * This prevents multiple pages from being
     * combined into one oversized Groq request.
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
     * Check what already exists in Supabase.
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

    let inserted: DiscoveredResource[] =
      [];

    /*
     * Save new resources.
     */
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