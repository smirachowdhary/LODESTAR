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
  const text = normalize(message);
  const needs: string[] = [];

  /*
   * Crisis and shelter needs must be detected before lower-priority
   * needs such as employment. Real messages are often messy, abbreviated,
   * or contain spelling mistakes, so these patterns intentionally include
   * common ways people describe the situation instead of relying on one
   * exact keyword.
   */
  const emergencyPattern =
    /\b(assault|assaulted|asault|asaulted|asalt|asalted|attacked|attack|robbed|robbery|stolen|theft|stuff (was )?taken|belongings (were )?taken|violence|violent|unsafe|in danger|emergency|crisis)\b/i;

  const shelterPattern =
    /\b(nowhere to (stay|sleep)|no where to (stay|sleep)|no ware to (stay|sleep)|no place to (stay|sleep)|need (a )?(place|somewhere) to stay|homeless|homelessness|shelter|sleeping outside|sleep outside|stranded)\b/i;

  if (emergencyPattern.test(text)) {
    needs.push("emergency services");
  }

  if (shelterPattern.test(text)) {
    needs.push("shelter");
  }

  const categories: Record<string, string[]> = {
    housing: [
      "rent",
      "rental",
      "eviction",
      "evicted",
      "apartment",
      "house",
      "housing",
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

  for (const [category, keywords] of Object.entries(categories)) {
    if (
      !needs.includes(category) &&
      keywords.some((keyword) => text.includes(keyword))
    ) {
      needs.push(category);
    }
  }

  return needs.length > 0 ? needs : ["community services"];
}

function determineUrgency(
  message: string
): "high" | "medium" | "normal" {
  const text = normalize(message);

  const urgentPattern =
    /\b(tonight|today|evicted|homeless|nowhere to (stay|sleep)|no where to (stay|sleep)|no ware to (stay|sleep)|no place to (stay|sleep)|assault|assaulted|asault|asaulted|asalt|asalted|attacked|robbed|stolen|theft|unsafe|in danger|emergency|urgent|immediately|right now|crisis)\b/i;

  if (urgentPattern.test(text)) {
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

function createFollowUpQuestions(
  message: string,
  needs: string[],
  location: DetectedLocation
) {
  const text = normalize(message);
  const questions: string[] = [];

  const crisisRelated =
    needs.includes("emergency services") ||
    needs.includes("shelter");

  if (
    needs.includes("emergency services") &&
    /\b(assault|assaulted|asault|asaulted|asalt|asalted|attacked|robbed|stolen|theft|unsafe|in danger)\b/i.test(
      text
    )
  ) {
    questions.push(
      "Are you in immediate danger or do you need urgent medical help right now?"
    );
  }

  if (crisisRelated && !location.city && !location.zip) {
    questions.push(
      "What city or ZIP code are you in right now? Emergency and shelter services are usually local."
    );
  }

  if (needs.includes("shelter")) {
    const shelterTypeAlreadyKnown =
      /\b(man|men|woman|women|family|families|parent|parents|child|children|youth|teen|minor)\b/i.test(
        text
      );

    if (!shelterTypeAlreadyKnown) {
      questions.push(
        "What type of shelter should I look for: men, women, families, youth, or another group?"
      );
    }

    if (/\b(dog|cat|pet|pets|animal)\b/i.test(text)) {
      questions.push(
        "Do you need a shelter that can accommodate your pet or help arrange temporary pet care?"
      );
    }
  }

  return questions;
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
    resourceCity === "wa"
  ) {
    return "statewide";
  }

  if (!resourceCity) {
    return "unknown";
  }

  return "other-local";
}

type UserContext = {
  veteran: boolean;
  senior: boolean;
  youth: boolean;
  disability: boolean;
  family: boolean;
};

function detectUserContext(message: string): UserContext {
  const text = message.toLowerCase();

  return {
    veteran:
      /\b(veteran|military|armed forces|served in the military|service member|servicemember)\b/.test(
        text
      ),
    senior:
      /\b(senior|elderly|older adult|retired|retiree|age 60|age 65|over 60|over 65)\b/.test(
        text
      ),
    youth:
      /\b(teen|teenager|youth|minor|high school|under 18|child)\b/.test(
        text
      ),
    disability:
      /\b(disability|disabled|developmental disability|dvr|vocational rehabilitation|accessible)\b/.test(
        text
      ),
    family:
      /\b(family|families|parent|parents|child|children|kid|kids|baby|babies|pregnant|childcare|daycare)\b/.test(
        text
      ),
  };
}

function specializedAudiencePenalty(
  resource: Resource,
  context: UserContext
) {
  const text = [
    resource.organization_name,
    resource.category,
    resource.description,
    ...(resource.services || []),
  ]
    .join(" ")
    .toLowerCase();

  let penalty = 0;

  // Strong eligibility restrictions: keep these out unless the user
  // actually indicates that they belong to the audience.
  if (
    /\b(veteran|veterans|military|service member|servicemember)\b/.test(text) &&
    !context.veteran
  ) {
    penalty -= 120;
  }

  if (
    /\b(senior|seniors|elderly|older adults?|age 60\+|age 65\+)\b/.test(text) &&
    !context.senior
  ) {
    penalty -= 90;
  }

  if (
    /\b(disability|disabled|developmental disabilities|vocational rehabilitation)\b/.test(
      text
    ) &&
    !context.disability
  ) {
    penalty -= 80;
  }

  // Youth/family programs are less restrictive because many general
  // assistance programs mention children or families in their descriptions.
  if (
    /\b(youth-only|youth program|teen program|for teens|for minors)\b/.test(text) &&
    !context.youth
  ) {
    penalty -= 80;
  }

  return penalty;
}

function specializedAudienceBoost(
  resource: Resource,
  context: UserContext
) {
  const text = [
    resource.organization_name,
    resource.category,
    resource.description,
    ...(resource.services || []),
  ]
    .join(" ")
    .toLowerCase();

  let boost = 0;

  if (
    context.senior &&
    /\b(senior|seniors|elderly|older adults?|age 60\+|age 65\+)\b/.test(text)
  ) {
    boost += 55;
  }

  if (
    context.veteran &&
    /\b(veteran|veterans|military|service member|servicemember)\b/.test(text)
  ) {
    boost += 55;
  }

  if (
    context.disability &&
    /\b(disability|disabled|developmental disabilities|vocational rehabilitation)\b/.test(text)
  ) {
    boost += 45;
  }

  if (
    context.youth &&
    /\b(youth|teen|teens|minor|minors|young people)\b/.test(text)
  ) {
    boost += 35;
  }

  if (
    context.family &&
    /\b(family|families|parent|parents|children|childcare|daycare|wic)\b/.test(text)
  ) {
    boost += 25;
  }

  return boost;
}

function canonicalOrganizationName(name: string) {
  return normalize(name)
    .replace(/\b(online resource directory|resource directory)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function dedupeRankedResources(items: RankedResource[]) {
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();

  return items.filter((item) => {
    if (seenIds.has(item.resource.id)) return false;

    let key = canonicalOrganizationName(item.resource.organization_name);

    // Treat Washington 211 and its online directory as the same service.
    if (/\bwashington\s*211\b/.test(key)) {
      key = "washington 211";
    }

    if (key && seenNames.has(key)) return false;

    seenIds.add(item.resource.id);
    if (key) seenNames.add(key);
    return true;
  });
}

function calculateResourceScore(
  resource: Resource,
  needs: string[],
  location: DetectedLocation,
  context: UserContext
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
    let matched = false;

    if (need === "emergency services") {
      matched =
        /\b(emergency|crisis|police|law enforcement|victim|assault|violence|911|safety)\b/i.test(
          resourceText
        ) ||
        /\bwashington\s*211\b/i.test(resourceText);
    } else if (need === "shelter") {
      matched =
        /\b(shelter|homeless|temporary housing|emergency housing|transitional housing|overnight)\b/i.test(
          resourceText
        ) ||
        /\bwashington\s*211\b/i.test(resourceText);
    } else {
      const needWords = need
        .toLowerCase()
        .split(" ")
        .filter((word) => word.length > 2);

      matched = needWords.some((word) =>
        resourceText.includes(word)
      );
    }

    if (matched) {
      matchedNeeds.push(need);

      if (need === "emergency services") {
        score += 90;
      } else if (need === "shelter") {
        score += 75;
      } else if (need === "housing") {
        score += 45;
      } else {
        score += 35;
      }
    }
  }

  const locationMatch =
    determineLocationMatch(resource, location);

  if (locationMatch === "city") {
    score += 90;
  } else if (locationMatch === "county") {
    score += 65;
  } else if (locationMatch === "statewide") {
    score += 25;
  } else if (locationMatch === "other-local") {
    score -= location.city ? 45 : 0;
  }

  if (resource.verified) {
    score += 18;
  }

  if (resource.website) {
    score += 3;
  }

  score += specializedAudiencePenalty(
    resource,
    context
  );

  score += specializedAudienceBoost(
    resource,
    context
  );

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
  location: DetectedLocation,
  context: UserContext
) {
  const ranked = resources
    .map((resource) =>
      calculateResourceScore(
        resource,
        needs,
        location,
        context
      )
    )
    .filter(
      (result) =>
        result.matchedNeeds.length > 0 &&
        result.score > -20
    )
    .sort((a, b) => {
      const priority = (result: RankedResource) => {
        if (result.matchedNeeds.includes("emergency services")) return 3;
        if (result.matchedNeeds.includes("shelter")) return 2;
        return 1;
      };

      const priorityDifference = priority(b) - priority(a);

      if (priorityDifference !== 0) {
        return priorityDifference;
      }

      return b.score - a.score;
    });

  const deduped = dedupeRankedResources(ranked);

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
    const preferred = deduped.filter(
      (result) =>
        result.locationMatch === "city" ||
        result.locationMatch === "county" ||
        result.locationMatch === "statewide"
    );

    if (preferred.length >= 4) {
      return preferred.slice(0, 8);
    }

    const fallback = deduped.filter(
      (result) =>
        result.locationMatch === "other-local" ||
        result.locationMatch === "unknown"
    );

    return [...preferred, ...fallback].slice(
      0,
      8
    );
  }

  return deduped.slice(0, 8);
}

function createActionPlan(
  needs: string[],
  urgency: "high" | "medium" | "normal",
  location: DetectedLocation,
  message: string
) {
  const plan: string[] = [];

  const localPhrase = location.city
    ? ` in ${location.city}`
    : "";

  const text = normalize(message);

  if (needs.includes("emergency services")) {
    plan.push(
      "If you are in immediate danger or need urgent medical help, call 911."
    );

    if (
      /\b(assault|assaulted|asault|asaulted|asalt|asalted|attacked|robbed|stolen|theft)\b/i.test(
        text
      )
    ) {
      plan.push(
        `Contact local law enforcement or a victim-support service${localPhrase} for help reporting the assault or theft and identifying immediate safety resources.`
      );
    }
  } else if (urgency === "high") {
    plan.push(
      `Start with Washington 211 to identify immediate assistance${localPhrase}.`
    );
  }

  if (needs.includes("shelter")) {
    plan.push(
      `Find an emergency shelter${localPhrase} that matches your household and accessibility needs${
        /\b(dog|cat|pet|pets|animal)\b/i.test(text)
          ? " and can accommodate your pet or help arrange temporary pet care"
          : ""
      }.`
    );
  }

  if (needs.includes("housing")) {
    plan.push(
      `Explore rental, housing, and utility assistance options${localPhrase}.`
    );
  }

  if (needs.includes("food")) {
    plan.push(
      `Find food assistance, food banks, or meal programs${localPhrase}.`
    );
  }

  if (needs.includes("employment")) {
    plan.push(
      `After immediate safety and shelter needs are addressed, connect with WorkSource Washington or another workforce program${localPhrase}.`
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

  if (needs.includes("financial assistance")) {
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

    const userContext = detectUserContext(
      body.message
    );

    const recommendations =
      rankResources(
        (resources || []) as Resource[],
        needs,
        location,
        userContext
      );

    const followUpQuestions =
      createFollowUpQuestions(
        body.message,
        needs,
        location
      );

    const actionPlan =
      createActionPlan(
        needs,
        urgency,
        location,
        body.message
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

        locationSpecific: Boolean(location.city || location.zip),
        locationPrompt:
          location.city || location.zip
            ? null
            : "Add your city or ZIP code for more local recommendations.",

        followUpQuestions,

        summary: location.city
          ? `LODESTAR identified ${needs.join(
              ", "
            )} as areas where you may need support. The list is ordered by urgency, with immediate safety and shelter needs first. Resources serving ${location.city}${
              location.county
                ? ` and ${location.county}`
                : ""
            } are prioritized when available.`
          : `LODESTAR identified ${needs.join(
              ", "
            )} as areas where you may need support. The list is ordered by urgency, with immediate safety and shelter needs first.`,

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
