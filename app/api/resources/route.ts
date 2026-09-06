import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const supabaseKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl) {
      return NextResponse.json(
        {
          error: "NEXT_PUBLIC_SUPABASE_URL is missing.",
        },
        { status: 500 }
      );
    }

    if (!supabaseKey) {
      return NextResponse.json(
        {
          error:
            "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing.",
        },
        { status: 500 }
      );
    }

    const supabase = createClient(
      supabaseUrl,
      supabaseKey
    );

    const { data, error } = await supabase
      .from("resources")
      .select("*")
      .eq("state", "WA")
      .order("organization_name", {
        ascending: true,
      });

    if (error) {
      console.error(
        "Supabase resource error:",
        error
      );

      return NextResponse.json(
        {
          error:
            "Supabase returned an error.",
          details: error.message,
          code: error.code,
          hint: error.hint,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      count: data?.length ?? 0,
      resources: data ?? [],
    });
  } catch (error) {
    console.error(
      "Resource API exception:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Supabase request failed completely.",
        details:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    );
  }
}