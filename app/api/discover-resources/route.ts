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

const allowedCategories = [
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

async function fetchPage(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "LODESTAR-Resource-Research/1.0",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const html = await response.text();

  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();

  return text.slice(0, 45000);
}

async function extractWithGroq(
  text: string,
  sourceUrl: string
): Promise<DiscoveredResource[]> {
  const prompt = `
You are LODESTAR's civic resource extraction system.

Extract ONLY real Washington State community resources
explicitly contained in the source.

Do not invent facts.

SOURCE URL:
${sourceUrl}

RULES:

- Only include organizations or programs explicitly mentioned.
- Do not invent organizations.
- Do not invent websites.
- Do not invent phone numbers.
- Do not invent services.
- If a field is unavailable, use "" or null.
- Only include resources located in or serving Washington State.
- Ignore advertisements and unrelated businesses.
- Remove duplicate listings within this source.
- A government program counts as a resource.
- A nonprofit organization counts as a resource.
- A healthcare provider counts as a resource.
- A food bank or food program counts as a resource.
- A housing or homelessness program counts as a resource.

Allowed categories:

${allowedCategories.join(", ")}

Return ONLY JSON:

{
  "resources": [
    {
      "organization_name": "",
      "category": "",
      "description": "",
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

SOURCE CONTENT:

${text}
`;

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      temperature: 0,
      response_format: {
        type: "json_object",
      },
      messages: [
        {
          role: "system",
          content:
            "Extract factual civic resources. Never fabricate information.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Groq error:", error);
    throw new Error("Groq extraction failed.");
  }

  const data = await response.json();

  const content =
    data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("Groq returned no content.");
  }

  const parsed = JSON.parse(content);

  return Array.isArray(parsed.resources)
    ? parsed.resources
    : [];
}

function normalizeName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function validateResource(
  resource: DiscoveredResource
) {
  return (
    Boolean(resource.organization_name) &&
    allowedCategories.includes(resource.category) &&
    resource.state === "WA"
  );
}

export async function POST(request: Request) {
  try {
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        {
          error: "GROQ_API_KEY is missing.",
        },
        { status: 500 }
      );
    }

    const body = await request.json();

    const urls: string[] = Array.isArray(body.urls)
      ? body.urls
      : [];

    if (urls.length === 0) {
      return NextResponse.json(
        {
          error: "Provide at least one source URL.",
        },
        { status: 400 }
      );
    }

    if (urls.length > 10) {
      return NextResponse.json(
        {
          error:
            "You can process up to 10 sources at a time.",
        },
        { status: 400 }
      );
    }

    const cleanUrls = urls
      .map((url) => url.trim())
      .filter(Boolean);

    const discovered: DiscoveredResource[] = [];

    const sourceResults = [];

    for (const url of cleanUrls) {
      try {
        const parsedUrl = new URL(url);

        if (
          !["http:", "https:"].includes(
            parsedUrl.protocol
          )
        ) {
          throw new Error("Invalid protocol");
        }

        const text = await fetchPage(
          parsedUrl.toString()
        );

        if (text.length < 100) {
          throw new Error(
            "Page contained insufficient text"
          );
        }

        const resources = await extractWithGroq(
          text,
          parsedUrl.toString()
        );

        discovered.push(...resources);

        sourceResults.push({
          url,
          success: true,
          discovered: resources.length,
        });
      } catch (error) {
        console.error(
          `Failed source ${url}:`,
          error
        );

        sourceResults.push({
          url,
          success: false,
          discovered: 0,
        });
      }
    }

    const validResources =
      discovered.filter(validateResource);

    /*
     * Deduplicate resources discovered across
     * multiple sources.
     */
    const uniqueResources =
      Array.from(
        new Map(
          validResources.map((resource) => [
            normalizeName(
              resource.organization_name
            ),
            resource,
          ])
        ).values()
      );

    /*
     * Look up existing database resources.
     */
    const { data: existing, error: lookupError } =
      await supabase
        .from("resources")
        .select("organization_name");

    if (lookupError) {
      console.error(
        "Supabase lookup error:",
        lookupError
      );

      return NextResponse.json(
        {
          error:
            "Unable to check existing resources.",
        },
        { status: 500 }
      );
    }

    const existingNames = new Set(
      (existing || []).map((resource) =>
        normalizeName(
          resource.organization_name
        )
      )
    );

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
     * Insert only genuinely new resources.
     */
    let insertedResources: DiscoveredResource[] =
      [];

    if (newResources.length > 0) {
      const records = newResources.map(
        (resource, index) => ({
          id: `ai-wa-${Date.now()}-${index}`,
          organization_name:
            resource.organization_name,
          category: resource.category,
          description:
            resource.description,
          state: "WA",
          city: resource.city,
          website: resource.website,
          phone: resource.phone,
          services: resource.services || [],
          languages:
            resource.languages || [],
          verified: false,
          last_verified: null,
        })
      );

      const { data, error } =
        await supabase
          .from("resources")
          .insert(records)
          .select("*");

      if (error) {
        console.error(
          "Supabase insert error:",
          error
        );

        return NextResponse.json(
          {
            error:
              "Resources were discovered but could not be saved.",
          },
          { status: 500 }
        );
      }

      insertedResources = data || [];
    }

    return NextResponse.json({
      success: true,

      stats: {
        sourcesScanned: cleanUrls.length,
        sourcesSuccessful:
          sourceResults.filter(
            (source) => source.success
          ).length,
        resourcesDiscovered:
          validResources.length,
        uniqueResources:
          uniqueResources.length,
        newResources:
          newResources.length,
        duplicatesSkipped:
          uniqueResources.length -
          newResources.length,
      },

      sources: sourceResults,

      resources: insertedResources,
    });
  } catch (error) {
    console.error(
      "Batch discovery error:",
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