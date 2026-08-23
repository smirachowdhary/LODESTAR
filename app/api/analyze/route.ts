import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type AnalyzeRequest = {
  message: string;
  state?: string;
  city?: string;
};

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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

function extractNeeds(message: string): string[] {
  const text = message.toLowerCase();

  const categories: Record<string, string[]> = {
    housing: [
      "rent",
      "rental",
      "eviction",
      "evicted",
      "homeless",
      "homelessness",
      "apartment",
      "house",
      "housing",
      "shelter",
      "mortgage",
      "utilities",
      "utility",
    ],

    food: [
      "food",
      "hungry",
      "hunger",
      "groceries",
      "meal",
      "pantry",
      "food bank",
      "eat",
      "starving",
    ],

    employment: [
      "job",
      "unemployed",
      "employment",
      "laid off",
      "lost my job",
      "work",
      "resume",
      "career",
      "hiring",
      "workforce",
    ],

    healthcare: [
      "doctor",
      "medical",
      "health",
      "clinic",
      "hospital",
      "medicine",
      "healthcare",
      "insurance",
      "dental",
      "mental health",
    ],

    legal: [
      "lawyer",
      "legal",
      "attorney",
      "court",
      "eviction notice",
      "immigration",
      "immigrant",
      "visa",
      "rights",
    ],

    childcare: [
      "childcare",
      "daycare",
      "child care",
      "babysitting",
      "children",
    ],

    "financial assistance": [
      "money",
      "financial",
      "bills",
      "utility",
      "utilities",
      "debt",
      "cash assistance",
      "income",
      "tax",
      "taxes",
    ],

    education: [
      "school",
      "college",
      "education",
      "scholarship",
      "student",
      "training",
      "classes",
      "learning",
    ],

    transportation: [
      "bus",
      "transportation",
      "transit",
      "ride",
      "car",
      "transport",
    ],

    disability: [
      "disability",
      "disabled",
      "vocational rehabilitation",
      "dvr",
      "accessible",
    ],
  };

  const needs: string[] = [];

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some((keyword) => text.includes(keyword))) {
      needs.push(category);
    }
  }

  return needs.length > 0 ? needs : ["community services"];
}

function determineUrgency(
  message: string
): "high" | "medium" | "normal" {
  const text = message.toLowerCase();

  const urgentTerms = [
    "tonight",
    "today",
    "evicted",
    "eviction",
    "homeless",
    "no food",
    "can't eat",
    "cannot eat",
    "emergency",
    "urgent",
    "immediately",
    "now",
    "unsafe",
    "danger",
  ];

  if (urgentTerms.some((term) => text.includes(term))) {
    return "high";
  }

  const moderateTerms = [
    "soon",
    "struggling",
    "behind",
    "can't afford",
    "cannot afford",
    "need help",
    "worried",
    "having trouble",
  ];

  if (moderateTerms.some((term) => text.includes(term))) {
    return "medium";
  }

  return "normal";
}

function calculateResourceScore(
  resource: Resource,
  needs: string[],
  city?: string
) {
  const resourceText = [
    resource.organization_name,
    resource.category,
    resource.description,
    ...(resource.services || []),
  ]
    .join(" ")
    .toLowerCase();

  let score = 0;
  const matchedNeeds: string[] = [];

  for (const need of needs) {
    const needWords = need.toLowerCase().split(" ");

    const matched = needWords.some((word) =>
      resourceText.includes(word)
    );

    if (matched) {
      matchedNeeds.push(need);
      score += 30;
    }
  }

  if (
    city &&
    resource.city &&
    resource.city.toLowerCase() !== "statewide" &&
    resource.city.toLowerCase().includes(city.toLowerCase())
  ) {
    score += 20;
  }

  if (resource.city?.toLowerCase() === "statewide") {
    score += 8;
  }

  if (resource.verified) {
    score += 15;
  }

  if (resource.website) {
    score += 3;
  }

  return {
    resource,
    score,
    matchedNeeds,
  };
}

function rankResources(
  resources: Resource[],
  needs: string[],
  city?: string
) {
  return resources
    .map((resource) =>
      calculateResourceScore(resource, needs, city)
    )
    .filter((result) => result.matchedNeeds.length > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}

function createActionPlan(
  needs: string[],
  urgency: "high" | "medium" | "normal"
) {
  const plan: string[] = [];

  if (urgency === "high") {
    plan.push(
      "Start with Washington 211 to identify immediate local assistance."
    );
  }

  if (needs.includes("housing")) {
    plan.push(
      "Explore rental, housing, shelter, and utility assistance options."
    );
  }

  if (needs.includes("food")) {
    plan.push(
      "Find nearby food assistance, food banks, or meal programs."
    );
  }

  if (needs.includes("employment")) {
    plan.push(
      "Connect with WorkSource Washington or another workforce program."
    );
  }

  if (needs.includes("healthcare")) {
    plan.push(
      "Look for an affordable healthcare provider or health coverage program."
    );
  }

  if (needs.includes("legal")) {
    plan.push(
      "Check whether you qualify for free or low-cost legal assistance."
    );
  }

  if (needs.includes("financial assistance")) {
    plan.push(
      "Review Washington public benefits and financial assistance programs."
    );
  }

  if (needs.includes("childcare")) {
    plan.push(
      "Look for childcare providers and childcare assistance programs."
    );
  }

  if (needs.includes("education")) {
    plan.push(
      "Explore education, training, scholarship, or career-development resources."
    );
  }

  if (needs.includes("transportation")) {
    plan.push(
      "Look for transportation and public transit assistance available in your area."
    );
  }

  if (needs.includes("disability")) {
    plan.push(
      "Explore disability support and vocational rehabilitation services."
    );
  }

  if (plan.length === 0) {
    plan.push(
      "Start with Washington 211 to identify services matching your situation."
    );
  }

  return plan;
}

export async function POST(request: Request) {
  try {
    const body: AnalyzeRequest = await request.json();

    if (!body.message || !body.message.trim()) {
      return NextResponse.json(
        {
          error: "Please tell us what is happening.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Pull resources directly from Supabase.
     *
     * This means new resources added to the database
     * automatically become available to LODESTAR.
     */
    const state = body.state || "WA";

    const { data: resources, error } = await supabase
      .from("resources")
      .select("*")
      .eq("state", state);

    if (error) {
      console.error(
        "Supabase resource database error:",
        error
      );

      return NextResponse.json(
        {
          error:
            "Unable to access the LODESTAR resource database.",
        },
        {
          status: 500,
        }
      );
    }

    const needs = extractNeeds(body.message);

    const urgency = determineUrgency(body.message);

    const recommendations = rankResources(
      (resources || []) as Resource[],
      needs,
      body.city
    );

    const actionPlan = createActionPlan(
      needs,
      urgency
    );

    return NextResponse.json({
      success: true,

      analysis: {
        needs,
        urgency,
        location:
          body.city ||
          body.state ||
          "United States",

        summary: `LODESTAR identified ${needs.join(
          ", "
        )} as areas where you may need support.`,

        resourcesAnalyzed:
          resources?.length || 0,
      },

      recommendations,

      actionPlan,
    });
  } catch (error) {
    console.error("Analyze API error:", error);

    return NextResponse.json(
      {
        error:
          "Something went wrong while analyzing your request.",
      },
      {
        status: 500,
      }
    );
  }
}