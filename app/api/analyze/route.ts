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
  city: string | null;
  website: string | null;
  phone?: string | null;
  services: string[];
  languages: string[];
  verified: boolean;
};

type DetectedLocation = {
  city?: string;
  county?: string;
  zip?: string;
  state: string;
  label: string;
};

type RankedResource = {
  resource: Resource;
  score: number;
  matchedNeeds: string[];
  locationMatch:
    | "city"
    | "county"
    | "statewide"
    | "other-local"
    | "unknown";
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

/*
 * Washington city -> county map.
 *
 * This gives LODESTAR enough geographic context to prioritize
 * city/county resources without requiring another API.
 */
const WA_CITY_COUNTY: Record<string, string> = {
  seattle: "King County",
  bellevue: "King County",
  redmond: "King County",
  sammamish: "King County",
  kirkland: "King County",
  renton: "King County",
  kent: "King County",
  auburn: "King County",
  federalway: "King County",
  "federal way": "King County",
  issaquah: "King County",
  bothell: "King County",
  burien: "King County",
  seatac: "King County",
  tukwila: "King County",
  shoreline: "King County",
  woodinville: "King County",
  snoqualmie: "King County",
  northbend: "King County",
  "north bend": "King County",

  everett: "Snohomish County",
  lynnwood: "Snohomish County",
  edmonds: "Snohomish County",
  mukilteo: "Snohomish County",
  millcreek: "Snohomish County",
  "mill creek": "Snohomish County",
  monroe: "Snohomish County",
  marysville: "Snohomish County",
  arlington: "Snohomish County",

  tacoma: "Pierce County",
  puyallup: "Pierce County",
  lakewood: "Pierce County",
  sumner: "Pierce County",
  "gig harbor": "Pierce County",

  olympia: "Thurston County",
  lacey: "Thurston County",
  tumwater: "Thurston County",

  vancouver: "Clark County",
  camas: "Clark County",
  washaugal: "Clark County",

  spokane: "Spokane County",
  cheney: "Spokane County",

  yakima: "Yakima County",
  ellensburg: "Kittitas County",
  wenatchee: "Chelan County",
  leavenworth: "Chelan County",
  bellingham: "Whatcom County",
  mountvernon: "Skagit County",
  "mount vernon": "Skagit County",
  anacortes: "Skagit County",
  bremerton: "Kitsap County",
  poulsbo: "Kitsap County",
  silverdale: "Kitsap County",
  richland: "Benton County",
  kennewick: "Benton County",
  pasco: "Franklin County",
  wallawalla: "Walla Walla County",
  "walla walla": "Walla Walla County",
};

/*
 * Common Washington ZIPs used only to improve location detection.
 * The system still works when a ZIP is not in this map.
 */
const WA_ZIP_CITY: Record<string, string> = {
  "98004": "Bellevue",
  "98005": "Bellevue",
  "98006": "Bellevue",
  "98007": "Bellevue",
  "98008": "Bellevue",
  "98027": "Issaquah",
  "98029": "Issaquah",
  "98033": "Kirkland",
  "98034": "Kirkland",
  "98039": "Medina",
  "98040": "Mercer Island",
  "98052": "Redmond",
  "98053": "Redmond",
  "98072": "Woodinville",
  "98074": "Sammamish",
  "98075": "Sammamish",
  "98011": "Bothell",
  "98012": "Bothell",
  "98101": "Seattle",
  "98102": "Seattle",
  "98103": "Seattle",
  "98104": "Seattle",
  "98105": "Seattle",
  "98106": "Seattle",
  "98107": "Seattle",
  "98108": "Seattle",
  "98109": "Seattle",
  "98115": "Seattle",
  "98118": "Seattle",
  "98122": "Seattle",
  "98125": "Seattle",
  "98133": "Seattle",
  "98144": "Seattle",
  "98146": "Seattle",
  "98155": "Seattle",
  "98177": "Seattle",
  "98201": "Everett",
  "98203": "Everett",
  "98204": "Everett",
  "98402": "Tacoma",
  "98405": "Tacoma",
  "98409": "Tacoma",
  "98501": "Olympia",
  "98660": "Vancouver",
  "98661": "Vancouver",
  "98662": "Vancouver",
  "99201": "Spokane",
  "99202": "Spokane",
  "99205": "Spokane",
};

function normalize(value?: string | null) {
  return (value || "")
    .toLowerCase()
    .replace(/[.,]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function titleCase(value: string) {
  return value
    .split(" ")
    .map((part) =>
      part
        ? part.charAt(0).toUpperCase() +
          part.slice(1).toLowerCase()
        : part
    )
    .join(" ");
}

function detectLocation(
  message: string,
  explicitCity?: string,
  state = "WA"
): DetectedLocation {
  const text = normalize(message);

  let city = explicitCity?.trim() || undefined;
  let zip: string | undefined;

  const zipMatch = message.match(/\b(98|99)\d{3}\b/);

  if (zipMatch) {
    zip = zipMatch[0];

    if (!city && WA_ZIP_CITY[zip]) {
      city = WA_ZIP_CITY[zip];
    }
  }

  if (!city) {
    const knownCities = Object.keys(WA_CITY_COUNTY).sort(
      (a, b) => b.length - a.length
    );

    const matchedCity = knownCities.find((candidate) => {
      const escaped = candidate.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      return new RegExp(
        `(^|\\b)${escaped}(\\b|$)`,
        "i"
      ).test(text);
    });

    if (matchedCity) {
      city = titleCase(matchedCity);
    }
  }

  const normalizedCity = normalize(city);
  const county =
    WA_CITY_COUNTY[normalizedCity] ||
    undefined;

  let label = state;

  if (city && county) {
    label = `${city}, ${county}`;
  } else if (city) {
    label = `${city}, ${state}`;
  } else if (zip) {
    label = `${zip}, ${state}`;
  }

  return {
    city,
    county,
    zip,
    state,
    label,
  };
}

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

  for (const [category, keywords] of Object.entries(
    categories
  )) {
    if (
      keywords.some((keyword) =>
        text.includes(keyword)
      )
    ) {
      needs.push(category);
    }
  }

  return needs.length > 0
    ? needs
    : ["community services"];
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

  if (
    urgentTerms.some((term) => text.includes(term))
  ) {
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

  if (
    moderateTerms.some((term) =>
      text.includes(term)
    )
  ) {
    return "medium";
  }

  return "normal";
}

function determineLocationMatch(
  resource: Resource,
  location: DetectedLocation
): RankedResource["locationMatch"] {
  const resourceCity = normalize(resource.city);

  const resourceText = normalize(
    [
      resource.organization_name,
      resource.description,
      resource.city,
      ...(resource.services || []),
    ].join(" ")
  );

  if (
    location.city &&
    resourceCity &&
    resourceCity !== "statewide"
  ) {
    const targetCity = normalize(location.city);

    if (
      resourceCity === targetCity ||
      resourceCity.includes(targetCity) ||
      targetCity.includes(resourceCity)
    ) {
      return "city";
    }
  }

  if (location.county) {
    const county = normalize(location.county);

    if (resourceText.includes(county)) {
      return "county";
    }
  }

  if (
    resourceCity === "statewide" ||
    resourceCity === "washington" ||
    resourceCity === "wa" ||
    !resourceCity
  ) {
    return "statewide";
  }

  if (resourceCity) {
    return "other-local";
  }

  return "unknown";
}

function calculateResourceScore(
  resource: Resource,
  needs: string[],
  location: DetectedLocation
): RankedResource {
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
    const needWords = need
      .toLowerCase()
      .split(" ")
      .filter((word) => word.length > 2);

    const matched = needWords.some((word) =>
      resourceText.includes(word)
    );

    if (matched) {
      matchedNeeds.push(need);
      score += 35;
    }
  }

  const locationMatch =
    determineLocationMatch(resource, location);

  if (locationMatch === "city") {
    score += 55;
  } else if (locationMatch === "county") {
    score += 40;
  } else if (locationMatch === "statewide") {
    score += 20;
  } else if (locationMatch === "other-local") {
    score -= location.city ? 20 : 0;
  }

  if (resource.verified) {
    score += 18;
  }

  if (resource.website) {
    score += 3;
  }

  return {
    resource,
    score,
    matchedNeeds,
    locationMatch,
  };
}

function rankResources(
  resources: Resource[],
  needs: string[],
  location: DetectedLocation
) {
  const ranked = resources
    .map((resource) =>
      calculateResourceScore(
        resource,
        needs,
        location
      )
    )
    .filter(
      (result) =>
        result.matchedNeeds.length > 0
    )
    .sort((a, b) => b.score - a.score);

  /*
   * When we know the user's city, prefer:
   * 1. Exact city
   * 2. County
   * 3. Statewide
   *
   * Other local resources are only used as a fallback so
   * someone in Bellevue does not get a Spokane-only service
   * ahead of a statewide option.
   */
  if (location.city) {
    const preferred = ranked.filter(
      (result) =>
        result.locationMatch === "city" ||
        result.locationMatch === "county" ||
        result.locationMatch === "statewide"
    );

    if (preferred.length >= 4) {
      return preferred.slice(0, 8);
    }

    const fallback = ranked.filter(
      (result) =>
        result.locationMatch === "other-local" ||
        result.locationMatch === "unknown"
    );

    return [...preferred, ...fallback].slice(
      0,
      8
    );
  }

  return ranked.slice(0, 8);
}

function createActionPlan(
  needs: string[],
  urgency: "high" | "medium" | "normal",
  location: DetectedLocation
) {
  const plan: string[] = [];

  const localPhrase = location.city
    ? ` in ${location.city}`
    : "";

  if (urgency === "high") {
    plan.push(
      `Start with Washington 211 to identify immediate assistance${localPhrase}.`
    );
  }

  if (needs.includes("housing")) {
    plan.push(
      `Explore rental, housing, shelter, and utility assistance options${localPhrase}.`
    );
  }

  if (needs.includes("food")) {
    plan.push(
      `Find food assistance, food banks, or meal programs${localPhrase}.`
    );
  }

  if (needs.includes("employment")) {
    plan.push(
      `Connect with WorkSource Washington or another workforce program${localPhrase}.`
    );
  }

  if (needs.includes("healthcare")) {
    plan.push(
      `Look for affordable healthcare providers or health coverage programs${localPhrase}.`
    );
  }

  if (needs.includes("legal")) {
    plan.push(
      `Check whether you qualify for free or low-cost legal assistance${localPhrase}.`
    );
  }

  if (
    needs.includes("financial assistance")
  ) {
    plan.push(
      `Review Washington public benefits and financial assistance programs available${localPhrase}.`
    );
  }

  if (needs.includes("childcare")) {
    plan.push(
      `Look for childcare providers and childcare assistance programs${localPhrase}.`
    );
  }

  if (needs.includes("education")) {
    plan.push(
      `Explore education, training, scholarship, or career-development resources${localPhrase}.`
    );
  }

  if (needs.includes("transportation")) {
    plan.push(
      `Look for transportation and public transit assistance available${localPhrase}.`
    );
  }

  if (needs.includes("disability")) {
    plan.push(
      `Explore disability support and vocational rehabilitation services${localPhrase}.`
    );
  }

  if (plan.length === 0) {
    plan.push(
      `Start with Washington 211 to identify services matching your situation${localPhrase}.`
    );
  }

  return plan;
}

export async function POST(request: Request) {
  try {
    const body: AnalyzeRequest =
      await request.json();

    if (
      !body.message ||
      !body.message.trim()
    ) {
      return NextResponse.json(
        {
          error:
            "Please tell us what is happening.",
        },
        {
          status: 400,
        }
      );
    }

    const state = body.state || "WA";

    const location = detectLocation(
      body.message,
      body.city,
      state
    );

    const { data: resources, error } =
      await supabase
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

    const needs = extractNeeds(
      body.message
    );

    const urgency = determineUrgency(
      body.message
    );

    const recommendations =
      rankResources(
        (resources || []) as Resource[],
        needs,
        location
      );

    const actionPlan =
      createActionPlan(
        needs,
        urgency,
        location
      );

    return NextResponse.json({
      success: true,

      analysis: {
        needs,
        urgency,
        location: location.label,

        detectedLocation: {
          city: location.city || null,
          county: location.county || null,
          zip: location.zip || null,
          state: location.state,
        },

        summary: location.city
          ? `LODESTAR identified ${needs.join(
              ", "
            )} as areas where you may need support and prioritized resources serving ${location.city}${
              location.county
                ? ` and ${location.county}`
                : ""
            }.`
          : `LODESTAR identified ${needs.join(
              ", "
            )} as areas where you may need support.`,

        resourcesAnalyzed:
          resources?.length || 0,
      },

      recommendations,

      actionPlan,
    });
  } catch (error) {
    console.error(
      "Analyze API error:",
      error
    );

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
